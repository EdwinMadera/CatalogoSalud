# Contexto COMPLETO de sesión — Catálogo de Salud

> Documento de traspaso generado el **2026-06-13**.
> Contiene TODO lo necesario para retomar el proyecto tras formatear la computadora,
> sin batallar: cuentas, credenciales, APIs, comandos, esquema de BD y pendientes.
> Copia de seguridad también en GitHub (rama `claude/gracious-dijkstra-fna2cn`).

---

## 0. LO PRIMERO — cuentas, accesos y datos clave

### Cuentas / correos / repos
| Qué | Valor |
|---|---|
| Correo del dueño (tú) | `jemn884@gmail.com` |
| Repositorio GitHub | `EdwinMadera/CatalogoSalud` |
| URL del repo | https://github.com/EdwinMadera/CatalogoSalud |
| Rama con TODOS los cambios | `claude/gracious-dijkstra-fna2cn` |
| Rama principal | `main` |
| Correo de contacto del sitio (en avisos legales) | `contacto@catalogosalud.com` |

### Credenciales de administrador de la app (por defecto)
```
Usuario: admin@catalogosalud.com
Clave:   admin123
```
> ⚠️ Cambiar en producción. En la web hay botón **"Mi cuenta"** (clic en tu nombre,
> arriba a la derecha) para cambiar la contraseña. También se puede crear otro usuario
> y promoverlo a admin desde **Admin → Usuarios**.

### ⚠️ IMPORTANTE sobre APIs y llaves secretas
**Este proyecto NO usa ninguna API externa ni tiene llaves/keys de terceros.**
No hay claves de Google, ni de pagos, ni de servicios de IA, ni nada por el estilo.
No busques un archivo de secretos que no existe. Lo único configurable es:
- `JWT_SECRET` → una clave que **tú inventas/generas** (no viene de ningún proveedor).
- Las variables de entorno de la tabla de la sección 4.

Por lo tanto: **no hay nada secreto que puedas perder al formatear.** Todo el
código y los datos fuente están en GitHub.

---

## 1. Qué es el proyecto

**Catálogo de Salud** — plataforma web para consultar documentos médicos oficiales
mexicanos: Guías de Práctica Clínica (GPC), Normas Oficiales Mexicanas (NOM),
PRONAM, lineamientos y documentos del Sistema Nacional de Salud.

### Stack tecnológico (con versiones exactas)
| Componente | Tecnología | Versión |
|---|---|---|
| Backend | Node.js + Express | 18+ / 4.22.2 |
| Base de datos | SQLite (better-sqlite3) | 11.7.x |
| Frontend | React (por CDN, sin build) + Tailwind (CDN) | 18 / 3.4 |
| Auth | JWT + bcrypt | jsonwebtoken 9 / bcryptjs 3 |
| Upload | Multer | 2.1.x |
| Excel | SheetJS (xlsx) | 0.18.5 |
| Rate limiting | express-rate-limit | 8.5.x |
| Variables entorno | dotenv | 17.4.x |

### Dependencias completas (package.json)
```json
"dependencies": {
  "bcryptjs": "^3.0.3",
  "better-sqlite3": "^11.7.0",
  "cors": "^2.8.5",
  "dotenv": "^17.4.2",
  "express": "^4.22.2",
  "express-rate-limit": "^8.5.2",
  "jsonwebtoken": "^9.0.3",
  "multer": "^2.1.1",
  "xlsx": "^0.18.5"
}
```

### Datos que carga el seed (`npm run seed` lee `Evidencias de GPC.xlsx`)
- 1,833 documentos (evidencias) con links de Drive y CENETEC
- 516 temas médicos
- 30 categorías (especialidades)
- 1 usuario admin
- 3 banners + 6 publicaciones de ejemplo

---

## 2. Estructura de archivos

```
CatalogoSalud/
├── server.js                 # Servidor Express (punto de entrada)
├── package.json              # Dependencias y scripts (start, seed)
├── Dockerfile                # Para deploy con Docker
├── .env.example              # Plantilla de variables de entorno
├── .gitignore                # Excluye node_modules, .env, database.sqlite
├── Evidencias de GPC.xlsx     # Datos fuente (se importa con seed)
├── README.md                 # Guía de deploy completa
├── INSTRUCCIONES_FREELANCER.md
├── CONTEXTO_SESION.md         # ESTE archivo
├── db/
│   ├── schema.sql            # 7 tablas
│   ├── seed.js               # Importa Excel → SQLite
│   └── database.sqlite       # BD generada (NO se sube a Git; se regenera con seed)
├── routes/
│   ├── auth.js               # Login, registro, cambio de contraseña, usuarios
│   ├── evidencias.js         # CRUD documentos + búsqueda + autosugerencias
│   ├── temas.js              # CRUD temas
│   ├── categorias.js         # CRUD categorías del inicio
│   ├── banners.js            # CRUD publicidad (con vigencia por fecha)
│   ├── publicaciones.js      # CRUD noticias
│   ├── reportes.js           # Reportes de usuarios
│   └── upload.js             # Carga masiva Excel
└── public/
    └── index.html            # TODO el frontend (SPA React, ~990 líneas)
```

