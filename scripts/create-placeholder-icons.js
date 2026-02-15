const fs = require('fs');
const path = require('path');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);
const names = ['home', 'home-active', 'matches', 'matches-active', 'profile', 'profile-active'];
const imagesDir = path.join(__dirname, '..', 'images');
names.forEach(n => fs.writeFileSync(path.join(imagesDir, n + '.png'), png));
console.log('已创建 6 个占位 PNG 文件于 images/');
