import { observable, config } from "@observablehq/notebook-kit/vite";
import { defineConfig } from "vite";
import { readFile, access, copyFile, mkdir } from "node:fs/promises";
import Handlebars from "handlebars";
import { join, dirname, resolve, relative, basename } from "node:path";
import yaml from "yaml";
import { glob } from "glob";
import { deserialize } from "@observablehq/notebook-kit";
import { JSDOM } from "jsdom";

import { metadataWarningPlugin } from "./scripts/metadata-warning-plugin.js";
import basicSsl from "@vitejs/plugin-basic-ssl";

const useHttps = process.env.HTTPS === "1";

const window = new JSDOM().window;
const parser = new window.DOMParser();

const __dirname = dirname(new URL(import.meta.url).pathname);

const TEMPLATE_PATH = join(__dirname, "lib/template.html");
const GITHUB_BASE_URL = "https://github.com/rreusser/notebooks/tree/main/src";
const META_IMAGE_BASE_URL = "https://rreusser.github.io/meta";
const NOTEBOOKS_DIR = join(__dirname, "src/notebooks");
const SRC_DIR = join(__dirname, "src");
const SITE_ORIGIN = "https://rreusser.github.io";

const PERSON_SCHEMA = {
  "@type": "Person",
  "@id": `${SITE_ORIGIN}/#person`,
  name: "Ricky Reusser",
  url: SITE_ORIGIN,
  sameAs: [
    "https://github.com/rreusser",
    "https://bsky.app/profile/rreusser.bsky.social",
    "https://mathstodon.xyz/@rreusser",
    "https://observablehq.com/@rreusser",
  ],
};

function stringifyJsonLd(obj) {
  // Escape "<" so the JSON cannot break out of <script type="application/ld+json">,
  // and also escape U+2028/U+2029 which are invalid in JS but legal in JSON.
  return JSON.stringify(obj, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}


// Tile URLs for src/notebooks/denali
const S3_BASE = "https://s3.us-east-1.amazonaws.com/tilesets.rreusser.github.io";

const tileUrls = {
  terrain: process.env.NODE_ENV === "production"
    ? `${S3_BASE}/denali-arcticdem-srtm30-v1/{z}/{x}/{y}.webp`
    : "data/tiles/denali-arcticdem-srtm30-v2/{z}/{x}/{y}.webp",
  sentinel: process.env.NODE_ENV === "production"
    ? `${S3_BASE}/denali-sentinel2-v1/{z}/{x}/{y}.webp`
    : "data/tiles/denali-sentinel2-v1/{z}/{x}/{y}.webp",
  tahoe: process.env.NODE_ENV === "production"
    ? `${S3_BASE}/tahoe-cop30-1m-v1/{z}/{x}/{y}.webp`
    : "data/tiles/tahoe-cop30-1m-v1/{z}/{x}/{y}.webp",
  tahoeSentinel: process.env.NODE_ENV === "production"
    ? `${S3_BASE}/tahoe-sentinel2-v1/{z}/{x}/{y}.webp`
    : "data/tiles/tahoe-sentinel2-v1/{z}/{x}/{y}.webp",
};

// Register Handlebars helpers for index page rendering
Handlebars.registerHelper('encodeURIComponent', (str) => encodeURIComponent(str));
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});
const notebookPaths = glob.sync(join(NOTEBOOKS_DIR, "**", "*.html"), {
  nodir: true,
  absolute: true,
  ignore: [join(NOTEBOOKS_DIR, "lib", "**")],
});

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
  const stem = basename(filename, ".html");
  const perFileMetadataPath = join(notebookDir, `${stem}.yml`);
  const directoryMetadataPath = join(notebookDir, "metadata.yml");
  const metadataPath = (await fileExists(perFileMetadataPath))
    ? perFileMetadataPath
    : directoryMetadataPath;
  try {
    metadataYAML = await readFile(metadataPath, "utf8");
  } catch (e) {}
  const meta = yaml.parse(metadataYAML) || {};

  if (meta.publishedAt) {
    const pub = new Date(meta.publishedAt);
    meta.publishedAtDate = pub.toISOString().slice(0, 10);
    meta.publishedAtNumeric = meta.publishedAtDate.replace(/-/g, "");
  }

  // Auto-detect meta image and construct URL from file existence
  delete meta.image;
  const webpPath = join(notebookDir, "meta.webp");
  const jpgPath = join(notebookDir, "meta.jpg");
  const pngPath = join(notebookDir, "meta.png");
  if (await fileExists(webpPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.webp`;
    meta.imageType = "image/webp";
  } else if (await fileExists(jpgPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.jpg`;
    meta.imageType = "image/jpeg";
  } else if (await fileExists(pngPath)) {
    meta.image = `${META_IMAGE_BASE_URL}/${notebookSlug}.png`;
    meta.imageType = "image/png";
  }

  return meta;
}

