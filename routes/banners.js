const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // GET /api/banners — Public: active banners
  router.get('/', (req, res) => {
    const { posicion } = req.query;
    let sql = 'SELECT * FROM banners WHERE activo = 1';
    const params = [];
    if (posicion) { sql += ' AND posicion = ?'; params.push(posicion); }
    sql += ' ORDER BY orden ASC';
    res.json(db.prepare(sql).all(...params));
  });

  // GET /api/banners/all — Admin: all banners
  router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
    res.json(db.prepare('SELECT * FROM banners ORDER BY orden ASC').all());
  });

  // POST /api/banners
  router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });
    const info = db.prepare(
      'INSERT INTO banners (titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(titulo, descripcion || '', imagen_url || '', enlace_url || '', posicion || 'resultados', activo !== undefined ? activo : 1, orden || 0);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  // PUT /api/banners/:id
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Banner no encontrado' });
    const { titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden } = req.body;
    db.prepare(
      'UPDATE banners SET titulo=?, descripcion=?, imagen_url=?, enlace_url=?, posicion=?, activo=?, orden=? WHERE id=?'
    ).run(
      titulo ?? existing.titulo, descripcion ?? existing.descripcion, imagen_url ?? existing.imagen_url,
      enlace_url ?? existing.enlace_url, posicion ?? existing.posicion, activo ?? existing.activo,
      orden ?? existing.orden, req.params.id
    );
    res.json({ updated: true });
  });

  // DELETE /api/banners/:id
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Banner no encontrado' });
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
