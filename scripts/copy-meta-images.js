import { glob } from "glob";
import { copyFile, mkdir } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

async function copyMetaImages() {
  const srcDir = join(projectRoot, "src/notebooks");
  const metaDir = join(projectRoot, "www", "meta");

  // Find all meta image files
  const metaFiles = await glob(join(srcDir, "**", "meta.{png,jpg,webp}"), {
    nodir: true,
    absolute: true,
  });

  if (metaFiles.length === 0) {
    console.log("No meta images found to copy.");
    return;
  }

  // Ensure the meta directory exists
  await mkdir(metaDir, { recursive: true });

  // Copy each meta file
  for (const srcPath of metaFiles) {
    const dirName = basename(dirname(srcPath));
    const ext = extname(srcPath);
    const destPath = join(metaDir, `${dirName}${ext}`);

    await copyFile(srcPath, destPath);
    console.log(`Copied ${dirName}/meta${ext} → meta/${dirName}${ext}`);
  }

  console.log(`\nCopied ${metaFiles.length} meta image(s) to www/meta/`);
}

copyMetaImages().catch((err) => {
  console.error("Error copying meta images:", err);
  process.exit(1);
});
