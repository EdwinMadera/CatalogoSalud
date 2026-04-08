# Catálogo de Salud — Centro de Información Médica

Plataforma web para consulta de Guías de Práctica Clínica (GPC), Normas Oficiales Mexicanas (NOM), PRONAM, lineamientos y documentos oficiales del Sistema Nacional de Salud de México.

---

## Requisitos del servidor

- **Node.js 18+** (verificar con `node -v`)
- **npm 9+** (verificar con `npm -v`)
- **Sistema operativo:** Linux (Ubuntu/Debian recomendado), macOS, o Windows
- **RAM mínima:** 512 MB
- **Disco:** 200 MB libres
- **Puerto:** 3000 (o el que configures)

---

## INSTRUCCIONES DE DEPLOY COMPLETAS

### Paso 1: Subir los archivos al servidor

Subir TODO el contenido de esta carpeta al servidor. Se puede hacer por:

**Opción A — Git (recomendado):**
```bash
# En tu máquina local, inicializar repo si no existe
cd "App Catalogo Salud"
git init
git add -A
git commit -m "Versión inicial"
git remote add origin https://github.com/TU_USUARIO/catalogo-salud.git
git push -u origin main
```

```bash
# En el servidor
git clone https://github.com/TU_USUARIO/catalogo-salud.git
cd catalogo-salud
```

**Opción B — FTP/SFTP:**
Subir toda la carpeta por FileZilla o similar a `/home/usuario/catalogo-salud/`

**Opción C — SCP desde terminal:**
```bash
scp -r "App Catalogo Salud/" usuario@IP_DEL_SERVIDOR:/home/usuario/catalogo-salud/
```

### Paso 2: Instalar dependencias

```bash
cd /home/usuario/catalogo-salud
npm install --production
```

Esto instala: express, better-sqlite3, bcryptjs, jsonwebtoken, multer, xlsx, cors.

### Paso 3: Poblar la base de datos

```bash
npm run seed
```

Esto lee el archivo `Evidencias de GPC.xlsx` y crea la base de datos con:
- 1,833 documentos GPC/NOM con links de Drive y CENETEC
- 516 temas médicos
- 30 categorías
- 1 usuario administrador
- 3 banners de ejemplo
- 6 publicaciones de ejemplo

### Paso 4: Configurar variables de entorno

Crear archivo `.env` o exportar variables:

```bash
export PORT=3000
export JWT_SECRET="CAMBIAR-POR-UNA-CLAVE-SEGURA-DE-AL-MENOS-32-CARACTERES"
```

**IMPORTANTE:** El JWT_SECRET debe ser una cadena larga y aleatoria. Ejemplo:
```bash
export JWT_SECRET="k8Xp2mN9qR4tV7wZ0bD3fG6hJ1lO5sU8xA"
```

### Paso 5: Probar que funciona

```bash
npm start
```

Abrir en el navegador: `http://IP_DEL_SERVIDOR:3000`

Debería mostrar la página de inicio con el buscador, banner y publicaciones.

### Paso 6: Mantener el servidor corriendo (PM2)

Para que el servidor no se caiga al cerrar la terminal:

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar la aplicación
PORT=3000 JWT_SECRET="tu-clave-segura" pm2 start server.js --name catalogo-salud

# Guardar la configuración para que se reinicie automáticamente
pm2 save
pm2 startup
```

Comandos útiles de PM2:
```bash
pm2 status                  # Ver si está corriendo
pm2 logs catalogo-salud     # Ver logs en tiempo real
pm2 restart catalogo-salud  # Reiniciar
pm2 stop catalogo-salud     # Detener
```

### Paso 7: Configurar dominio y SSL (HTTPS)

**7a. Instalar Nginx como proxy reverso:**
```bash
sudo apt update
sudo apt install nginx
```

**7b. Crear configuración de Nginx:**
```bash
sudo nano /etc/nginx/sites-available/catalogosalud
```

Pegar este contenido (cambiar `tudominio.com` por tu dominio real):
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }
}
```

**7c. Activar el sitio:**
```bash
sudo ln -s /etc/nginx/sites-available/catalogosalud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**7d. Instalar certificado SSL gratuito (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

Certbot configura HTTPS automáticamente y renueva el certificado cada 90 días.

### Paso 8: Verificar todo

- [ ] Abrir `https://tudominio.com` — debe cargar la página de inicio
- [ ] Buscar "diabetes" — debe mostrar resultados
- [ ] Clic en "Abrir" de un documento — debe pedir registro
- [ ] Registrar usuario nuevo — debe funcionar
- [ ] Iniciar sesión como admin (`admin@catalogosalud.com` / `admin123`)
- [ ] Verificar panel de administración (9 tabs)
- [ ] Verificar footer con links legales (Aviso de Privacidad, etc.)

---

## DESPUÉS DEL DEPLOY — Tareas del administrador

### Cambiar credenciales del admin
1. Iniciar sesión con `admin@catalogosalud.com` / `admin123`
2. Crear un nuevo usuario con tu email real
3. Desde Admin → Usuarios → hacer admin al nuevo usuario
4. Cerrar sesión y entrar con el nuevo usuario
5. (Opcional) Eliminar el usuario admin por defecto desde la BD

### Personalizar el sitio
Desde el panel de administración puedes:

- **Categorías:** Agregar, editar, ocultar, reordenar las categorías del inicio
- **Publicaciones:** Crear noticias sobre nuevas GPC, ENARM, NOMs con imágenes
- **Banners:** Crear anuncios con imagen para promocionar cursos, apps, etc.
- **Guías:** Buscar y editar documentos GPC (cambiar enlaces, tipo, categoría)

