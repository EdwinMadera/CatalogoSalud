# Contexto de sesión — Catálogo de Salud

> Documento de traspaso generado el **2026-06-13**.
> Guarda esto para retomar el proyecto tras formatear la computadora.
> Copia de seguridad también en GitHub (rama `claude/gracious-dijkstra-fna2cn`).

---

## 1. Qué es el proyecto

**Catálogo de Salud** — plataforma web para consultar documentos médicos oficiales
mexicanos: Guías de Práctica Clínica (GPC), Normas Oficiales Mexicanas (NOM),
PRONAM, lineamientos y documentos del Sistema Nacional de Salud.

- **Repo GitHub:** `EdwinMadera/CatalogoSalud`
- **Rama de trabajo:** `claude/gracious-dijkstra-fna2cn` (todos los cambios están aquí)
- **Rama principal:** `main`

### Stack
| Componente | Tecnología |
|---|---|
| Backend | Node.js 18+ + Express 4.22 |
| Base de datos | SQLite (better-sqlite3) |
| Frontend | React 18 (por CDN, sin build) + Tailwind CSS (CDN), un solo `public/index.html` |
| Auth | JWT (7 días) + bcrypt |
| Datos fuente | `Evidencias de GPC.xlsx` → se importa con `npm run seed` |

### Datos que carga el seed
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
├── package.json              # Dependencias y scripts
├── Dockerfile                # Para deploy con Docker
├── .env.example              # Plantilla de variables de entorno (NUEVO)
├── Evidencias de GPC.xlsx     # Datos fuente
├── db/
│   ├── schema.sql            # 7 tablas
│   ├── seed.js               # Importa Excel → SQLite
│   └── database.sqlite       # BD generada (NO se sube a Git)
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
# Requisitos: Node.js 18+ y npm
git clone https://github.com/EdwinMadera/CatalogoSalud.git
cd CatalogoSalud
git checkout claude/gracious-dijkstra-fna2cn   # rama con los cambios

npm install
npm run seed          # genera db/database.sqlite desde el Excel

# arrancar (en dev basta con esto; genera un JWT_SECRET temporal):
node server.js
# abrir http://localhost:3000
```

### Credenciales admin por defecto
```
admin@catalogosalud.com  /  admin123
```
**CAMBIAR en producción** (hay botón "Mi cuenta" en la web para cambiar contraseña).

---

## 4. Variables de entorno (.env)

Copiar `.env.example` a `.env`:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (def. 3000) | Puerto |
| `JWT_SECRET` | **Sí en producción** | Clave aleatoria 32+ chars. Genera: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | Recomendada | En `production` el server NO arranca sin `JWT_SECRET` |
| `CORS_ORIGIN` | No | Restringe CORS a estos orígenes (coma-separados). Si se omite, abierto |

---

## 5. Auditoría realizada — hallazgos y correcciones

Se auditó todo el proyecto ejecutándolo de verdad. Estaba **funcional** pero le
faltaba endurecimiento de seguridad y tenía bugs. **Todo lo siguiente YA se corrigió**
y está en la rama `claude/gracious-dijkstra-fna2cn`:

### Seguridad (corregido ✅)
- `JWT_SECRET` obligatorio en producción — sin default hardcodeado; clave temporal
  aleatoria en desarrollo con advertencia.
- Rate limiting en login/registro (20 intentos / 15 min por IP).
- CORS configurable por dominio (`CORS_ORIGIN`).
- `/api/stats` ahora requiere token de administrador.
- Upload de Excel: límite de 10 MB + validación de tipo de archivo.
- `npm audit fix` (express → 4.22.2, qs → 6.15.2).
- Dockerfile sin secreto hardcodeado; `NODE_ENV=production`.

### Bugs (corregido ✅)
- Banners ahora respetan vigencia por `fecha_inicio`/`fecha_fin`.
- Carga masiva de Excel extrae los hipervínculos de Drive (antes se perdían).
- Rutas `/api` inexistentes devuelven 404 JSON (antes devolvían el HTML del SPA).
- El formulario de registro ahora recoge especialidades (antes se ignoraban).

### Nuevas funciones (añadido ✅)
- Endpoint + modal "Mi cuenta" para cambiar contraseña (`PUT /api/auth/password`).
- Healthcheck `GET /api/health`.
- Manejador global de errores.
- Carga de `.env` vía dotenv + `.env.example` documentado.

### Verificación
- 23 pruebas en vivo, todas en verde (búsqueda con/sin acento, auth, CRUD, roles,
  reportes, rate limiting, filtrado de banners, upload).
- El JSX del frontend compila sin errores con Babel.

### Commits en la rama
- `9d8f7ec` — Endurecer seguridad y corregir bugs detectados en auditoría
- `8750031` — Silenciar banner de dotenv en el log de arranque

---

## 6. Qué le FALTA todavía (pendientes)

### 🚀 Despliegue (lo más importante — NO está desplegado)
El código está listo pero no corre en ningún servidor público. Falta:
- Dominio + HTTPS (Let's Encrypt / certbot)
- PM2 (para que no se caiga y reinicie solo)
- Backups automáticos de `database.sqlite` (cron diario)
- Configurar `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN` reales
- Opciones: **Railway/Render** (~$5/mes, fácil) o **VPS** (DigitalOcean/Hetzner/Vultr)
- Instrucciones paso a paso ya están en `README.md` e `INSTRUCCIONES_FREELANCER.md`

### 🔒 Seguridad abierta
- `xlsx` tiene una vulnerabilidad alta SIN parche en npm. Mitigada (solo admin,
  10 MB, validación de tipo). Para cerrarla, en el servidor (con acceso a internet):
  `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- El "muro de registro" es cosmético: los links de documentos viajan en el JSON
  público antes de pedir login. Si se quiere proteger de verdad, mover los links
  a un endpoint que exija token.

### 🧩 Mejoras funcionales pendientes
- Recuperar contraseña olvidada (solo existe cambio estando logueado).
- Verificación de email al registrarse.
- Paginación en el panel admin de temas (corta a 80 registros).
- Editar especialidades desde "Mi cuenta" (backend lo soporta, falta la UI).

### 🛠️ Calidad
- No hay tests automatizados.
- Sin logging estructurado ni monitoreo.

---

## 7. Tema en pausa: conexión con "GPC.ai"

Quedó una idea SIN empezar: conectar este catálogo con otra plataforma tuya
llamada **GPC.ai**. Para retomarlo hay que definir:
- Qué es GPC.ai técnicamente (¿tiene API REST? ¿base de datos? ¿es web?).
- En qué dirección van los datos (este catálogo lee de GPC.ai, o al revés, o ambos).
- Cómo conectan (API HTTP + token, BD compartida, o login/SSO compartido).

No se tocó nada de código para esto todavía.

---

## 8. Cómo retomar tras el formateo

1. Instalar Node.js 18+ y Git.
2. `git clone` del repo y `git checkout claude/gracious-dijkstra-fna2cn`.
3. `npm install && npm run seed && node server.js`.
4. Decidir: ¿abrir Pull Request de la rama a `main`? ¿desplegar? ¿retomar GPC.ai?

---

_Fin del documento de contexto._
