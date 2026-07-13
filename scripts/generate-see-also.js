// Suggest "See also" links for each notebook and write them into metadata.yml
// as a `seeAlso` list of slugs.
//
//   node scripts/generate-see-also.js              # fill in notebooks with no seeAlso
//   node scripts/generate-see-also.js --force      # regenerate every seeAlso list
//   node scripts/generate-see-also.js --dry-run    # print suggestions, write nothing
//   node scripts/generate-see-also.js --count 4    # links per notebook (default 3)
//
// Once written, the lists are just data: hand-edit them freely. Without --force
// the script never touches a notebook that already has a seeAlso list, so edits
// survive re-runs when new notebooks are added.
//
// Scoring is a cosine similarity over two IDF-weighted vectors: tags, and words
// from the title and description. Tags carry most of the signal, but IDF matters
// a lot here because `webgpu` and `math` are on a third of the notebooks and say
// almost nothing, while `astronomy` or `gallery` nearly pick out a pair on their
// own. Text similarity breaks ties between notebooks with identical tag sets.

import { readFile, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTEBOOKS_DIR = join(__dirname, "..", "src", "notebooks");

const TAG_WEIGHT = 1;
const TEXT_WEIGHT = 0.45;

// Below this, a "match" is one incidental shared word. Better to show two links
// than to pad to three with a notebook about something else entirely.
const MIN_SCORE = 0.15;

const STOP_WORDS = new Set(`a an the and or of for in on to with without into from
by as at is are it its this that these those how why what when we i my using use
used via not but if then than so such very more most some any all can does do`.split(/\s+/));

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const countIdx = args.indexOf("--count");
const COUNT = countIdx === -1 ? 3 : Number(args[countIdx + 1]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// Term frequencies, capped at 1: a word repeated in a description is not more
// meaningful than a word used once, and it would otherwise dominate the cosine.
function termSet(terms) {
  const set = new Map();
  for (const t of terms) set.set(t, 1);
  return set;
}

function idfWeights(docs) {
  const df = new Map();
  for (const doc of docs) {
    for (const term of doc.keys()) df.set(term, (df.get(term) || 0) + 1);
  }
  const idf = new Map();
  for (const [term, count] of df) {
    // Smoothed IDF, floored at 0 so a term on every notebook contributes nothing.
    idf.set(term, Math.max(0, Math.log((docs.length + 1) / (count + 1))));
  }
  return idf;
}

function cosine(a, b, idf) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, tf] of a) {
    const w = tf * (idf.get(term) || 0);
    normA += w * w;
    const bw = b.has(term) ? b.get(term) * (idf.get(term) || 0) : 0;
    dot += w * bw;
  }
  for (const [term, tf] of b) {
    const w = tf * (idf.get(term) || 0);
    normB += w * w;
  }
  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
}

async function loadNotebooks() {
  const entries = await readdir(NOTEBOOKS_DIR, { withFileTypes: true });
  const notebooks = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "lib") continue;
    const slug = entry.name;
    const metadataPath = join(NOTEBOOKS_DIR, slug, "metadata.yml");
    let source;
    try {
      source = await readFile(metadataPath, "utf8");
    } catch {
      console.warn(`skipping ${slug}: no metadata.yml`);
      continue;
    }
    let html = "";
    try {
      html = await readFile(join(NOTEBOOKS_DIR, slug, "index.html"), "utf8");
    } catch {
      console.warn(`skipping ${slug}: no index.html`);
      continue;
    }
    const doc = yaml.parseDocument(source);
    const meta = doc.toJS() || {};
    if (meta.hideFromIndex) continue;
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? slug;
    notebooks.push({
      slug,
      metadataPath,
      doc,
      meta,
      title,
      tags: (meta.tags || []).map((t) => String(t).toLowerCase()),
    });
  }
  return notebooks;
}

const notebooks = await loadNotebooks();

const tagDocs = notebooks.map((nb) => termSet(nb.tags));
const textDocs = notebooks.map((nb) => termSet(tokenize(`${nb.title} ${nb.meta.description || ""}`)));
const tagIdf = idfWeights(tagDocs);
const textIdf = idfWeights(textDocs);

let written = 0;
let skipped = 0;

for (let i = 0; i < notebooks.length; i++) {
  const nb = notebooks[i];

  if (!force && nb.meta.seeAlso) {
    skipped++;
    continue;
  }

  const scored = notebooks
    .map((other, j) => {
      if (i === j) return null;
      const score =
        TAG_WEIGHT * cosine(tagDocs[i], tagDocs[j], tagIdf) +
        TEXT_WEIGHT * cosine(textDocs[i], textDocs[j], textIdf);
      return score >= MIN_SCORE ? { slug: other.slug, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, COUNT);

  if (!scored.length) {
    console.warn(`no suggestions for ${nb.slug} (no tags or description overlap)`);
    continue;
  }

  console.log(
    `${nb.slug}\n${scored.map((s) => `  ${s.score.toFixed(3)}  ${s.slug}`).join("\n")}`
  );

  if (dryRun) continue;

  nb.doc.set("seeAlso", scored.map((s) => s.slug));
  await writeFile(nb.metadataPath, nb.doc.toString({ lineWidth: 0 }));
  written++;
}

console.log(
  `\n${dryRun ? "would write" : "wrote"} ${dryRun ? notebooks.length - skipped : written} notebook(s)` +
    (skipped ? `, skipped ${skipped} with an existing seeAlso (use --force to regenerate)` : "")
);