async function computeIndex() {
  const currentPaths = glob.sync(join(NOTEBOOKS_DIR, "**", "*.html"), {
    nodir: true,
    absolute: true,
    ignore: [join(NOTEBOOKS_DIR, "lib", "**")],
  });
  const notebooks = [];
  for (const path of currentPaths) {
    const relpath = relative(NOTEBOOKS_DIR, path);
    const notebook = deserialize(await readFile(path, "utf8"), { parser });
    if (relpath === "index.html") continue;
    const meta = await readMetadata(path);
    if (meta?.hideFromIndex) continue;
    notebooks.push({
      path: relpath.replace(/index\.html$/, ""),
      ...notebook,
      ...meta,
    });
  }
  notebooks.sort(
    ({ publishedAt: da }, { publishedAt: db }) =>
      Date.parse(db || 0) - Date.parse(da || 0)
  );
  return notebooks;
}

function copyStaticAssets(patterns) {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    async closeBundle() {
      for (const pattern of patterns) {
        const files = glob.sync(join(SRC_DIR, pattern), { nodir: true, absolute: true });
        for (const file of files) {
          const rel = relative(SRC_DIR, file);
          const dest = join(__dirname, 'www', rel);
          await mkdir(dirname(dest), { recursive: true });
          await copyFile(file, dest);
        }
      }
    },
  };
}


