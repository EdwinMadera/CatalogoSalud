const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'catalogo-salud-secret-key-2026';

function authMiddleware(db) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, nombre, email, role, especialidades FROM users WHERE id = ?').get(decoded.id);
      if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

module.exports = function (db) {
  const auth = authMiddleware(db);

  // POST /api/auth/register
  router.post('/register', (req, res) => {
    const { nombre, email, password, especialidades } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'Este email ya está registrado' });
    }
    const password_hash = bcrypt.hashSync(password, 10);
    const esp = Array.isArray(especialidades) ? especialidades.join(',') : (especialidades || '');
    const info = db.prepare(
      'INSERT INTO users (nombre, email, password_hash, role, especialidades) VALUES (?, ?, ?, ?, ?)'
    ).run(nombre.trim(), email.toLowerCase().trim(), password_hash, 'usuario', esp);

    const token = jwt.sign({ id: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: info.lastInsertRowid, nombre: nombre.trim(), email: email.toLowerCase().trim(), role: 'usuario', especialidades: esp }
    });
  });

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, especialidades: user.especialidades }
    });
  });

  // GET /api/auth/me
  router.get('/me', auth, (req, res) => {
    res.json(req.user);
  });

  // PUT /api/auth/especialidades — Update user specialties
  router.put('/especialidades', auth, (req, res) => {
    const { especialidades } = req.body;
    const esp = Array.isArray(especialidades) ? especialidades.join(',') : (especialidades || '');
    db.prepare('UPDATE users SET especialidades = ? WHERE id = ?').run(esp, req.user.id);
    res.json({ updated: true });
  });

  // GET /api/auth/users — Admin: list all users
  router.get('/users', auth, adminMiddleware, (req, res) => {
    const users = db.prepare('SELECT id, nombre, email, role, especialidades, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  // PUT /api/auth/users/:id/role — Admin: change user role
  router.put('/users/:id/role', auth, adminMiddleware, (req, res) => {
    const { role } = req.body;
    if (!['admin', 'usuario'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
    res.json({ updated: true });
  });

  return { router, authMiddleware: auth, adminMiddleware };
};