---

## 3. Cómo correrlo localmente (tras el formateo)

```bash
# Requisitos: Node.js 18+ y Git

git clone https://github.com/EdwinMadera/CatalogoSalud.git
cd CatalogoSalud
git checkout claude/gracious-dijkstra-fna2cn   # rama con los cambios

npm install
npm run seed          # genera db/database.sqlite desde el Excel

node server.js        # en dev genera un JWT_SECRET temporal automáticamente
# abrir http://localhost:3000
```

### Scripts npm disponibles
| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor (`node server.js`) |
| `npm run seed` | Borra y regenera `db/database.sqlite` desde el Excel |

---

## 4. Variables de entorno (.env)

Copiar `.env.example` a `.env` y ajustar. El servidor carga `.env` automáticamente.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (def. 3000) | Puerto del servidor |
| `JWT_SECRET` | **Sí en producción** | Clave aleatoria 32+ chars. La inventas tú. |
| `NODE_ENV` | Recomendada | En `production` el server NO arranca sin `JWT_SECRET` |
| `CORS_ORIGIN` | No | Restringe CORS a orígenes (coma-separados). Si se omite, abierto |

**Generar un JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Ejemplo de `.env` para producción:
```
PORT=3000
NODE_ENV=production
JWT_SECRET=<pega-aquí-la-clave-generada-arriba>
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com
```

---

## 5. REFERENCIA COMPLETA DE LA API

Base URL: `/api`. Auth por header `Authorization: Bearer <token>`.
Niveles: **Público** (sin token) · **Auth** (usuario logueado) · **Admin** (rol admin).

### Autenticación — `/api/auth`
| Método | Ruta | Nivel | Body / params |
|---|---|---|---|
| POST | `/register` | Público (rate-limited) | `{nombre, email, password, especialidades[]}` |
| POST | `/login` | Público (rate-limited) | `{email, password}` |
| GET | `/me` | Auth | — |
| PUT | `/password` | Auth | `{actual, nueva}` |
| PUT | `/especialidades` | Auth | `{especialidades[]}` |
| GET | `/users` | Admin | — |
| PUT | `/users/:id/role` | Admin | `{role: "admin"\|"usuario"}` |

> Rate limiting: 20 intentos / 15 min por IP en login y registro.

### Evidencias (documentos) — `/api/evidencias`
| Método | Ruta | Nivel | Params / body |
|---|---|---|---|
| GET | `/` | Público | `?tema_id&tipo&curso&tronco&categoria_id&q&limit&offset` |
| GET | `/suggest` | Público | `?q` (autosugerencias, mín. 2 chars) |
| GET | `/tipos` | Público | — (tipos únicos con conteo) |
| POST | `/` | Admin | `{tema_id, nombre_archivo, tipo, cita_vancouver, acceso_directo, clasificacion}` |
| PUT | `/:id` | Admin | campos a editar |
| DELETE | `/:id` | Admin | — |

### Temas — `/api/temas`
| Método | Ruta | Nivel | Params / body |
|---|---|---|---|
| GET | `/` | Público | `?curso&tronco&q&estado&limit&offset` |
| GET | `/cursos` | Público | — (cursos únicos con conteo) |
| GET | `/troncos` | Público | — |
| GET | `/:id` | Público | detalle con evidencias + relacionados |
| POST | `/` | Admin | `{nombre, tronco, curso, estado}` |
| PUT | `/:id` | Admin | campos a editar |
| DELETE | `/:id` | Admin | — (borra evidencias en cascada) |

### Categorías — `/api/categorias`
| Método | Ruta | Nivel | Body |
|---|---|---|---|
| GET | `/` | Público | solo visibles |
| GET | `/all` | Admin | todas |
| POST | `/` | Admin | `{nombre, descripcion, color, orden, visible}` |
| PUT | `/:id` | Admin | campos |
| DELETE | `/:id` | Admin | — |

### Banners (publicidad) — `/api/banners`
| Método | Ruta | Nivel | Notas |
|---|---|---|---|
| GET | `/` | Público | `?posicion` — respeta vigencia `fecha_inicio`/`fecha_fin` |
| GET | `/all` | Admin | todos |
| POST | `/` | Admin | `{titulo, descripcion, imagen_url, enlace_url, posicion, activo, orden, fecha_inicio, fecha_fin}` |
| PUT | `/:id` | Admin | campos |
| DELETE | `/:id` | Admin | — |
> Posiciones: `header`, `resultados`, `detalle` (sidebar).

