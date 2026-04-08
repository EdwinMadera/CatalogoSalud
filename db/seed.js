const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const EXCEL_PATH = path.join(__dirname, '..', 'Evidencias de GPC.xlsx');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Remove old DB if exists
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Read Excel with openpyxl-style hyperlink extraction
const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['Evidencias 2026'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Extract hyperlinks from the sheet (Drive links are hidden as hyperlinks)
const hyperlinks = {};
if (sheet['!hyperlinks']) {
  for (const hl of sheet['!hyperlinks']) {
    hyperlinks[hl.ref] = hl.Target || hl.target || '';
  }
}
// Also check cell objects for links
for (const cellRef in sheet) {
  if (cellRef.startsWith('!')) continue;
  const cell = sheet[cellRef];
  if (cell && cell.l && cell.l.Target) {
    hyperlinks[cellRef] = cell.l.Target;
  }
}
console.log(`  - ${Object.keys(hyperlinks).length} hyperlinks encontrados en Excel`);

// Helper to get hyperlink for a row/col (0-indexed row from data, 0-indexed col)
function getHyperlink(dataRowIdx, col) {
  const excelRow = dataRowIdx + 3; // +2 for header rows, +1 for 1-indexed
  const colLetter = String.fromCharCode(65 + col); // A=0, B=1, ..., J=9
  const ref = colLetter + excelRow;
  return hyperlinks[ref] || '';
}

// Skip header rows (0 = title, 1 = column headers)
const dataRows = rows.slice(2);

// Only include Mexican official documents
const TIPOS_PERMITIDOS = ['GPC [GER]', 'GPC [GRR]', 'NOM', 'Lineamiento', 'SSa'];

function esDocumentoMexicano(tipo, nombreArchivo) {
  if (TIPOS_PERMITIDOS.includes(tipo)) return true;
  // Include PRONAM documents (classified as "Otro" in Excel)
  if (nombreArchivo && nombreArchivo.toUpperCase().includes('PRONAM')) return true;
  return false;
}

// First pass: filter only rows with Mexican documents
const filteredRows = dataRows.filter(row => {
  const tipo = (row[7] || '').toString().trim();
  const nombreArchivo = (row[6] || '').toString().trim();
  return esDocumentoMexicano(tipo, nombreArchivo);
});

// Extract unique temas (only those that have at least one Mexican document)
const temasMap = new Map();
for (const row of filteredRows) {
  const tema = (row[3] || '').toString().trim();
  if (!tema) continue;
  if (!temasMap.has(tema)) {
    temasMap.set(tema, {
      nombre: tema,
      tronco: (row[1] || '').toString().trim(),
      curso: (row[2] || '').toString().trim()
    });
  }
}

// Insert temas
const insertTema = db.prepare('INSERT INTO temas (nombre, tronco, curso) VALUES (?, ?, ?)');
const temaIdMap = new Map();

const insertTemasTransaction = db.transaction(() => {
  for (const [nombre, data] of temasMap) {
    const info = insertTema.run(data.nombre, data.tronco, data.curso);
    temaIdMap.set(nombre, info.lastInsertRowid);
  }
});
insertTemasTransaction();

// Extract URL from citation text
function extractUrl(text) {
  if (!text) return '';
  const match = text.match(/https?:\/\/[^\s,;)\]]+/);
  return match ? match[0].replace(/\.+$/, '') : '';
}

