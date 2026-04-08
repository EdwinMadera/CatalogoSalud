const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

const TIPOS_PERMITIDOS = ['GPC [GER]', 'GPC [GRR]', 'NOM', 'Lineamiento', 'SSa'];

function esDocumentoMexicano(tipo, nombreArchivo) {
  if (TIPOS_PERMITIDOS.includes(tipo)) return true;
  if (nombreArchivo && nombreArchivo.toUpperCase().includes('PRONAM')) return true;
  return false;
}

module.exports = function (db, authMiddleware, adminMiddleware) {
  // POST /api/upload/excel
  router.post('/excel', authMiddleware, adminMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Try to auto-detect header row (look for common column names)
      let headerIdx = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const row = rows[i];
        if (row && row.some(cell => typeof cell === 'string' && (cell.includes('Tema') || cell.includes('Curso') || cell.includes('Tronco')))) {
          headerIdx = i;
          break;
        }
      }

      const dataRows = rows.slice(headerIdx + 1);

      // Filter for Mexican documents
      const filteredRows = dataRows.filter(row => {
        const tipo = (row[7] || '').toString().trim();
        const nombreArchivo = (row[6] || '').toString().trim();
        return esDocumentoMexicano(tipo, nombreArchivo);
      });

      let temasCreated = 0;
      let evidenciasCreated = 0;

      const insertTransaction = db.transaction(() => {
        const temasMap = new Map();

        // First: collect unique temas
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

        // Insert or find temas
        const temaIdMap = new Map();
        for (const [nombre, data] of temasMap) {
          let existing = db.prepare('SELECT id FROM temas WHERE nombre = ? AND curso = ?').get(data.nombre, data.curso);
          if (existing) {
            temaIdMap.set(nombre, existing.id);
          } else {
            const info = db.prepare('INSERT INTO temas (nombre, tronco, curso) VALUES (?, ?, ?)').run(data.nombre, data.tronco, data.curso);
            temaIdMap.set(nombre, info.lastInsertRowid);
            temasCreated++;
          }
        }

        // Insert evidencias
        for (const row of filteredRows) {
          const tema = (row[3] || '').toString().trim();
          if (!tema || !temaIdMap.has(tema)) continue;

          const temaId = temaIdMap.get(tema);
          const nombreArchivo = (row[6] || '').toString().trim();
          let tipo = (row[7] || '').toString().trim();
          const citaVancouver = (row[8] || '').toString().trim();
          const accesoDirecto = (row[9] || '').toString().trim();

          if (tipo === 'Otro' && nombreArchivo.toUpperCase().includes('PRONAM')) tipo = 'PRONAM';
          if (!nombreArchivo && !citaVancouver) continue;

          // Check for duplicate
          const dup = db.prepare('SELECT id FROM evidencias WHERE tema_id = ? AND nombre_archivo = ?').get(temaId, nombreArchivo);
          if (dup) continue;

          const numero = row[0] ? parseInt(row[0]) : null;
          const clasificacion = (row[5] || '').toString().trim();

          db.prepare(
            'INSERT INTO evidencias (tema_id, numero, clasificacion, nombre_archivo, tipo, cita_vancouver, acceso_directo) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(temaId, numero, clasificacion, nombreArchivo, tipo, citaVancouver, accesoDirecto);
          evidenciasCreated++;
        }
      });

      insertTransaction();

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: `Carga completada: ${temasCreated} temas nuevos, ${evidenciasCreated} evidencias nuevas`,
        temasCreated,
        evidenciasCreated
      });
    } catch (e) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Error procesando archivo: ' + e.message });
    }
  });

  return router;
};
