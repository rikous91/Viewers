import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'platform', 'app');
const distDir = path.join(appDir, 'dist');
const buildToolsDir = path.join(appDir, 'build-tools');
const backendSrc = path.join(rootDir, 'backend.js');

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

  const deleteBackendResult = spawnSync(
    sevenZip,
    ['d', archivePath, 'VisualizzatorePACS_3D\\backend.js'],
    { stdio: 'inherit' }
  );
  if (deleteBackendResult.status !== 0) {
    console.warn('postbuild: errore rimozione backend.js dal 7z');
  }

  // Cleanup retrocompatibile: rimuove eventuale updater legacy dal 7z.
  spawnSync(sevenZip, ['d', archivePath, 'VisualizzatorePACS_3D\\.scripts\\client-self-updater.cjs'], {
    stdio: 'ignore',
  });

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nolex-viewer-'));
  const tempPackageRoot = path.join(tempRoot, 'VisualizzatorePACS_3D');
  const targetDir = path.join(tempPackageRoot, 'build-viewer');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(distDir, targetDir, { recursive: true });

  if (fs.existsSync(backendSrc)) {
    fs.copyFileSync(backendSrc, path.join(tempPackageRoot, 'backend.js'));
  } else {
    console.warn('postbuild: backend.js non trovato, skip aggiornamento backend nel 7z');
  }

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

const createBuildViewerZip = zipPath => {
  const sevenZip = find7z();
  if (!sevenZip) {
    console.warn('postbuild: 7z non trovato, skip creazione zip build-viewer');
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.warn('postbuild: dist mancante, skip creazione zip build-viewer');
    return;
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nolex-viewer-zip-'));
  const tempBuildViewer = path.join(tempRoot, 'build-viewer');
  fs.cpSync(distDir, tempBuildViewer, { recursive: true });

  const zipResult = spawnSync(sevenZip, ['a', '-tzip', zipPath, tempBuildViewer, '-r'], {
    stdio: 'inherit',
  });

  if (zipResult.status !== 0) {
    console.warn('postbuild: errore creazione zip build-viewer');
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });
};

const createClientUpdateZip = zipPath => {
  const sevenZip = find7z();
  if (!sevenZip) {
    console.warn('postbuild: 7z non trovato, skip creazione zip update client');
    return false;
  }

  if (!fs.existsSync(distDir)) {
    console.warn('postbuild: dist mancante, skip creazione zip update client');
    return false;
  }

  if (!fs.existsSync(backendSrc)) {
    console.warn('postbuild: backend.js non trovato, skip creazione zip update client');
    return false;
  }

  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nolex-client-update-'));
  const payloadRoot = path.join(tempRoot, 'client-update');

  try {
    fs.mkdirSync(payloadRoot, { recursive: true });
    fs.cpSync(distDir, path.join(payloadRoot, 'build-viewer'), { recursive: true });
    fs.copyFileSync(backendSrc, path.join(payloadRoot, 'backend.js'));

    const zipResult = spawnSync(sevenZip, ['a', '-tzip', zipPath, payloadRoot, '-r'], {
      stdio: 'inherit',
    });

    if (zipResult.status !== 0) {
      console.warn('postbuild: errore creazione zip update client');
      return false;
    }

    return true;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

const writeSha256File = (sourcePath, outputPath) => {
  if (!fs.existsSync(sourcePath)) {
    console.warn(`postbuild: file mancante, skip checksum (${sourcePath})`);
    return;
  }

  const hash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
  const fileName = path.basename(sourcePath);
  fs.writeFileSync(outputPath, `${hash}  ${fileName}\n`, 'utf8');
};

const cleanupOldBuildToolArtifacts = keepFileNames => {
  const keepSet = new Set((keepFileNames || []).filter(Boolean));

  const removablePatterns = [
    /^VisualizzatorePACS_3D_Version .*\.7z$/i,
    /^build-viewer_VisualizzatorePACS_3D_Version .*\.zip$/i,
    /^build-viewer_update_VisualizzatorePACS_3D_Version .*\.zip$/i,
    /^build-viewer_update_VisualizzatorePACS_3D_Version .*\.zip\.sha256$/i,
    /^VisualizzatorePACS_3D_Version .*\.7z\.tmp\d*$/i,
  ];

  const entries = fs.readdirSync(buildToolsDir, { withFileTypes: true });
  entries.forEach(entry => {
    if (!entry.isFile()) {
      return;
    }

    const fileName = entry.name;
    if (keepSet.has(fileName)) {
      return;
    }

    const shouldRemove = removablePatterns.some(pattern => pattern.test(fileName));
    if (!shouldRemove) {
      return;
    }

    const filePath = path.join(buildToolsDir, fileName);
    try {
      fs.rmSync(filePath, { force: true });
    } catch (err) {
      console.warn(`postbuild: impossibile eliminare ${fileName}: ${err.message}`);
    }
  });
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
    const buildViewerZipName = `build-viewer_VisualizzatorePACS_3D_Version ${version}.zip`;
    const buildViewerZipPath = path.join(buildToolsDir, buildViewerZipName);
    createBuildViewerZip(buildViewerZipPath);

    const clientUpdateZipName = `build-viewer_update_VisualizzatorePACS_3D_Version ${version}.zip`;
    const clientUpdateZipPath = path.join(buildToolsDir, clientUpdateZipName);
    const clientUpdateShaPath = `${clientUpdateZipPath}.sha256`;
    const clientUpdateZipCreated = createClientUpdateZip(clientUpdateZipPath);
    if (clientUpdateZipCreated) {
      writeSha256File(clientUpdateZipPath, clientUpdateShaPath);
    }

    const keepFiles = [desiredArchiveName, buildViewerZipName];
    if (clientUpdateZipCreated) {
      keepFiles.push(clientUpdateZipName, `${clientUpdateZipName}.sha256`);
    }
    cleanupOldBuildToolArtifacts(keepFiles);
  }
}
