const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // GET /api/evidencias — Buscar evidencias con paginación
  router.get('/', (req, res) => {
    const { tema_id, tipo, curso, tronco, categoria_id, q, limit, offset } = req.query;
    let where = [];
    let params = [];

    if (tema_id) { where.push('e.tema_id = ?'); params.push(tema_id); }
    if (tipo) { where.push('e.tipo = ?'); params.push(tipo); }
    if (curso) { where.push('t.curso = ?'); params.push(curso); }
    if (tronco) { where.push('t.tronco = ?'); params.push(tronco); }
    if (categoria_id) { where.push('e.categoria_id = ?'); params.push(categoria_id); }
    if (q) {
      where.push('(normalize(e.nombre_archivo) LIKE normalize(?) OR normalize(e.cita_vancouver) LIKE normalize(?) OR normalize(t.nombre) LIKE normalize(?) OR normalize(t.curso) LIKE normalize(?))');
      const term = `%${q}%`;
      params.push(term, term, term, term);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const lim = parseInt(limit) || 30;
    const off = parseInt(offset) || 0;

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM evidencias e JOIN temas t ON t.id = e.tema_id ${whereClause}`).get(...params);

    const rows = db.prepare(`
      SELECT e.*, t.nombre as tema_nombre, t.curso, t.tronco, c.nombre as categoria_nombre
      FROM evidencias e
      JOIN temas t ON t.id = e.tema_id
      LEFT JOIN categorias c ON c.id = e.categoria_id
      ${whereClause}
      ORDER BY t.curso, t.nombre, e.tipo, e.numero
      LIMIT ? OFFSET ?
    `).all(...params, lim, off);

    res.json({ total: countRow.total, limit: lim, offset: off, data: rows });
  });

  // GET /api/evidencias/tipos — Listar tipos únicos
  router.get('/tipos', (req, res) => {
    const rows = db.prepare(
      'SELECT DISTINCT tipo, COUNT(*) as total FROM evidencias GROUP BY tipo ORDER BY total DESC'
    ).all();
    res.json(rows);
  });

  // POST /api/evidencias — Crear evidencia (admin)
  router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { tema_id, nombre_archivo, tipo, cita_vancouver, acceso_directo, clasificacion } = req.body;
    if (!tema_id || !nombre_archivo) {
      return res.status(400).json({ error: 'tema_id y nombre_archivo son requeridos' });
    }
    const tema = db.prepare('SELECT id FROM temas WHERE id = ?').get(tema_id);
    if (!tema) return res.status(404).json({ error: 'Tema no encontrado' });

    const maxNum = db.prepare('SELECT MAX(numero) as max FROM evidencias WHERE tema_id = ?').get(tema_id);
    const numero = (maxNum.max || 0) + 1;

    const info = db.prepare(
      'INSERT INTO evidencias (tema_id, numero, clasificacion, nombre_archivo, tipo, cita_vancouver, acceso_directo) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(tema_id, numero, clasificacion || 'Original', nombre_archivo, tipo || '', cita_vancouver || '', acceso_directo || '');

    res.status(201).json({ id: info.lastInsertRowid });
  });

  // PUT /api/evidencias/:id — Editar evidencia (admin)
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM evidencias WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evidencia no encontrada' });

    const { nombre_archivo, tipo, cita_vancouver, acceso_directo, clasificacion, url_fuente, categoria_id } = req.body;
    db.prepare(
      'UPDATE evidencias SET nombre_archivo = ?, tipo = ?, cita_vancouver = ?, acceso_directo = ?, clasificacion = ?, url_fuente = ?, categoria_id = ? WHERE id = ?'
    ).run(
      nombre_archivo || existing.nombre_archivo,
      tipo || existing.tipo,
      cita_vancouver !== undefined ? cita_vancouver : existing.cita_vancouver,
      acceso_directo !== undefined ? acceso_directo : existing.acceso_directo,
      clasificacion || existing.clasificacion,
      url_fuente !== undefined ? url_fuente : existing.url_fuente,
      categoria_id !== undefined ? categoria_id : existing.categoria_id,
      req.params.id
    );
    res.json({ updated: true });
  });

  // DELETE /api/evidencias/:id (admin)
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM evidencias WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evidencia no encontrada' });
    db.prepare('DELETE FROM evidencias WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
