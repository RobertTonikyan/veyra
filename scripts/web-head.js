// After `expo export --platform web`: put the iPhone home-screen settings into dist/index.html,
// so they apply from the very first frame (setting them later from JS is too late for iOS).
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const BG = '#1A1614';
const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />';

html = /<meta name="viewport"[^>]*>/.test(html)
  ? html.replace(/<meta name="viewport"[^>]*>/, viewport)
  : html.replace('</head>', `${viewport}\n</head>`);

const head = `
<meta name="theme-color" content="${BG}" />
<meta name="color-scheme" content="dark" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Veyra" />
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<style id="veyra-web">
  html, body { background: ${BG}; overscroll-behavior: none; }
  /* iPhone home-screen app: 100% stops one status bar short of the bottom; 100vh is the full screen */
  @media all and (display-mode: standalone) { html, body, #root { height: 100vh; } }
</style>
`;
if (!html.includes('id="veyra-web"')) html = html.replace('</head>', `${head}</head>`);

fs.writeFileSync(file, html);
console.log('web-head: dist/index.html updated');
