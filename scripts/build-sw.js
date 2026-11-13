// Génère la liste des fichiers à précacher dans sw.js et change la version du cache.
// Usage : node scripts/build-sw.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const skip = new Set(['.git', '.github', 'scripts', 'node_modules', 'README.md', 'sw.js', 'package.json', 'package-lock.json', '.gitignore', '.nojekyll']);
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (skip.has(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p); else files.push(path.relative(root, p).split(path.sep).join('/'));
  }
})(root);
files.sort();
const hash = crypto.createHash('sha1');
files.forEach((f) => hash.update(f).update(fs.readFileSync(path.join(root, f))));
const version = hash.digest('hex').slice(0, 10);
let sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
sw = sw.replace(/const VERSION = '.*?';/, `const VERSION = '${version}';`);
sw = sw.replace(/\/\/ -- PRECACHE-START[\s\S]*?\/\/ -- PRECACHE-END/, `// -- PRECACHE-START\nPRECACHE.push(${files.map((f) => JSON.stringify('./' + f)).join(', ')});\n// -- PRECACHE-END`);
fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(`sw.js : version ${version}, ${files.length} fichiers précachés`);
