const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // GET /api/publicaciones — Public: active publications
  router.get('/', (req, res) => {
    const { limit, categoria } = req.query;
    let sql = 'SELECT * FROM publicaciones WHERE activo = 1';
    const params = [];
    if (categoria) { sql += ' AND categoria = ?'; params.push(categoria); }
    sql += ' ORDER BY destacado DESC, fecha DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    res.json(db.prepare(sql).all(...params));
  });

  // GET /api/publicaciones/all — Admin: all
  router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
    res.json(db.prepare('SELECT * FROM publicaciones ORDER BY fecha DESC').all());
  });

  // POST /api/publicaciones
  router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { titulo, descripcion, imagen_url, categoria, enlace_url, fuente, fecha, destacado } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });
    const info = db.prepare(
      'INSERT INTO publicaciones (titulo, descripcion, imagen_url, categoria, enlace_url, fuente, fecha, destacado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(titulo, descripcion || '', imagen_url || '', categoria || 'Actualización', enlace_url || '', fuente || '', fecha || new Date().toISOString().split('T')[0], destacado ? 1 : 0);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  // PUT /api/publicaciones/:id
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM publicaciones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Publicación no encontrada' });
    const { titulo, descripcion, imagen_url, categoria, enlace_url, fuente, fecha, destacado, activo } = req.body;
    db.prepare(
      'UPDATE publicaciones SET titulo=?, descripcion=?, imagen_url=?, categoria=?, enlace_url=?, fuente=?, fecha=?, destacado=?, activo=? WHERE id=?'
    ).run(
      titulo ?? existing.titulo, descripcion ?? existing.descripcion, imagen_url ?? existing.imagen_url, categoria ?? existing.categoria,
      enlace_url ?? existing.enlace_url, fuente ?? existing.fuente, fecha ?? existing.fecha,
      destacado !== undefined ? (destacado ? 1 : 0) : existing.destacado,
      activo !== undefined ? (activo ? 1 : 0) : existing.activo,
      req.params.id
    );
    res.json({ updated: true });
  });

  // DELETE /api/publicaciones/:id
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM publicaciones WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