### Publicaciones (noticias) — `/api/publicaciones`
| Método | Ruta | Nivel | Notas |
|---|---|---|---|
| GET | `/` | Público | `?limit&categoria` |
| GET | `/all` | Admin | todas |
| POST | `/` | Admin | `{titulo, descripcion, imagen_url, categoria, enlace_url, fuente, fecha, destacado}` |
| PUT | `/:id` | Admin | campos |
| DELETE | `/:id` | Admin | — |

### Reportes de usuarios — `/api/reportes`
| Método | Ruta | Nivel | Body |
|---|---|---|---|
| POST | `/` | Auth | `{evidencia_id, categoria, mensaje}` |
| GET | `/` | Admin | `?estado` |
| GET | `/count` | Admin | pendientes |
| PUT | `/:id` | Admin | `{estado}` |
| DELETE | `/:id` | Admin | — |

### Carga masiva — `/api/upload`
| Método | Ruta | Nivel | Notas |
|---|---|---|---|
| POST | `/excel` | Admin | multipart `file` (.xlsx/.xls, máx 10 MB) |

### Sistema — `/api`
| Método | Ruta | Nivel | Notas |
|---|---|---|---|
| GET | `/health` | Público | `{status, uptime}` |
| GET | `/stats` | Admin | estadísticas globales |
| GET | `*` | Público | sirve el SPA (index.html) |

---

## 6. ESQUEMA DE BASE DE DATOS (7 tablas)

```sql
temas          (id, nombre, tronco, curso, estado)
evidencias     (id, tema_id→temas, categoria_id→categorias, numero, clasificacion,
                nombre_archivo, tipo, cita_vancouver, acceso_directo, url_fuente)
users          (id, nombre, email UNIQUE, password_hash, role, especialidades, created_at)
banners        (id, titulo, descripcion, imagen_url, enlace_url, posicion, activo,
                orden, fecha_inicio, fecha_fin)
publicaciones  (id, titulo, descripcion, imagen_url, categoria, enlace_url, fuente,
                fecha, destacado, activo)
reportes       (id, user_id→users, evidencia_id→evidencias, categoria, mensaje,
                estado, created_at)
categorias     (id, nombre, descripcion, color, orden, visible)
```
- `tipo` de evidencias: `GPC [GER]`, `GPC [GRR]`, `NOM`, `PRONAM`, `Lineamiento`, `SSa`.
- `role` de users: `admin` o `usuario`.
- `estado` de reportes: `pendiente`, `en revisión`, `resuelto`.

---

## 7. AUDITORÍA REALIZADA — hallazgos y correcciones (YA HECHAS ✅)

Se auditó todo el proyecto ejecutándolo de verdad. Estaba **funcional** pero le
faltaba endurecimiento de seguridad y tenía bugs. Todo lo siguiente **ya se corrigió**
y está en la rama `claude/gracious-dijkstra-fna2cn`.

### Seguridad
- `JWT_SECRET` obligatorio en producción (sin default hardcodeado); clave temporal
  aleatoria en desarrollo con advertencia.
- Rate limiting en login/registro (20 intentos / 15 min por IP).
- CORS configurable por dominio (`CORS_ORIGIN`).
- `/api/stats` ahora requiere token de administrador.
- Upload de Excel: límite de 10 MB + validación de tipo de archivo.
- `npm audit fix` (express → 4.22.2, qs → 6.15.2).
- Dockerfile sin secreto hardcodeado; `NODE_ENV=production`.

### Bugs
- Banners ahora respetan vigencia por `fecha_inicio`/`fecha_fin`.
- Carga masiva de Excel extrae los hipervínculos de Drive (antes se perdían).
- Rutas `/api` inexistentes devuelven 404 JSON (antes devolvían el HTML del SPA).
- El formulario de registro ahora recoge especialidades.

### Nuevas funciones
- Endpoint + modal "Mi cuenta" para cambiar contraseña (`PUT /api/auth/password`).
- Healthcheck `GET /api/health`.
- Manejador global de errores.
- Carga de `.env` vía dotenv + `.env.example`.

### Verificación
- 23 pruebas en vivo, todas en verde. El JSX del frontend compila sin errores.

### Commits en la rama `claude/gracious-dijkstra-fna2cn`
- `9d8f7ec` — Endurecer seguridad y corregir bugs detectados en auditoría
- `8750031` — Silenciar banner de dotenv en el log de arranque
- `0c1ed21` — Agregar documento de contexto de la sesión
- (+ commit de esta versión ampliada del contexto)

---

## 8. QUÉ FALTA TODAVÍA (pendientes)

### 🚀 Despliegue (lo más importante — NO está desplegado)
El código está listo pero no corre en ningún servidor público. Falta dominio, HTTPS,
proceso siempre activo y backups. Ver comandos concretos en la sección 9.

