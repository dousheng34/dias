import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5177);
const host = process.env.HOST || '0.0.0.0';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf'
};

function contentType(filePath) {
  return types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function safePath(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const localPath = pathname === '/' ? '/index.html' : pathname;
  const full = path.resolve(root, `.${localPath}`);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

function demoIndex(html) {
  const banner = `
    <style>
      .demo-banner {
        position: sticky;
        top: 0;
        z-index: 2147483647;
        padding: 10px 16px;
        background: #123f3b;
        color: #fff;
        font: 600 14px/1.35 Arial, sans-serif;
        text-align: center;
      }
      .enter,
      #dialog-enter,
      .alert-notification,
      script[src*="metrika"],
      script[src*="googletagmanager"] {
        display: none !important;
      }
    </style>
  `;
  const guard = `
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('form, input, button, .login').forEach((node) => {
          node.addEventListener('click', (event) => event.preventDefault());
          node.addEventListener('submit', (event) => event.preventDefault());
          if ('disabled' in node) node.disabled = true;
        });
      });
    </script>
  `;

  const cleaned = html
    .replace(/<!-- Yandex\.Metrika counter -->[\s\S]*?<!-- \/Yandex\.Metrika counter -->/g, '')
    .replace(/<!-- Google tag \(gtag\.js\) -->[\s\S]*?gtag\('config', '395301509'\);[\s\S]*?<\/script>/g, '')
    .replace(/<script[^>]+src=["']https:\/\/www\.googletagmanager\.com[^>]*><\/script>/g, '');

  return cleaned
    .replace('</head>', `${banner}${guard}</head>`)
    .replace('<body>', '<body><div class="demo-banner">Demo copy for report viewing. Login and data submission are disabled.</div>');
}

async function serveFile(req, res, fullPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('method not allowed');
    return;
  }

  const data = await readFile(fullPath);
  const headers = {
    'content-type': contentType(fullPath),
    'cache-control': 'no-store'
  };

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  if (path.basename(fullPath) === 'index.html') {
    res.end(demoIndex(data.toString('utf8')));
    return;
  }

  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    const full = safePath(url.pathname);

    if (full && existsSync(full)) {
      await serveFile(req, res, full);
      return;
    }

    if (url.pathname.startsWith('/report/byLink/')) {
      await serveFile(req, res, path.join(root, 'index.html'));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(err.stack || String(err));
    } else {
      console.error(err);
    }
  }
});

server.listen(port, host, () => {
  console.log(`Demo report running: http://${host}:${port}/report/byLink/19527?v=1&userId=5&validationHash=7BACAF66D5862ED1298F581E62D78EFD40A014CC&c=0`);
});
