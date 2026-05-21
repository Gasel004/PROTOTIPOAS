# 🌿 Sistema La Esperanza

**Plataforma de Gestión Agrícola** — Proyecto III

Sistema web que digitaliza la comercialización agrícola directa entre productores y compradores, con soporte para asociaciones de agricultores como entidades organizadoras.

---

## 🏗️ Arquitectura

```
sistema-la-esperanza/
├── frontend/          # React + Vite + Zustand
├── backend/           # Node.js + Express + Prisma
├── nginx/             # Proxy inverso
├── database/          # Schema SQL de referencia
└── docker-compose.yml # Orquestación
```

**Stack tecnológico:**

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Vite, React Router v6, Zustand, Axios |
| Backend | Node.js 20, Express, Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker, Docker Compose, Nginx |

---

## 🚀 Inicio rápido (Docker)

```bash
# 1. Clonar el repositorio
git clone https://github.com/usuario/sistema-la-esperanza.git
cd sistema-la-esperanza

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Levantar todos los servicios
docker compose up --build -d

# 4. Aplicar migraciones y seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed

# 5. Acceder al sistema
# Frontend: http://localhost
# API:      http://localhost:3000/api/v1
```

---

## 💻 Desarrollo local (sin Docker)

### Requisitos
- Node.js 20 LTS
- PostgreSQL 16
- Git

### Backend

```bash
cd backend
npm install
cp ../.env.example .env   # configurar DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev --name init
npx prisma db seed
npm run dev               # http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
echo 'VITE_API_URL=http://localhost:3000/api/v1' > .env.local
npm run dev               # http://localhost:5173
```

---

## 📋 Módulos del sistema

| Módulo | Descripción |
|--------|-------------|
| 🔐 Autenticación | Registro y login con JWT por rol |
| 🌾 Publicaciones | Ofertas de venta de productores |
| 🤝 Negociaciones | Canal privado productor ↔ comprador |
| 💬 Mensajería | Chat interno por negociación |
| 📦 Entregas | Confirmación doble de entregas |
| 💳 Pagos | Registro y seguimiento de pagos |
| 🔔 Notificaciones | Alertas automáticas del sistema |

---

## 👥 Actores del sistema

- **Productor** — publica ofertas, gestiona negociaciones y entregas
- **Comprador** — explora publicaciones, inicia y gestiona negociaciones
- **Asociación** — administra miembros productores y supervisa actividad

---

## 📁 Variables de entorno requeridas

Ver `.env.example` para la lista completa. Las principales:

```env
POSTGRES_DB=laesperanza_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=tu_password_seguro
DATABASE_URL=postgresql://admin:password@db:5432/laesperanza_db
JWT_SECRET=clave_minimo_32_caracteres
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost
```

---

## 🧪 Pruebas

```bash
# Pruebas unitarias e integración (backend)
cd backend
npm test

# Con cobertura
npm test -- --coverage

# Pruebas de API
# Importar colección Postman desde /docs/postman/
```

---

## 📚 Documentación

La documentación completa del proyecto se encuentra en `/docs/`:

| Documento | Descripción |
|-----------|-------------|
| Diccionario de Datos | Estructura de las 12 tablas |
| Documentación API REST | 35+ endpoints documentados |
| Guía de Instalación | Instalación con Docker |
| Guía de Desarrollo | Configuración del entorno local |
| Gitflow | Control de versiones |
| Plan de Pruebas | Estrategia de QA |
| Casos de Prueba | 37 casos documentados |
| Release Notes v1.0.0 | Novedades de la versión |
| Matriz de Trazabilidad | RF ↔ Implementación ↔ Pruebas |
| Historial de Tareas | Registro completo del proyecto |

---

## 🔀 Gitflow

```
main        ← producción (solo merges de release/* y hotfix/*)
develop     ← integración de features
feature/*   ← nuevas funcionalidades
fix/*       ← correcciones en desarrollo
release/*   ← preparación de versión
hotfix/*    ← correcciones urgentes en producción
```

---

## 📦 Versión actual

**v1.0.0** — Release inicial · Mayo 2025

---

## 📄 Licencia

Proyecto académico — Ingeniería en Sistemas de Información · Proyecto III
