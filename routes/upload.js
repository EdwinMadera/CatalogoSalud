const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Límite de tamaño y validación de tipo para reducir superficie de ataque del parser de Excel.
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls)$/i.test(file.originalname);
    const okMime = /sheet|excel|spreadsheet/i.test(file.mimetype) || file.mimetype === 'application/octet-stream';
    if (okExt && okMime) return cb(null, true);
    cb(new Error('Solo se permiten archivos .xlsx o .xls'));
  },
});

const TIPOS_PERMITIDOS = ['GPC [GER]', 'GPC [GRR]', 'NOM', 'Lineamiento', 'SSa'];

function esDocumentoMexicano(tipo, nombreArchivo) {
  if (TIPOS_PERMITIDOS.includes(tipo)) return true;
  if (nombreArchivo && nombreArchivo.toUpperCase().includes('PRONAM')) return true;
  return false;
}

module.exports = function (db, authMiddleware, adminMiddleware) {
  // POST /api/upload/excel
  router.post('/excel', authMiddleware, adminMiddleware, (req, res) => {
    upload.single('file')(req, res, (uploadErr) => {
      if (uploadErr) return res.status(400).json({ error: uploadErr.message });
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Extraer hipervínculos (los links de Drive vienen ocultos como hyperlink en la celda).
        const hyperlinks = {};
        for (const cellRef in sheet) {
          if (cellRef.startsWith('!')) continue;
          const cell = sheet[cellRef];
          if (cell && cell.l && cell.l.Target) hyperlinks[cellRef] = cell.l.Target;
        }

        // Auto-detectar fila de encabezados (busca nombres de columna comunes).
        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i];
          if (row && row.some(cell => typeof cell === 'string' && (cell.includes('Tema') || cell.includes('Curso') || cell.includes('Tronco')))) {
            headerIdx = i;
            break;
          }
        }

        const dataRows = rows.slice(headerIdx + 1);

        // Devuelve el hyperlink de la columna J (índice 9, "Acceso Directo") para una fila de datos.
        function getHyperlink(dataIdx) {
          const excelRow = headerIdx + dataIdx + 2; // 1-indexado en Excel
          return hyperlinks['J' + excelRow] || '';
        }

        let temasCreated = 0;
        let evidenciasCreated = 0;

        const insertTransaction = db.transaction(() => {
          const temasMap = new Map();

          // Recolectar temas únicos de documentos mexicanos.
          dataRows.forEach((row) => {
            const tipo = (row[7] || '').toString().trim();
            const nombreArchivo = (row[6] || '').toString().trim();
            if (!esDocumentoMexicano(tipo, nombreArchivo)) return;
            const tema = (row[3] || '').toString().trim();
            if (!tema) return;
            if (!temasMap.has(tema)) {
              temasMap.set(tema, {
                nombre: tema,
                tronco: (row[1] || '').toString().trim(),
                curso: (row[2] || '').toString().trim(),
              });
            }
          });

          // Insertar o encontrar temas.
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

          // Insertar evidencias (recorre con índice para resolver el hyperlink por celda).
          dataRows.forEach((row, di) => {
            const tipoRaw = (row[7] || '').toString().trim();
            const nombreArchivo = (row[6] || '').toString().trim();
            if (!esDocumentoMexicano(tipoRaw, nombreArchivo)) return;

            const tema = (row[3] || '').toString().trim();
            if (!tema || !temaIdMap.has(tema)) return;

            const temaId = temaIdMap.get(tema);
            let tipo = tipoRaw;
            const citaVancouver = (row[8] || '').toString().trim();
            const accesoTexto = (row[9] || '').toString().trim();
            const accesoDirecto = getHyperlink(di) || (accesoTexto.startsWith('http') ? accesoTexto : '');

            if (tipo === 'Otro' && nombreArchivo.toUpperCase().includes('PRONAM')) tipo = 'PRONAM';
            if (!nombreArchivo && !citaVancouver) return;

            // Evitar duplicados.
            const dup = db.prepare('SELECT id FROM evidencias WHERE tema_id = ? AND nombre_archivo = ?').get(temaId, nombreArchivo);
            if (dup) return;

            const numero = row[0] ? parseInt(row[0]) : null;
            const clasificacion = (row[5] || '').toString().trim();

            db.prepare(
              'INSERT INTO evidencias (tema_id, numero, clasificacion, nombre_archivo, tipo, cita_vancouver, acceso_directo) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).run(temaId, numero, clasificacion, nombreArchivo, tipo, citaVancouver, accesoDirecto);
            evidenciasCreated++;
          });
        });

        insertTransaction();

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Carga completada: ${temasCreated} temas nuevos, ${evidenciasCreated} evidencias nuevas`,
          temasCreated,
          evidenciasCreated,
        });
      } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error procesando archivo: ' + e.message });
      }
    });
  });

  return router;
};
