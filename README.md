# 道 Tao Ahorro

Sistema personal de metas de ahorro · **TaoTech**

Frontend en **GitHub Pages**, backend serverless en **Vercel**, base de datos en **MongoDB Atlas**, notificaciones por **Gmail**, recordatorios programados con **GitHub Actions**.

**Costo total: $0** — todo dentro de los free tiers.

---

## ✨ Qué hace

- 🎯 Múltiples metas en paralelo (Viaje, PC, Fondo de emergencia, etc.)
- 💰 Registro de depósitos por bolsillo (Nu, Nequi, Daviplata, Efectivo)
- 📊 Gráfica de cadencia + historial de movimientos
- 🔐 Acceso con PIN (sólo tú)
- ✉️ **Notificaciones por correo**:
  - Confirmación cada vez que registras un depósito
  - Hitos automáticos (25%, 50%, 75%, 100%)
  - Alerta si no ahorras en 7 días
  - Resumen semanal cada domingo

---

## 🏗️ Arquitectura

```
GitHub Pages ──► Vercel Functions ──► MongoDB Atlas
   (HTML/JS)        (Node.js API)        (Free 512MB)
                          │
                          ├─► Gmail SMTP (correos)
                          ▲
GitHub Actions ───────────┘
   (cron diario/semanal)
```

---

## 🚀 Despliegue paso a paso

### 1. MongoDB Atlas (5 min)

1. Entra a [cloud.mongodb.com](https://cloud.mongodb.com) y crea cuenta gratis.
2. **Build a Database → Free (M0)** → elige la región más cercana (São Paulo o N. Virginia).
3. En **Database Access**, crea un usuario con password (anótalos).
4. En **Network Access**, agrega `0.0.0.0/0` (acceso desde cualquier IP — necesario porque Vercel cambia IPs).
5. En **Database → Connect → Drivers**, copia la **connection string**. Se ve así:
   ```
   mongodb+srv://brayan:TU_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Gmail App Password (3 min)

1. Activa la **verificación en dos pasos** en [myaccount.google.com/security](https://myaccount.google.com/security) si no la tienes.
2. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Crea una nueva contraseña para "Tao Ahorro". Copia el código de 16 caracteres (lo verás solo una vez).

### 3. Generar el hash de tu PIN (1 min)

En tu máquina, dentro del repo clonado:

```bash
npm install
node scripts/hash-pin.js 1234   # cambia 1234 por TU PIN
```

Copia el hash que sale (empieza con `$2a$10$...`).

### 4. Desplegar el backend en Vercel (5 min)

1. Sube este repo a tu GitHub (público o privado).
2. Entra a [vercel.com](https://vercel.com) y haz login con tu cuenta de GitHub.
3. **Add New → Project → Import** tu repo `tao-ahorro`.
4. En **Environment Variables** agrega TODAS estas:

   | Variable | Valor |
   |---|---|
   | `MONGODB_URI` | tu connection string de Atlas |
   | `MONGODB_DB` | `tao_ahorro` |
   | `PIN_HASH` | el hash del paso 3 |
   | `JWT_SECRET` | cualquier string aleatorio largo (>32 chars) |
   | `GMAIL_USER` | tu correo Gmail |
   | `GMAIL_APP_PASSWORD` | el código de 16 caracteres del paso 2 |
   | `EMAIL_DESTINO` | tu correo Gmail (donde llegan las notificaciones) |
   | `CRON_SECRET` | otro string aleatorio largo |
   | `ALLOWED_ORIGIN` | `https://TU_USUARIO_GITHUB.github.io` |
   | `DIAS_ALERTA_INACTIVIDAD` | `7` |

5. **Deploy**. Cuando termine, copia tu URL (algo como `https://tao-ahorro-xxx.vercel.app`).

### 5. Conectar el frontend con la API (1 min)

Abre `public/index.html` y busca esta línea (cerca del inicio del script):

```js
: 'https://TU-PROYECTO.vercel.app/api'; // <-- CAMBIAR DESPUÉS DE DESPLEGAR EN VERCEL
```

Reemplaza `TU-PROYECTO.vercel.app` por tu URL real de Vercel. Commit + push.

### 6. Activar GitHub Pages (2 min)

1. En tu repo en GitHub → **Settings → Pages**.
2. **Source: GitHub Actions** (no la opción de branch).
3. El workflow `deploy-pages.yml` se ejecutará automáticamente con cada push a `main`.
4. Tu sitio estará en `https://TU_USUARIO.github.io/tao-ahorro/`.

### 7. Activar los recordatorios automáticos (2 min)

En tu repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|---|---|
| `API_URL` | `https://TU-PROYECTO.vercel.app/api` |
| `CRON_SECRET` | el mismo valor que pusiste en Vercel |

Los recordatorios ahora correrán solos: chequeo diario a las 8pm Colombia + resumen semanal los domingos a las 7pm.

Para probar manualmente: **Actions → Recordatorios de Ahorro → Run workflow**.

---

## 🛠️ Desarrollo local

```bash
npm install
npm install -g vercel
cp .env.example .env.local      # llena los valores
vercel dev                       # arranca el API en localhost:3000
```

Y abre `public/index.html` directamente en el navegador, o sirve la carpeta con cualquier servidor estático.

---

## 📐 Estructura

```
tao-ahorro/
├── public/
│   └── index.html              ← Frontend (React CDN + Tailwind)
├── api/
│   ├── _lib/
│   │   ├── db.js               ← Conexión Mongo + JWT + CORS
│   │   └── mailer.js           ← Plantillas y envío de correo
│   ├── auth.js                 ← POST /api/auth  → login con PIN
│   ├── metas.js                ← CRUD de metas
│   ├── depositos.js            ← Registrar depósitos + correos
│   └── check-reminders.js      ← Llamado por GitHub Actions
├── scripts/
│   └── hash-pin.js             ← Utilidad para hashear el PIN
├── .github/workflows/
│   ├── recordatorios.yml       ← Cron de recordatorios
│   └── deploy-pages.yml        ← Deploy automático del frontend
├── package.json
├── vercel.json
└── .env.example
```

---

## 🔒 Notas de seguridad

- El PIN nunca se transmite en claro: se compara con `bcrypt` en el servidor.
- El token JWT vive solo en `sessionStorage` (se borra al cerrar pestaña).
- Las credenciales (Mongo, Gmail) viven en env vars de Vercel, nunca en el repo.
- CORS está restringido a tu dominio de GitHub Pages.

---

> *"Quien sabe ahorrar conoce el camino del agua: gota a gota labra la piedra."*

— TaoTech · 道