### 🔒 Seguridad abierta
- `xlsx` tiene una vulnerabilidad alta SIN parche en npm. Mitigada (solo admin,
  10 MB, validación de tipo). Para cerrarla, en el servidor con internet:
  `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- El "muro de registro" es cosmético: los links de documentos viajan en el JSON
  público antes de pedir login. Para protegerlos de verdad, mover los links a un
  endpoint que exija token.

### 🧩 Mejoras funcionales pendientes
- Recuperar contraseña olvidada (solo existe cambio estando logueado).
- Verificación de email al registrarse.
- Paginación en el panel admin de temas (corta a 80 registros).
- Editar especialidades desde "Mi cuenta" (backend lo soporta, falta la UI).

### 🛠️ Calidad
- No hay tests automatizados. Sin logging estructurado ni monitoreo.

---

## 9. CÓMO DESPLEGARLO (comandos concretos)

### Opción A — Railway / Render (fácil, ~$5 USD/mes)
1. Crear cuenta en https://railway.app o https://render.com
2. "New Project" → "Deploy from GitHub" → elegir `EdwinMadera/CatalogoSalud`
3. Elegir la rama `claude/gracious-dijkstra-fna2cn` (o mergearla a `main` primero)
4. Variables de entorno: `NODE_ENV=production`, `JWT_SECRET=<clave>`, `CORS_ORIGIN=<tu dominio>`
5. Build command: `npm install && npm run seed`
6. Start command: `node server.js`
7. Da un dominio automático; opcional conectar dominio propio.

### Opción B — VPS (DigitalOcean/Hetzner/Vultr, ~$4-6 USD/mes)
```bash
# En el servidor (Ubuntu):
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx
sudo npm install -g pm2

git clone https://github.com/EdwinMadera/CatalogoSalud.git /var/www/catalogo-salud
cd /var/www/catalogo-salud
git checkout claude/gracious-dijkstra-fna2cn
npm install --production
npm run seed

# .env
cat > .env <<EOF
PORT=3000
NODE_ENV=production
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
CORS_ORIGIN=https://tudominio.com
EOF

pm2 start server.js --name catalogo-salud
pm2 save && pm2 startup

# Nginx proxy reverso + SSL
sudo nano /etc/nginx/sites-available/catalogosalud   # (ver config en README.md)
sudo ln -s /etc/nginx/sites-available/catalogosalud /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Backup diario (crontab -e):
0 3 * * * cp /var/www/catalogo-salud/db/database.sqlite /var/backups/db-$(date +\%Y\%m\%d).sqlite
```

---

## 10. Tema en pausa: conexión con "GPC.ai"

Idea SIN empezar: conectar este catálogo con otra plataforma tuya llamada **GPC.ai**.
No se tocó código. Para retomarlo hay que definir:
- Qué es GPC.ai técnicamente (¿API REST? ¿base de datos? ¿es web?).
- Dirección de los datos (este catálogo lee de GPC.ai, al revés, o ambos).
- Cómo conectan (API HTTP + token, BD compartida, o login/SSO compartido).

---

## 11. Resumen de la conversación (timeline)

1. Pediste una auditoría completa: "¿Qué le falta y cómo funcionó?"
2. Se auditó todo ejecutándolo → funcionaba, con fallas de seguridad y bugs.
3. Pediste corregir todo → se corrigió y verificó (23 pruebas verdes).
4. Pediste revisar → se re-verificó todo y se pulió (dotenv silenciado).
5. Preguntaste "¿qué pasó?" / "¿qué le falta?" → se explicó estado y pendientes.
6. Aclaración: el proyecto NO está desplegado (solo corre en local/pruebas).
7. Preguntaste por conectar con GPC.ai → quedó en pausa (falta info técnica).
8. Mencionaste que vas a desconectar tu SSD "MED.AI" y formatear la computadora.
9. Pediste este documento de contexto con TODO para no batallar al volver.

---

## 12. Checklist para retomar tras formatear

- [ ] Instalar Node.js 18+ y Git
- [ ] `git clone` + `git checkout claude/gracious-dijkstra-fna2cn`
- [ ] `npm install && npm run seed && node server.js` → probar en localhost:3000
- [ ] Login admin (`admin@catalogosalud.com` / `admin123`) y cambiar contraseña
- [ ] Decidir: ¿abrir Pull Request de la rama a `main`?
- [ ] Decidir: ¿desplegar? (Railway/Render o VPS — sección 9)
- [ ] Cerrar vulnerabilidad de `xlsx` en el servidor (sección 8)
- [ ] Retomar GPC.ai si aplica (sección 10)

---

_Fin del documento de contexto. Todo el código está a salvo en GitHub._
