import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import yaml from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const NOTEBOOKS_DIR = join(ROOT_DIR, "src/notebooks");
const SITEMAP_PATH = join(ROOT_DIR, "www/sitemap.xml");
const ROBOTS_PATH = join(ROOT_DIR, "www/robots.txt");

const SITE_URL = "https://rreusser.github.io";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function getNotebooks() {
  const notebookPaths = glob.sync(join(NOTEBOOKS_DIR, "**", "*.html"), {
    nodir: true,
    absolute: true,
  });

  const notebooks = [
    { url: `${SITE_URL}/`, lastmod: null, priority: "1.0" },
  ];
  for (const path of notebookPaths) {
    const relpath = relative(NOTEBOOKS_DIR, path);
    const notebookDir = dirname(path);
    const notebookSlug = relative(NOTEBOOKS_DIR, notebookDir);

    let metadataYAML = "";
    try {
      metadataYAML = await readFile(join(notebookDir, "metadata.yml"), "utf8");
    } catch (e) {}
    const meta = yaml.parse(metadataYAML) || {};

    if (meta?.hideFromIndex || meta?.hideFromSearch) continue;

    const urlPath = relpath === "index.html"
      ? "/notebooks/"
      : `/notebooks/${relpath.replace(/index\.html$/, "")}`;

    notebooks.push({
      url: `${SITE_URL}${urlPath}`,
      lastmod: meta.publishedAt
        ? new Date(meta.publishedAt).toISOString().slice(0, 10)
        : null,
      priority: relpath === "index.html" ? "0.9" : "0.8",
    });
  }

  return notebooks;
}

function generateSitemap(notebooks) {
  const urls = notebooks
    .map(({ url, lastmod, priority }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
      return `  <url>
    <loc>${url}</loc>${lastmodTag}
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateRobots() {
  return `User-agent: *
Allow: /

  Sitemap: https://rreusser.github.io/sitemap.xml
`;
}

async function main() {
  const notebooks = await getNotebooks();
  const sitemap = generateSitemap(notebooks);
  await writeFile(SITEMAP_PATH, sitemap, "utf8");
  console.log(`Generated sitemap with ${notebooks.length} URLs: ${SITEMAP_PATH}`);

  const robots = generateRobots();
  await writeFile(ROBOTS_PATH, robots, "utf8");
  console.log(`Generated robots.txt: ${ROBOTS_PATH}`);
}

main().catch((err) => {
  console.error("Error generating sitemap:", err);
  process.exit(1);
});
