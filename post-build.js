#!/usr/bin/env node
/**
 * Script que copia build/ a public_html/ despues del npm run build
 * Mantiene public/ como template de CRA y genera salida lista para subir.
 */

const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(__dirname, 'build');
const publicDir = path.resolve(__dirname, 'public');
const deployDir = path.resolve(__dirname, 'public_html');

console.log('Sincronizando build/ -> public_html/...');

// Copiar recursivo
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);

    if (fs.lstatSync(srcFile).isDirectory()) {
      copyDirRecursive(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// Limpia solo el contenido de una carpeta (evita ENOTEMPTY en Windows)
function emptyDirSafe(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  entries.forEach((name) => {
    const target = path.join(dir, name);
    try {
      fs.rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 8,
        retryDelay: 250,
      });
    } catch (error) {
      if (error && (error.code === 'ENOTEMPTY' || error.code === 'EPERM' || error.code === 'EBUSY')) {
        console.warn(`No se pudo limpiar ${name}, se conserva y se sobreescribe lo necesario.`);
        return;
      }
      throw error;
    }
  });
}

function loadManifestKeepSet(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    const keep = new Set();
    const files = manifest?.files || {};
    Object.values(files).forEach((value) => {
      const rel = String(value || '').replace(/^\/+/, '');
      if (rel.startsWith('static/')) {
        keep.add(rel.replace(/\\/g, '/'));
      }
    });

    for (const rel of Array.from(keep)) {
      if (rel.startsWith('static/js/') && rel.endsWith('.js')) {
        keep.add(`${rel}.LICENSE.txt`);
      }
      if (rel.startsWith('static/css/') && rel.endsWith('.css')) {
        keep.add(`${rel}.LICENSE.txt`);
      }
    }

    return keep;
  } catch (error) {
    console.warn('No se pudo leer asset-manifest.json para limpieza selectiva:', error.message);
    return null;
  }
}

function pruneStaticByKeepSet(rootDir, keepSet) {
  if (!keepSet || !fs.existsSync(rootDir)) return;
  const staticDir = path.join(rootDir, 'static');
  if (!fs.existsSync(staticDir)) return;

  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        try {
          const remaining = fs.readdirSync(abs);
          if (remaining.length === 0) {
            fs.rmdirSync(abs);
          }
        } catch (_) {}
        return;
      }

      const relFromRoot = path.relative(rootDir, abs).replace(/\\/g, '/');
      if (relFromRoot.startsWith('static/') && !keepSet.has(relFromRoot)) {
        try {
          fs.rmSync(abs, { force: true });
        } catch (_) {}
      }
    });
  };

  walk(staticDir);
}

try {
  // Limpiar carpeta de despliegue solo si se solicita explicitamente.
  // Por defecto se hace overwrite para evitar ENOTEMPTY en Windows.
  fs.mkdirSync(deployDir, { recursive: true });
  if (process.env.CLEAN_DEPLOY === '1') {
    emptyDirSafe(deployDir);
  }

  // Copiar desde public/ (PHP y assets base) excepto artefactos del build
  const skipPublic = new Set(['index.html', 'asset-manifest.json', 'manifest.json', 'static']);
  fs.readdirSync(publicDir).forEach((file) => {
    if (skipPublic.has(file)) return;
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(deployDir, file);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });

  // Copiar artefactos del build
  const buildFiles = fs.readdirSync(buildDir).filter(f =>
    f.endsWith('.html') || f.endsWith('.json') || f === 'static'
  );

  const keepSet = loadManifestKeepSet(path.join(buildDir, 'asset-manifest.json'));
  if (keepSet) {
    pruneStaticByKeepSet(buildDir, keepSet);
    pruneStaticByKeepSet(deployDir, keepSet);
  }

  buildFiles.forEach(file => {
    const srcPath = path.join(buildDir, file);
    const destPath = path.join(deployDir, file);

    if (fs.lstatSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
      console.log(`Copiado: ${file}/`);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copiado: ${file}`);
    }
  });

  console.log('Sincronizacion completada');
  console.log('Proximo paso: Sube la carpeta public_html/ a Hostinger via FTP');

} catch (error) {
  console.error('Error durante la sincronizacion:', error.message);
  process.exit(1);
}
