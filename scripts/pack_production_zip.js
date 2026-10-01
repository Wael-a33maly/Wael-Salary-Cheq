import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const pkgDir = '/tmp/pkg_build';

// 1. Ensure /tmp/pkg_build is clean and populated
if (fs.existsSync(pkgDir)) {
  fs.rmSync(pkgDir, { recursive: true, force: true });
}
fs.mkdirSync(pkgDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Copying PHP backend and config files...');
copyRecursive(path.join(rootDir, 'php_project', 'public_html'), pkgDir);

console.log('Copying built frontend files from dist/...');
fs.copyFileSync(path.join(rootDir, 'dist', 'index.html'), path.join(pkgDir, 'index.html'));
fs.copyFileSync(path.join(rootDir, 'dist', 'index.html'), path.join(pkgDir, 'app.html'));

// Copy dist/assets
const targetAssets = path.join(pkgDir, 'assets');
if (fs.existsSync(targetAssets)) fs.rmSync(targetAssets, { recursive: true, force: true });
copyRecursive(path.join(rootDir, 'dist', 'assets'), targetAssets);

// Copy images
const bgImg = path.join(rootDir, 'public', 'cbk_cheque_bg.jpg');
if (fs.existsSync(bgImg)) fs.copyFileSync(bgImg, path.join(pkgDir, 'cbk_cheque_bg.jpg'));

const tmplImg = path.join(rootDir, 'public', 'cbk_cheque_template.jpg');
if (fs.existsSync(tmplImg)) fs.copyFileSync(tmplImg, path.join(pkgDir, 'cbk_cheque_template.jpg'));

const stampImg = path.join(rootDir, 'public', 'cbk_cheque_bg_1789993769401.jpg');
if (fs.existsSync(stampImg)) fs.copyFileSync(stampImg, path.join(pkgDir, 'cbk_cheque_bg_1789993769401.jpg'));

// 2. Build ZIP using JSZip
console.log('Creating ZIP archive with JSZip...');
const zip = new JSZip();

function addDirToZip(zipObj, dirPath, localPath = '') {
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    // Skip old zip files if any were copied
    if (item.endsWith('.zip')) continue;
    const fullPath = path.join(dirPath, item);
    const relPath = localPath ? `${localPath}/${item}` : item;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const subFolder = zipObj.folder(item);
      addDirToZip(subFolder, fullPath, relPath);
    } else {
      const data = fs.readFileSync(fullPath);
      zipObj.file(item, data);
    }
  }
}

addDirToZip(zip, pkgDir);

console.log('Compressing ZIP (DEFLATE level 9)...');
const buffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});

const outPath1 = path.join(rootDir, 'public', 'payroll_system_kwd_production.zip');
const outPath2 = path.join(rootDir, 'public', 'payroll_hostinger_production.zip');
const outPath3 = path.join(rootDir, 'php_project', 'payroll_hostinger_production.zip');

fs.writeFileSync(outPath1, buffer);
fs.writeFileSync(outPath2, buffer);
fs.writeFileSync(outPath3, buffer);

console.log(`Success! Updated ZIP files generated:`);
console.log(`  - ${outPath1} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  - ${outPath2} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  - ${outPath3} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
