const express = require('express');
const router = express.Router();

module.exports = function (db, authMiddleware, adminMiddleware) {
  // POST /api/reportes — User submits a report (requires login)
  router.post('/', authMiddleware, (req, res) => {
    const { evidencia_id, categoria, mensaje } = req.body;
    if (!categoria || !mensaje) return res.status(400).json({ error: 'Categoría y mensaje requeridos' });
    const info = db.prepare(
      'INSERT INTO reportes (user_id, evidencia_id, categoria, mensaje) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, evidencia_id || null, categoria, mensaje);
    res.status(201).json({ id: info.lastInsertRowid, message: 'Reporte enviado. Gracias por tu contribución.' });
  });

  // GET /api/reportes — Admin: list all reports
  router.get('/', authMiddleware, adminMiddleware, (req, res) => {
    const { estado } = req.query;
    let sql = `SELECT r.*, u.nombre as user_nombre, u.email as user_email,
      e.nombre_archivo as evidencia_nombre
      FROM reportes r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN evidencias e ON e.id = r.evidencia_id`;
    const params = [];
    if (estado) { sql += ' WHERE r.estado = ?'; params.push(estado); }
    sql += ' ORDER BY r.created_at DESC';
    res.json(db.prepare(sql).all(...params));
  });

  // GET /api/reportes/count — Admin: pending count
  router.get('/count', authMiddleware, adminMiddleware, (req, res) => {
    const c = db.prepare("SELECT COUNT(*) as c FROM reportes WHERE estado = 'pendiente'").get().c;
    res.json({ pendientes: c });
  });

  // PUT /api/reportes/:id — Admin: update status
  router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: 'Estado requerido' });
    db.prepare('UPDATE reportes SET estado = ? WHERE id = ?').run(estado, req.params.id);
    res.json({ updated: true });
  });

  // DELETE /api/reportes/:id
  router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.prepare('DELETE FROM reportes WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  });

  return router;
};