### Hacer backup de la base de datos
```bash
# Copiar la base de datos a un lugar seguro
cp /home/usuario/catalogo-salud/db/database.sqlite /home/usuario/backups/database-$(date +%Y%m%d).sqlite
```

Recomendación: hacer backup diario con cron:
```bash
crontab -e
# Agregar esta línea:
0 3 * * * cp /home/usuario/catalogo-salud/db/database.sqlite /home/usuario/backups/database-$(date +\%Y\%m\%d).sqlite
```

---

## OPCIÓN ALTERNATIVA: Deploy en Railway (más fácil, sin servidor propio)

Si no quieres manejar un servidor, Railway es la opción más simple:

1. Crear cuenta en https://railway.app
2. Subir el código a GitHub
3. En Railway: "New Project" → "Deploy from GitHub" → seleccionar el repo
4. Configurar variables de entorno:
   - `PORT` = `3000`
   - `JWT_SECRET` = `tu-clave-segura`
5. En Settings → Build Command: `npm install && npm run seed`
6. En Settings → Start Command: `node server.js`
7. Railway te da un dominio automático tipo `catalogo-salud.up.railway.app`
8. (Opcional) Conectar tu dominio propio

**Costo:** Railway tiene plan gratuito limitado. Plan básico ~$5 USD/mes.

---

## OPCIÓN ALTERNATIVA: Deploy con Docker

Si el servidor tiene Docker instalado:

```bash
cd /home/usuario/catalogo-salud

# Construir imagen
docker build -t catalogo-salud .

# Correr contenedor
docker run -d \
  --name catalogo-salud \
  -p 3000:3000 \
  -e JWT_SECRET="tu-clave-segura" \
  -v $(pwd)/db:/app/db \
  --restart unless-stopped \
  catalogo-salud
```

El volumen `-v` asegura que la base de datos persista fuera del contenedor.

---

## Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Backend | Node.js + Express | 18+ / 4.21 |
| Base de datos | SQLite | via better-sqlite3 |
| Frontend | React (CDN) + Tailwind CSS | 18 / 3.4 |
| Autenticación | JWT + bcrypt | jsonwebtoken 9 |
| Upload | Multer | 2.1 |
| Excel | SheetJS (xlsx) | 0.18 |

## Estructura del proyecto

```
catalogo-salud/
├── server.js                 # Servidor Express (punto de entrada)
├── package.json              # Dependencias y scripts npm
├── Dockerfile                # Para deploy con Docker
├── .gitignore                # Archivos excluidos de Git
├── Evidencias de GPC.xlsx    # Datos fuente (2,608 evidencias)
├── db/
│   ├── schema.sql            # Esquema SQL (7 tablas)
│   ├── seed.js               # Importa Excel → SQLite
│   └── database.sqlite       # BD generada (NO subir a Git)
├── routes/
│   ├── auth.js               # Login, registro, gestión usuarios
│   ├── evidencias.js         # CRUD documentos GPC
│   ├── temas.js              # CRUD temas/clasificaciones
│   ├── categorias.js         # CRUD categorías del inicio
│   ├── banners.js            # CRUD publicidad
│   ├── publicaciones.js      # CRUD noticias
│   ├── reportes.js           # Reportes de usuarios
│   └── upload.js             # Carga masiva Excel
├── public/
│   └── index.html            # Frontend completo (SPA React)
└── uploads/                  # Temporal para archivos subidos
```

## Base de datos — 7 tablas

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| evidencias | 1,833 | Documentos GPC, NOM, PRONAM (principal) |
| temas | 516 | Clasificaciones médicas |
| categorias | 30 | Categorías personalizables del inicio |
| users | 1 | Usuarios (admin por defecto) |
| banners | 3 | Anuncios publicitarios |
| publicaciones | 6 | Noticias de ejemplo |
| reportes | 0 | Reportes de usuarios |

## API — 30+ Endpoints

### Públicos
- `GET /api/evidencias?q=&tipo=&curso=&categoria_id=&limit=&offset=` — Buscar documentos
- `GET /api/temas`, `/api/temas/cursos`, `/api/temas/troncos` — Clasificaciones
- `GET /api/categorias` — Categorías del inicio
- `GET /api/banners`, `/api/publicaciones` — Contenido público
- `GET /api/stats` — Estadísticas
- `POST /api/auth/register`, `/api/auth/login` — Autenticación

### Con login
- `POST /api/reportes` — Enviar reporte

### Solo admin
- CRUD completo para: evidencias, temas, categorias, banners, publicaciones, reportes
- `GET /api/auth/users` — Listar usuarios
- `PUT /api/auth/users/:id/role` — Cambiar roles
- `POST /api/upload/excel` — Carga masiva

## Credenciales por defecto

```
Admin:     admin@catalogosalud.com / admin123
```

**CAMBIAR EN PRODUCCIÓN.**

## Checklist de seguridad para producción

- [ ] Cambiar contraseña del admin
- [ ] Configurar JWT_SECRET con clave segura (32+ caracteres)
- [ ] HTTPS con certificado SSL (Let's Encrypt gratuito)
- [ ] Configurar CORS solo para tu dominio
- [ ] Backup diario de database.sqlite
- [ ] Rate limiting (opcional, recomendado)
- [ ] Firewall: solo permitir puertos 80, 443, 22

## Licencia

Proyecto privado. Los documentos GPC, NOM y lineamientos enlazados son propiedad de sus instituciones emisoras (SSa, IMSS, ISSSTE, CENETEC). Este catálogo facilita su consulta con fines educativos conforme a la Ley General de Transparencia y Acceso a la Información Pública.
