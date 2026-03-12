import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import yaml from "yaml";
import { deserialize } from "@observablehq/notebook-kit";
import { JSDOM } from "jsdom";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const NOTEBOOKS_DIR = join(ROOT_DIR, "src");
const OUTPUT_PATH = join(ROOT_DIR, "www/feed.xml");

const SITE_URL = "https://rreusser.github.io/notebooks";
const META_IMAGE_BASE_URL = `${SITE_URL}/meta`;

const window = new JSDOM().window;
const parser = new window.DOMParser();

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readMetadata(filename) {
  const notebookDir = dirname(filename);
  const notebookSlug = relative(NOTEBOOKS_DIR, notebookDir);

  let metadataYAML = "";
  const metadataPath = join(notebookDir, "metadata.yml");
  try {
    metadataYAML = await readFile(metadataPath, "utf8");
  } catch (e) {}
  const meta = yaml.parse(metadataYAML) || {};

  // Auto-detect meta image
  const webpPath = join(notebookDir, "meta.webp");
  const jpgPath = join(notebookDir, "meta.jpg");
  const pngPath = join(notebookDir, "meta.png");
  if (await fileExists(webpPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.webp`;
  } else if (await fileExists(jpgPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.jpg`;
  } else if (await fileExists(pngPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.png`;
  }

  return meta;
}

async function getNotebooks() {
  const notebookPaths = glob.sync(join(NOTEBOOKS_DIR, "**", "*.html"), {
    nodir: true,
    absolute: true,
  });

  const notebooks = [];
  for (const path of notebookPaths) {
    const relpath = relative(NOTEBOOKS_DIR, path);
    if (relpath === "index.html") continue;

    const notebook = deserialize(await readFile(path, "utf8"), { parser });
    const meta = await readMetadata(path);

    if (meta?.hidden || meta?.silent) continue;

    notebooks.push({
      path: relpath.replace(/index\.html$/, ""),
      title: notebook.title,
      description: meta.description,
      publishedAt: meta.publishedAt,
      image: meta.image,
    });
  }

  notebooks.sort(
    ({ publishedAt: da }, { publishedAt: db }) =>
      Date.parse(db || 0) - Date.parse(da || 0)
  );

  return notebooks;
}

function escapeXml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRFC822Date(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toUTCString();
}

function generateRss(notebooks) {
  const now = new Date().toUTCString();

  const items = notebooks
    .map((notebook) => {
      const link = `${SITE_URL}/${notebook.path}`;
      const pubDate = formatRFC822Date(notebook.publishedAt);

      let imageTag = "";
      if (notebook.image) {
        imageTag = `
      <media:content url="${escapeXml(notebook.image)}" medium="image" />`;
      }

      return `
    <item>
      <title>${escapeXml(notebook.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(notebook.description)}</description>${imageTag}
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Ricky Reusser's Notebooks</title>
    <link>${SITE_URL}/</link>
    <description>Interactive notebooks on graphics, math, and creative coding</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>
`;
}

async function main() {
  const notebooks = await getNotebooks();
  const rss = generateRss(notebooks);
  await writeFile(OUTPUT_PATH, rss, "utf8");
  console.log(`Generated RSS feed with ${notebooks.length} items: ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Error generating RSS feed:", err);
  process.exit(1);
});
