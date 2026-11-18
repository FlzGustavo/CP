import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distDir = path.resolve('dist');
const outputFile = path.resolve('index-gas.txt');

console.log('Iniciando construcción para Google Apps Script (usando vite-plugin-singlefile)...');

// 1. Ejecutar build
try {
  console.log('Ejecutando npm run build...');
  // Force production mode explicitly
  execSync('npx vite build --mode production', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('Error durante el build:', error);
  process.exit(1);
}

// 2. Leer index.html generado
const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('No se encontró dist/index.html');
  process.exit(1);
}

let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

// 3. Post-procesamiento para GAS
// Eliminar type="module" y crossorigin para evitar problemas en algunos contextos de GAS
htmlContent = htmlContent.replace(/<script type="module" crossorigin/g, '<script');
htmlContent = htmlContent.replace(/<script type="module"/g, '<script');

// Eliminar import.meta.url que causa errores en GAS
if (htmlContent.includes('import.meta.url')) {
  console.log('Detectado import.meta.url, eliminándolo...');
  htmlContent = htmlContent.replace(/import\.meta\.url/g, '(void 0)');
}

// Reemplazar <? por \x3c? para evitar que GAS lo interprete como scriptlet
// Esto es necesario porque algunas librerías (como xlsx) pueden incluir "<?xml..." en strings
if (htmlContent.includes('<?')) {
  console.log('Detectado <? (posible conflicto con scriptlets de GAS), reemplazándolo...');
  htmlContent = htmlContent.replace(/<\?/g, '\\x3c?');
}

// Escapar </script> dentro del contenido del script para evitar romper el HTML
// Asumimos que el último </script> es el cierre de la etiqueta principal
const closingScriptTag = '</script>';
const lastIndex = htmlContent.lastIndexOf(closingScriptTag);
if (lastIndex !== -1) {
  const before = htmlContent.substring(0, lastIndex);
  const after = htmlContent.substring(lastIndex);
  // Reemplazar </script> por <\/script> en la parte anterior (contenido del script)
  const newBefore = before.replace(/<\/script>/g, '<\\/script>');
  htmlContent = newBefore + after;
}

// 4. Escribir resultado
fs.writeFileSync(outputFile, htmlContent);
console.log(`\n¡Éxito! Archivo generado: ${outputFile}`);
console.log('Copia el contenido de este archivo y pégalo en tu archivo .html en Google Apps Script.');
