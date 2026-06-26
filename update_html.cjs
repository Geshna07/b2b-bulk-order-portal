const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.html') && !fullPath.includes('assistant.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('chat-widget.js')) {
        content = content.replace('</body>', '<script src="/components/chat-widget.js"></script>\n</body>');
        fs.writeFileSync(fullPath, content);
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/pages'));
console.log("Done");
