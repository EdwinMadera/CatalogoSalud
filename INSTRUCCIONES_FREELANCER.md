# INSTRUCCIONES PARA EL FREELANCER

## Qué es este proyecto

Es una plataforma web de consulta de documentos médicos oficiales mexicanos (GPC, NOM, PRONAM). Ya está **100% funcional**. Tu trabajo es:

1. Revisarlo
2. Corregir cualquier detalle que encuentres
3. Desplegarlo en un servidor con dominio y SSL

---

## Estado actual — YA FUNCIONA

| Lo que ya está hecho | Estado |
|---------------------|--------|
| Backend Node.js + Express + SQLite | ✅ Completo |
| Frontend React (SPA en un solo HTML) | ✅ Completo |
| 1,833 documentos GPC con links de Drive y CENETEC | ✅ Cargados |
| Sistema de login/registro con JWT | ✅ Funcional |
| Panel de administración (9 tabs) | ✅ Funcional |
| Sistema de reportes de usuarios | ✅ Funcional |
| Publicaciones/noticias con imágenes | ✅ Funcional |
| Sistema de publicidad/banners | ✅ Funcional |
| Categorías personalizables | ✅ Funcional |
| Carga masiva desde Excel | ✅ Funcional |
| Páginas legales (Privacidad, Términos, etc.) | ✅ Completo |
| Responsive (desktop, tablet, móvil) | ✅ Funcional |
| Animaciones sutiles | ✅ Funcional |
| Dockerfile | ✅ Incluido |

---

## Para probar localmente (en tu máquina)

```bash
cd "App Catalogo Salud"
npm install
npm run seed
npm start
# Abrir http://localhost:3000
```

Admin: `admin@catalogosalud.com` / `admin123`

---

## LO QUE NECESITO QUE HAGAS

### 1. Revisar que todo funcione correctamente
- [ ] Página de inicio carga con banner, publicaciones y categorías
- [ ] Buscar "diabetes" devuelve resultados
- [ ] Buscar "hipertension" (sin acento) devuelve resultados
- [ ] Filtros funcionan (tipo, tronco, especialidad)
- [ ] Clic en "Abrir" sin estar logueado → pide registro
- [ ] Registrar usuario nuevo → funciona
- [ ] Después de registrarse, el documento se abre
- [ ] Login con admin → Panel de administración funciona
- [ ] Los 9 tabs del admin funcionan (Resumen, Guías, Temas, Categorías, Carga Excel, Publicaciones, Publicidad, Usuarios, Reportes)
- [ ] Reportar un documento → aparece en Admin → Reportes
- [ ] Footer: los 4 links legales abren (Privacidad, Términos, Deslinde, Cookies)
- [ ] Responsive: se ve bien en móvil

### 2. Corregir lo que encuentres
Si encuentras bugs, corregirlos. Posibles cosas a revisar:
- Validaciones de formularios
- Manejo de errores
- Estilos que se vean mal en algún navegador
- Cualquier otro detalle

### 3. Desplegar en producción

Necesito que quede corriendo en un servidor con:
- **Dominio** (yo te doy el dominio o me ayudas a comprarlo)
- **HTTPS** (certificado SSL con Let's Encrypt)
- **Que no se caiga** (PM2 o similar para mantenerlo corriendo)
- **Backup automático** de la base de datos

#### Opción recomendada: VPS (DigitalOcean, Linode, Vultr)

**Paso a paso:**

```bash
# 1. Conectarse al servidor
ssh root@IP_DEL_SERVIDOR

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PM2 y Nginx
sudo npm install -g pm2
sudo apt install -y nginx

# 4. Subir el proyecto
git clone https://github.com/USUARIO/catalogo-salud.git /var/www/catalogo-salud
cd /var/www/catalogo-salud

# 5. Instalar y configurar
npm install --production
npm run seed

# 6. Configurar variables de entorno
echo 'PORT=3000' >> .env
echo 'JWT_SECRET=CAMBIAR-POR-CLAVE-SEGURA-LARGA' >> .env

# 7. Iniciar con PM2
pm2 start server.js --name catalogo-salud
pm2 save
pm2 startup

# 8. Configurar Nginx (proxy reverso)
sudo nano /etc/nginx/sites-available/catalogosalud
```

Contenido del archivo Nginx:
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

```bash
# 9. Activar sitio
sudo ln -s /etc/nginx/sites-available/catalogosalud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. SSL con Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# 11. Backup automático (cron diario a las 3am)
crontab -e
# Agregar:
0 3 * * * cp /var/www/catalogo-salud/db/database.sqlite /var/www/backups/db-$(date +\%Y\%m\%d).sqlite
```

### 4. Cambiar credenciales del admin
Después del deploy, cambiar la contraseña del admin. Se puede hacer:
- Creando un nuevo usuario desde la web
- Desde admin → Usuarios → hacerlo admin
- Eliminar el usuario por defecto

### 5. Entregarme
- URL del sitio funcionando con HTTPS
- Credenciales del servidor (SSH)
- Credenciales del admin actualizadas
- Confirmación de que el backup automático está configurado

---

## Estructura de archivos importantes

```
server.js              → El servidor (punto de entrada)
public/index.html      → TODO el frontend (React SPA en un solo archivo)
db/schema.sql          → Las 7 tablas de la base de datos
db/seed.js             → Script que importa el Excel a la BD
db/database.sqlite     → La base de datos (se genera con npm run seed)
routes/*.js            → Los 8 archivos de rutas del API
Evidencias de GPC.xlsx → El Excel con los 2,608 documentos médicos
Dockerfile             → Para deploy con Docker (alternativa)
```

## Stack

- Node.js 18 + Express 4
- SQLite (better-sqlite3) — NO necesita MySQL ni PostgreSQL
- React 18 (CDN, no build) + Tailwind CSS (CDN)
- JWT para autenticación
- bcrypt para contraseñas

## Contacto

Si tienes dudas sobre el proyecto, pregúntame. Todo el código está documentado en el README.md principal.
