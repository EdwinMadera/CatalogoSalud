const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new Database(path.join(__dirname, 'db', 'database.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Custom SQLite function to normalize text (strip accents)
db.function('normalize', (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth setup
const { router: authRouter, authMiddleware, adminMiddleware } = require('./routes/auth')(db);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/temas', require('./routes/temas')(db, authMiddleware, adminMiddleware));
app.use('/api/evidencias', require('./routes/evidencias')(db, authMiddleware, adminMiddleware));
app.use('/api/banners', require('./routes/banners')(db, authMiddleware, adminMiddleware));
app.use('/api/upload', require('./routes/upload')(db, authMiddleware, adminMiddleware));
app.use('/api/publicaciones', require('./routes/publicaciones')(db, authMiddleware, adminMiddleware));
app.use('/api/reportes', require('./routes/reportes')(db, authMiddleware, adminMiddleware));
app.use('/api/categorias', require('./routes/categorias')(db, authMiddleware, adminMiddleware));

// Stats endpoint
app.get('/api/stats', (req, res) => {
  const totalTemas = db.prepare('SELECT COUNT(*) as c FROM temas').get().c;
  const publicados = db.prepare("SELECT COUNT(*) as c FROM temas WHERE estado = 'Publicado'").get().c;
  const borradores = db.prepare("SELECT COUNT(*) as c FROM temas WHERE estado = 'Borrador'").get().c;
  const totalEvidencias = db.prepare('SELECT COUNT(*) as c FROM evidencias').get().c;
  const cursos = db.prepare('SELECT COUNT(DISTINCT curso) as c FROM temas').get().c;
  const troncos = db.prepare('SELECT COUNT(DISTINCT tronco) as c FROM temas').get().c;
  const totalUsuarios = db.prepare('SELECT COUNT(*) as c FROM users').get().c;

  const porCurso = db.prepare('SELECT curso, COUNT(*) as total FROM temas GROUP BY curso ORDER BY total DESC').all();
  const porTipo = db.prepare('SELECT tipo, COUNT(*) as total FROM evidencias GROUP BY tipo ORDER BY total DESC').all();

  res.json({ totalTemas, publicados, borradores, totalEvidencias, cursos, troncos, totalUsuarios, porCurso, porTipo });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Catalogo de Salud corriendo en http://localhost:${PORT}`);
});
