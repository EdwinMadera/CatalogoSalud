CREATE TABLE IF NOT EXISTS temas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tronco TEXT NOT NULL,
  curso TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Publicado'
);

CREATE TABLE IF NOT EXISTS evidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tema_id INTEGER NOT NULL,
  categoria_id INTEGER,
  numero INTEGER,
  clasificacion TEXT,
  nombre_archivo TEXT,
  tipo TEXT,
  cita_vancouver TEXT,
  acceso_directo TEXT,
  url_fuente TEXT,
  FOREIGN KEY (tema_id) REFERENCES temas(id) ON DELETE CASCADE,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'usuario',
  especialidades TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  enlace_url TEXT,
  posicion TEXT NOT NULL DEFAULT 'resultados',
  activo INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0,
  fecha_inicio TEXT,
  fecha_fin TEXT
);

CREATE TABLE IF NOT EXISTS publicaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  categoria TEXT NOT NULL DEFAULT 'Actualización',
  enlace_url TEXT,
  fuente TEXT,
  fecha TEXT DEFAULT (date('now')),
  destacado INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  evidencia_id INTEGER,
  categoria TEXT NOT NULL,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (evidencia_id) REFERENCES evidencias(id)
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  color TEXT DEFAULT '#009A90',
  orden INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_categorias_orden ON categorias(orden);
CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha ON publicaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_evidencias_tema ON evidencias(tema_id);
CREATE INDEX IF NOT EXISTS idx_temas_curso ON temas(curso);
CREATE INDEX IF NOT EXISTS idx_temas_tronco ON temas(tronco);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_banners_posicion ON banners(posicion, activo);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes(estado);