// Insert evidencias
const insertEvidencia = db.prepare(
  'INSERT INTO evidencias (tema_id, numero, clasificacion, nombre_archivo, tipo, cita_vancouver, acceso_directo, url_fuente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

let evidenciaCount = 0;
let urlCount = 0;
let driveCount = 0;
const insertEvidenciasTransaction = db.transaction(() => {
  for (const row of filteredRows) {
    const tema = (row[3] || '').toString().trim();
    if (!tema || !temaIdMap.has(tema)) continue;
    const temaId = temaIdMap.get(tema);
    const numero = row[0] ? parseInt(row[0]) : null;
    const clasificacion = (row[5] || '').toString().trim();
    const nombreArchivo = (row[6] || '').toString().trim();
    let tipo = (row[7] || '').toString().trim();
    const citaVancouver = (row[8] || '').toString().trim();
    const accesoTexto = (row[9] || '').toString().trim();

    // Get the Drive hyperlink from column J (col 9) — "Acceso Directo"
    const dataIdx = filteredRows.indexOf(row);
    const originalIdx = dataRows.indexOf(row);
    const accesoDirecto = getHyperlink(originalIdx, 9) || (accesoTexto.startsWith('http') ? accesoTexto : '');

    // Reclassify PRONAM documents
    if (tipo === 'Otro' && nombreArchivo.toUpperCase().includes('PRONAM')) {
      tipo = 'PRONAM';
    }

    if (!nombreArchivo && !citaVancouver) continue;

    // Extract original source URL from citation
    const urlFuente = extractUrl(citaVancouver);
    if (urlFuente) urlCount++;
    if (accesoDirecto) driveCount++;

    insertEvidencia.run(temaId, numero, clasificacion, nombreArchivo, tipo, citaVancouver, accesoDirecto, urlFuente);
    evidenciaCount++;
  }
});
insertEvidenciasTransaction();

// Create default admin user
const bcrypt = require('bcryptjs');
const adminHash = bcrypt.hashSync('admin123', 10);
db.prepare(
  "INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)"
).run('Administrador', 'admin@catalogosalud.com', adminHash, 'admin');

// Create example banners (placeholders)
db.prepare(
  "INSERT INTO banners (titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)"
).run(
  'Curso ENARM 2026 — Inscripciones abiertas',
  'Prepara tu examen con nuestro curso completo de GPC y NOM mexicanas. Más de 500 guías, simuladores y flashcards.',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop',
  '#',
  'header',
  1,
  1
);
db.prepare(
  "INSERT INTO banners (titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)"
).run(
  'App de Flashcards Medicas',
  'Estudia con tarjetas de memoria basadas en GPC oficiales',
  '',
  '#',
  'resultados',
  1,
  1
);
db.prepare(
  "INSERT INTO banners (titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)"
).run(
  'Simulador ENARM',
  'Practica con preguntas tipo ENARM basadas en documentos oficiales',
  '',
  '#',
  'detalle',
  1,
  2
);

// Create sample publicaciones
const pubs = [
  ['Actualización GPC Diabetes Mellitus Tipo 2 — IMSS 2026','La Secretaría de Salud publicó la actualización de la Guía de Práctica Clínica para el diagnóstico y tratamiento de DM2 en primer nivel de atención.','Nueva GPC','https://www.cenetec-difusion.com/CMGPC/','CENETEC','2026-03-15',1],
  ['NOM-015-SSA2-2024: Prevención y control de diabetes','Se publicó en el DOF la nueva Norma Oficial Mexicana para la prevención, detección, diagnóstico, tratamiento y control de la diabetes mellitus.','Nueva NOM','https://www.dof.gob.mx/','DOF','2026-02-28',1],
  ['CENETEC publica 12 nuevas GPC para urgencias médicas','El Centro Nacional de Excelencia Tecnológica en Salud actualizó las guías para manejo de urgencias incluyendo STEMI, EVC y sepsis.','Nueva GPC','https://www.cenetec-difusion.com/','CENETEC','2026-02-10',0],
  ['Lineamiento para la vigilancia epidemiológica del dengue 2026','La SSa emitió los nuevos lineamientos para la temporada de lluvias 2026, incluyendo cambios en criterios de clasificación.','Lineamiento','https://www.gob.mx/salud','SSa','2026-01-20',0],
  ['PRONAM: Nuevo módulo sobre hipertensión arterial','El Programa Nacional de Actualización Médica incorpora el módulo de HAS con base en las últimas GPC y evidencia internacional.','PRONAM','#','PRONAM','2026-01-05',0],
  ['Actualización de la NOM-007-SSA2 para atención del embarazo','Modificaciones a la norma de atención de la mujer durante el embarazo, parto y puerperio, y de la persona recién nacida.','Nueva NOM','https://www.dof.gob.mx/','DOF','2025-12-15',0],
];
const insertPub = db.prepare('INSERT INTO publicaciones (titulo, descripcion, categoria, enlace_url, fuente, fecha, destacado) VALUES (?, ?, ?, ?, ?, ?, ?)');
pubs.forEach(p => insertPub.run(...p));

// Create categories from unique cursos and link evidencias
const cursosUnicos = db.prepare('SELECT DISTINCT curso FROM temas ORDER BY curso').all();
const insertCat = db.prepare('INSERT INTO categorias (nombre, orden, visible) VALUES (?, ?, 1)');
cursosUnicos.forEach((c, i) => insertCat.run(c.curso, i));

// Link evidencias to their categoria based on curso
const allCats = db.prepare('SELECT id, nombre FROM categorias').all();
const catMap = {};
allCats.forEach(c => { catMap[c.nombre] = c.id; });
const updateEvCat = db.prepare('UPDATE evidencias SET categoria_id = ? WHERE tema_id IN (SELECT id FROM temas WHERE curso = ?)');
allCats.forEach(c => updateEvCat.run(c.id, c.nombre));
const linked = db.prepare('SELECT COUNT(*) as c FROM evidencias WHERE categoria_id IS NOT NULL').get().c;

console.log(`  - ${cursosUnicos.length} categorías creadas (${linked} evidencias vinculadas)`);
console.log(`Seed completado:`);
console.log(`  - ${temasMap.size} temas insertados`);
console.log(`  - ${evidenciaCount} evidencias insertadas (${urlCount} con URL fuente, ${driveCount} con link Drive)`);
console.log(`  - 1 usuario admin creado (admin@catalogosalud.com / admin123)`);
console.log(`  - 3 banners de ejemplo creados`);
console.log(`  - ${pubs.length} publicaciones de ejemplo creadas`);
console.log(`  - BD guardada en: ${DB_PATH}`);

db.close();
