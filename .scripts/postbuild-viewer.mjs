import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'platform', 'app');
const distDir = path.join(appDir, 'dist');
const buildToolsDir = path.join(appDir, 'build-tools');

const versionPath = path.join(rootDir, 'version.txt');
const versionRaw = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8') : '';
const version = versionRaw.toString().trim().split(/\s+/)[0];

if (!version) {
  console.warn('postbuild: versione non trovata, skip 7z');
}

const webConfigSrc = path.join(buildToolsDir, 'web.config');
if (fs.existsSync(webConfigSrc) && fs.existsSync(distDir)) {
  fs.copyFileSync(webConfigSrc, path.join(distDir, 'web.config'));
}

const find7z = () => {
  const candidates = [
    '7z',
    '7za',
    'C:\\\\Program Files\\\\7-Zip\\\\7z.exe',
    'C:\\\\Program Files (x86)\\\\7-Zip\\\\7z.exe',
  ];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-h'], { stdio: 'ignore' });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
};

const updateArchive = (archivePath) => {
  const sevenZip = find7z();
  if (!sevenZip) {
    console.warn('postbuild: 7z non trovato, skip aggiornamento archivio');
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.warn('postbuild: dist mancante, skip aggiornamento archivio');
    return;
  }

  const deleteResult = spawnSync(
    sevenZip,
    ['d', archivePath, 'VisualizzatorePACS_3D\\build-viewer', '-r'],
    { stdio: 'inherit' }
  );
  if (deleteResult.status !== 0) {
    console.warn('postbuild: errore rimozione build-viewer dal 7z');
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nolex-viewer-'));
  const targetDir = path.join(tempRoot, 'VisualizzatorePACS_3D', 'build-viewer');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(distDir, targetDir, { recursive: true });

  const addResult = spawnSync(
    sevenZip,
    ['a', archivePath, path.join(tempRoot, 'VisualizzatorePACS_3D'), '-r'],
    { stdio: 'inherit' }
  );
  if (addResult.status !== 0) {
    console.warn('postbuild: errore aggiunta build-viewer al 7z');
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
};

if (fs.existsSync(buildToolsDir) && version) {
  const files = fs.readdirSync(buildToolsDir).filter(name => name.toLowerCase().endsWith('.7z'));
  if (!files.length) {
    console.warn('postbuild: nessun archivio .7z trovato in build-tools');
  } else {
    const preferred = files.find(name => name.startsWith('VisualizzatorePACS_3D_Version '));
    const archiveName = preferred || files[0];
    const currentArchivePath = path.join(buildToolsDir, archiveName);
    const desiredArchiveName = `VisualizzatorePACS_3D_Version ${version}.7z`;
    const desiredArchivePath = path.join(buildToolsDir, desiredArchiveName);

    if (currentArchivePath !== desiredArchivePath) {
      if (fs.existsSync(desiredArchivePath)) {
        fs.unlinkSync(desiredArchivePath);
      }
      fs.renameSync(currentArchivePath, desiredArchivePath);
    }

    updateArchive(desiredArchivePath);
  }
}
