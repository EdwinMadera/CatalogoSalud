const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // GET /api/categorias — Public: visible categories
  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM categorias WHERE visible = 1 ORDER BY orden ASC, nombre ASC').all());
  });

  // GET /api/categorias/all — Admin: all
  router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
    res.json(db.prepare('SELECT * FROM categorias ORDER BY orden ASC, nombre ASC').all());
  });

  // POST /api/categorias
  router.post('/', authMiddleware, adminMiddleware, (req, res) => {
    const { nombre, descripcion, color, orden, visible } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const info = db.prepare(
      'INSERT INTO categorias (nombre, descripcion, color, orden, visible) VALUES (?, ?, ?, ?, ?)'
    ).run(nombre, descripcion || '', color || '#009A90', orden || 0, visible !== undefined ? visible : 1);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  // PUT /api/categorias/:id
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const existing = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' });
    const { nombre, descripcion, color, orden, visible } = req.body;
    db.prepare(
      'UPDATE categorias SET nombre=?, descripcion=?, color=?, orden=?, visible=? WHERE id=?'
    ).run(
      nombre ?? existing.nombre, descripcion ?? existing.descripcion, color ?? existing.color,
      orden ?? existing.orden, visible !== undefined ? (visible ? 1 : 0) : existing.visible,
      req.params.id
    );
    res.json({ updated: true });
  });

  // DELETE /api/categorias/:id
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
