const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // GET /api/temas — Listar temas con filtros y búsqueda
  router.get('/', (req, res) => {
    const { curso, tronco, q, estado, limit, offset } = req.query;
    let where = [];
    let params = [];

    if (curso) { where.push('t.curso = ?'); params.push(curso); }
    if (tronco) { where.push('t.tronco = ?'); params.push(tronco); }
    if (estado) { where.push('t.estado = ?'); params.push(estado); }
    if (q) {
      where.push("(normalize(t.nombre) LIKE normalize(?) OR normalize(t.curso) LIKE normalize(?) OR normalize(t.tronco) LIKE normalize(?) OR t.id IN (SELECT e.tema_id FROM evidencias e WHERE normalize(e.nombre_archivo) LIKE normalize(?) OR normalize(e.tipo) LIKE normalize(?)))");
      const term = `%${q}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const lim = parseInt(limit) || 50;
    const off = parseInt(offset) || 0;

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM temas t ${whereClause}`).get(...params);

    const rows = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM evidencias e WHERE e.tema_id = t.id) as total_evidencias
      FROM temas t
      ${whereClause}
      ORDER BY t.curso, t.nombre
      LIMIT ? OFFSET ?
    `).all(...params, lim, off);

    res.json({ total: countRow.total, limit: lim, offset: off, data: rows });
  });

  // GET /api/temas/cursos — Listar cursos únicos con conteos
  router.get('/cursos', (req, res) => {
    const rows = db.prepare(`
      SELECT curso, tronco, COUNT(*) as total
      FROM temas
      GROUP BY curso
      ORDER BY tronco, curso
    `).all();
    res.json(rows);
  });

  // GET /api/temas/troncos — Listar troncos únicos
  router.get('/troncos', (req, res) => {
    const rows = db.prepare(`
      SELECT DISTINCT tronco FROM temas ORDER BY tronco
    `).all();
    res.json(rows.map(r => r.tronco));
  });

  // GET /api/temas/:id — Detalle de un tema con evidencias
  router.get('/:id', (req, res) => {
    const tema = db.prepare('SELECT * FROM temas WHERE id = ?').get(req.params.id);
    if (!tema) return res.status(404).json({ error: 'Tema no encontrado' });

    const evidencias = db.prepare(
      'SELECT * FROM evidencias WHERE tema_id = ? ORDER BY tipo, numero'
    ).all(req.params.id);

    // Get related temas from same curso
    const relacionados = db.prepare(
      'SELECT id, nombre, curso FROM temas WHERE curso = ? AND id != ? LIMIT 6'
    ).all(tema.curso, tema.id);

    res.json({ ...tema, evidencias, relacionados });
  });

  // POST /api/temas — Crear tema (admin)
  router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { nombre, tronco, curso, estado } = req.body;
    if (!nombre || !tronco || !curso) {
      return res.status(400).json({ error: 'nombre, tronco y curso son requeridos' });
    }
    const info = db.prepare(
      'INSERT INTO temas (nombre, tronco, curso, estado) VALUES (?, ?, ?, ?)'
    ).run(nombre, tronco, curso, estado || 'Publicado');
    res.status(201).json({ id: info.lastInsertRowid, nombre, tronco, curso, estado: estado || 'Publicado' });
  });

  // PUT /api/temas/:id — Editar tema (admin)
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM temas WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });

    const { nombre, tronco, curso, estado } = req.body;
    db.prepare(
      'UPDATE temas SET nombre = ?, tronco = ?, curso = ?, estado = ? WHERE id = ?'
    ).run(
      nombre || existing.nombre,
      tronco || existing.tronco,
      curso || existing.curso,
      estado || existing.estado,
      req.params.id
    );
    res.json({ id: parseInt(req.params.id), nombre: nombre || existing.nombre, tronco: tronco || existing.tronco, curso: curso || existing.curso, estado: estado || existing.estado });
  });

  // DELETE /api/temas/:id — Eliminar tema (admin)
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM temas WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });
    db.prepare('DELETE FROM evidencias WHERE tema_id = ?').run(req.params.id);
    db.prepare('DELETE FROM temas WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
