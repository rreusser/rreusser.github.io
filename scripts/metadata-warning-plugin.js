import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import yaml from "yaml";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function metadataWarningPlugin({ rootDir }) {
  return {
    name: 'metadata-warning',
    apply: 'serve',
    async transformIndexHtml(html, ctx) {
      // Skip index page
      if (ctx.path === '/' || ctx.path === '/index.html') return html;

      // Determine notebook directory from request path (strip /notebooks/ base)
      const notebookDir = ctx.path
        .replace(/^\/notebooks\//, '/')
        .replace(/\/index\.html$/, '')
        .replace(/^\//, '');
      if (!notebookDir) return html;

      const metadataPath = join(rootDir, notebookDir, 'metadata.yml');
      const metaWebpPath = join(rootDir, notebookDir, 'meta.webp');
      const metaJpgPath = join(rootDir, notebookDir, 'meta.jpg');
      const metaPngPath = join(rootDir, notebookDir, 'meta.png');

      let warnings = [];
      try {
        const content = await readFile(metadataPath, 'utf8');
        const meta = yaml.parse(content) || {};
        if (!meta.description) warnings.push('missing "description" field');
      } catch (e) {
        warnings.push('metadata.yml not found');
      }

      // Check for meta image file
      const hasMetaImage = await fileExists(metaWebpPath) || await fileExists(metaJpgPath) || await fileExists(metaPngPath);
      if (!hasMetaImage) warnings.push('missing meta.webp (or meta.jpg/png)');

      if (warnings.length === 0) return html;

      const warningMessage = warnings.join(', ');
      const alertScript = `
<script>
(function() {
  const alert = document.createElement('div');
  alert.id = 'metadata-warning';
  alert.innerHTML = \`
    <style>
      #metadata-warning {
        position: fixed;
        top: 12px;
        left: 12px;
        background: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 6px;
        padding: 10px 36px 10px 12px;
        font-family: system-ui, sans-serif;
        font-size: 13px;
        color: #856404;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      #metadata-warning strong { display: block; margin-bottom: 4px; }
      #metadata-warning-close {
        position: absolute;
        top: 6px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #856404;
        line-height: 1;
      }
      #metadata-warning-close:hover { color: #533f03; }
    </style>
    <strong>⚠️ Metadata Warning</strong>
    ${warningMessage}
    <button id="metadata-warning-close" aria-label="Dismiss">×</button>
  \`;
  document.body.appendChild(alert);

  document.getElementById('metadata-warning-close').onclick = function() {
    alert.remove();
  };
})();
</script>`;

      // Inject before closing body tag
      return html.replace('</body>', alertScript + '</body>');
    }
  };
}
