const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.js');
let s = fs.readFileSync(filePath, 'utf8');

// Remove block: if (type === 'doubles' && firstSize % 2 !== 0) { ... } (3 lines)
const blockStart = "if (type === 'doubles' && firstSize % 2 !== 0) {";
let i = s.indexOf(blockStart);
while (i !== -1) {
  const lineEnd = s.indexOf('\n', i);
  const rest = s.slice(lineEnd + 1);
  const retLine = rest.indexOf("return { success: false, message: '");
  const retEnd = rest.indexOf('\n', retLine);
  const closeLine = rest.indexOf('\n', retEnd + 1);
  const toRemove = s.slice(i, lineEnd + 1 + closeLine + 1);
  s = s.slice(0, i) + s.slice(lineEnd + 1 + closeLine + 1);
  i = s.indexOf(blockStart);
}

// Fix error message (both full-width and half-width parentheses)
s = s.replace(/请确保每队人数一致，双打需为偶数[）)]/g, '请确保各队人数一致）');

fs.writeFileSync(filePath, s, 'utf8');
console.log('Fixed');