export default defineConfig(async ({ command }) => {
  const isDev = command === 'serve';

  const { debugNotebook } = isDev
    ? await import("@rreusser/mcp-observable-notebook-kit-debug").catch(() => ({}))
    : {};

  return {
    ...config(),
    plugins: [
      useHttps && basicSsl(),
      metadataWarningPlugin({ rootDir: NOTEBOOKS_DIR }),
      copyStaticAssets(['static/**/*', 'notebooks/**/*.geojson', 'notebooks/**/fonts/*.json', 'notebooks/**/fonts/*.png']),
      isDev && debugNotebook?.(),
      observable({
        template: TEMPLATE_PATH,
        transformTemplate: async function (template, { filename, path }) {
          const notebook = deserialize(await readFile(filename, "utf8"), {
            parser,
          });
          const metadata = await readMetadata(filename);
          const isRootIndex = path === "/index.html";
          const isNotebooksIndex = path === "/notebooks/index.html";
          const is404 = path === "/404.html";
          const canonicalUrl = `https://rreusser.github.io${path.replace(/index\.html$/, "")}`;
          const data = {
            sourceUrl: `${GITHUB_BASE_URL}${path}`,
            author: "Ricky Reusser",
            authorUrl: "https://rreusser.github.io",
            canonicalUrl,
            currentYear: new Date().getFullYear(),
            isRootIndex,
            ...notebook,
            ...metadata,
          };
          if (isRootIndex || isNotebooksIndex || is404) {
            delete data.sourceUrl;
            delete data.author;
          }
          let fullIndex = null;
          if (isNotebooksIndex || isRootIndex) {
            // Add notebook links
            fullIndex = (await computeIndex()).map((nb) => {
              const slug = nb.path.replace(/\/$/, '');
              const imageExt = nb.image ? nb.image.split('.').pop() : null;
              // Card images on /notebooks resolve as ./slug/meta.ext in dev
              // and /meta/slug.ext in build. The root index lives one
              // directory up, so its relative paths gain a notebooks/ prefix.
              const baseDev = isRootIndex ? `./notebooks/` : `./`;
              let imageUrl = null;
              if (imageExt) {
                imageUrl = isDev ? `${baseDev}${slug}/meta.${imageExt}` : `/meta/${slug}.${imageExt}`;
              }
              const linkPath = isRootIndex ? `/notebooks/${nb.path}` : nb.path;
              return {
                ...nb,
                path: linkPath,
                imageUrl
              };
            });
            if (isNotebooksIndex) {
              data.index = fullIndex;
            } else {
              data.recentIndex = fullIndex.slice(0, 6);
            }
          }

          // Structured data (JSON-LD)
          let jsonLdObj = null;
          if (isRootIndex) {
            jsonLdObj = {
              "@context": "https://schema.org",
              "@graph": [
                PERSON_SCHEMA,
                {
                  "@type": "WebSite",
                  "@id": `${SITE_ORIGIN}/#website`,
                  url: SITE_ORIGIN,
                  name: data.title || "Ricky Reusser",
                  description: data.description,
                  publisher: { "@id": `${SITE_ORIGIN}/#person` },
                },
              ],
            };
          } else if (isNotebooksIndex) {
            jsonLdObj = {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: data.metaTitle || data.title || "Notebooks",
              url: canonicalUrl,
              description: data.description,
              author: { "@id": `${SITE_ORIGIN}/#person` },
              mainEntity: {
                "@type": "ItemList",
                itemListElement: fullIndex.map((nb, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  url: `${SITE_ORIGIN}/notebooks/${nb.path}`,
                  name: nb.title,
                })),
              },
            };
          } else if (!is404 && data.title && data.publishedAtDate) {
            jsonLdObj = {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: data.title,
              url: canonicalUrl,
              datePublished: data.publishedAtDate,
              ...(data.description ? { description: data.description } : {}),
              ...(data.image ? { image: data.image } : {}),
              ...(data.tags?.length ? { keywords: data.tags.join(", ") } : {}),
              author: PERSON_SCHEMA,
            };
          }
          if (jsonLdObj) data.jsonLd = stringifyJsonLd(jsonLdObj);

          return Handlebars.compile(template)(data);
        },
        transformNotebook: async function (notebook, { filename }) {
          // If metaTitle is set, swap it in as notebook.title so notebook-kit's
          // <title> injection (see @observablehq/notebook-kit/dist/src/vite/observable.js)
          // prepends the SEO title rather than the visible one. The H1 still comes from
          // data.title in transformTemplate, which reads the source fresh.
          const meta = await readMetadata(filename);
          if (meta.metaTitle) notebook.title = meta.metaTitle;

          // Find the first markdown cell whose first non-empty line is an h1,
          // and remove that line. Warn if it isn't cell 0 (title buried after
          // other cells, e.g. a style cell).
          if (!notebook.cells.length) return notebook;
          const idx = notebook.cells.findIndex((cell) => {
            const first = cell.value.split("\n").find((l) => l.trim());
            return first && first.startsWith("# ");
          });
          if (idx === -1) return notebook;
          if (idx > 0) {
            console.warn(`[transformNotebook] h1 title found in cell ${idx} (not cell 0) in ${filename}`);
          }
          const lines = notebook.cells[idx].value.split("\n");
          const h1Line = lines.findIndex((l) => l.trim().startsWith("# "));
          lines.splice(h1Line, 1);
          if (lines.filter(Boolean).length) {
            notebook.cells[idx].value = lines.join("\n");
          } else {
            notebook.cells.splice(idx, 1);
          }
          return notebook;
        },
      }),
    ],
    build: {
      outDir: join(__dirname, "www"),
      emptyOutDir: true,
      rollupOptions: {
        input: [
          join(SRC_DIR, "index.html"),
          join(SRC_DIR, "404.html"),
          ...notebookPaths,
        ],
      },
    },
    root: "src",
    base: "/",
    optimizeDeps: {
      include: [],
      exclude: ['@zappar/msdf-generator'],
    },
    server: {
      host: true,
      hmr: {
        host: undefined,
      },
    },
    define: {
      __TILE_URL_TERRAIN__: JSON.stringify(tileUrls.terrain),
      __TILE_URL_SENTINEL__: JSON.stringify(tileUrls.sentinel),
      __TILE_URL_TAHOE__: JSON.stringify(tileUrls.tahoe),
      __TILE_URL_TAHOE_SENTINEL__: JSON.stringify(tileUrls.tahoeSentinel),
    },
  };
});
