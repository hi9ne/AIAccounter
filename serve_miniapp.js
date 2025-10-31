/**
 * Simple HTTP Server for testing Mini App locally
 * Запуск: node serve_miniapp.js
 * Откроется: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MINIAPP_DIR = path.join(__dirname, 'miniapp');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    let filePath = path.join(MINIAPP_DIR, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   AIAccounter Mini App Test Server            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📁 Serving files from: ${MINIAPP_DIR}`);
    console.log('');
    console.log('📋 Test Checklist:');
    console.log('  ✓ Analytics Tab - Chart.js graphs');
    console.log('  ✓ Team Tab - Workspace switching');
    console.log('  ✓ Reports Tab - PDF/Excel/CSV generation');
    console.log('  ✓ Settings Tab - Theme/Currency/Language');
    console.log('');
    console.log('🛑 Press Ctrl+C to stop');
});
