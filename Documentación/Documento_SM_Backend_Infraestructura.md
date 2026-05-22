# Documento del Scrum Master — Sistema "La Esperanza"

## Rol en el equipo Scrum

**Rol:** Scrum Master  
**Responsable de:** Backend (Node.js/Express), Base de Datos (PostgreSQL + Prisma), Infraestructura (Docker), Pruebas automatizadas, Documentación técnica  
**Equipo:** 2 personas (PO + SM)  
**Sprint duration:** 2 semanas  

---

## 1. Proceso Scrum para Equipo de 2

### 1.1 Ceremonias Adaptadas

| Ceremonia | Frecuencia | Duración | Cómo lo hicimos |
|---|---|---|---|
| Sprint Planning | Cada 2 semanas | 1 hora | Definíamos 3-4 US por sprint, priorizadas por el PO |
| Daily Standup | Diario | 10 min | Síncrono, 3 preguntas: ¿qué hice ayer? ¿qué haré hoy? ¿bloqueos? |
| Sprint Review | Fin de sprint | 30 min | Demo de funcionalidades completadas al PO/ stakeholders |
| Sprint Retrospective | Fin de sprint | 30 min | Formato "Start-Stop-Continue" |

### 1.2 Artefactos Scrum
| Artefacto | Descripción |
|---|---|
| Product Backlog | ~25 user stories priorizadas (Documento_PO_Frontend_Autenticacion.md) |
| Sprint Backlog | 3-4 US seleccionadas por sprint |
| Definition of Done | Código mergeado a develop, pruebas pasando, desplegado en Docker |

### 1.3 Definición de Done (DoD)
- [ ] Código escrito siguiendo la arquitectura de capas
- [ ] Pruebas unitarias/de integración pasando (Jest + Supertest)
- [ ] Prisma schema actualizado si hay cambios de BD
- [ ] Endpoint documentado en la API
- [ ] Seed actualizado si hay nuevos modelos
- [ ] Docker build exitoso
- [ ] Merge a develop sin conflictos

---

## 2. Backend — Arquitectura

### 2.1 Stack Tecnológico
| Tecnología | Versión | Justificación |
|---|---|---|
| Node.js | 20 (LTS) | Runtime estable, soporte prolongado, async/await nativo |
| Express | 4.x | Framework minimalista, flexible, middleware-based |
| Prisma | 5.x | ORM moderno, type-safe, migraciones, seed integrado |
| PostgreSQL | 16 Alpine | Base de datos relacional robusta, ideal para datos transaccionales |
| JWT (jsonwebtoken) | 9.x | Autenticación stateless, sin sesiones en servidor |
| bcryptjs | 2.x | Hashing de contraseñas, implementación JS pura |
| Morgan | 1.x | Logging de requests HTTP |

### 2.2 Arquitectura en Capas

```
Request → Routes → Middleware (auth) → Controllers → Services → Prisma → PostgreSQL
                                                         ↓
                                                    Respuesta JSON
```

**Principios:**
- **Routes** definen solo endpoints y qué middleware aplicar
- **Controllers** reciben req/res, llaman servicios, devuelven respuestas
- **Services** contienen toda la lógica de negocio
- **Middleware** son filtros reutilizables (auth, validación)
- **Prisma** es la capa de persistencia (no hay SQL directo)

### 2.3 Estructura de Archivos
```
backend/
├── prisma/
│   ├── schema.prisma          # Modelos, enums, relaciones, índices
│   └── seed.js                # Datos de prueba
├── src/
│   ├── index.js               # Entry point: Express app, CORS, routes
│   ├── middleware/
│   │   └── auth.js            # verificarToken, soloRoles
│   ├── services/
│   │   └── auth.service.js    # register, login, me
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── publicaciones.controller.js
│   │   ├── negociaciones.controller.js
│   │   ├── mensajes.controller.js
│   │   ├── entregas.controller.js
│   │   ├── pagos.controller.js
│   │   └── notificaciones.controller.js
│   └── routes/
│       ├── auth.routes.js
│       ├── productores.routes.js
│       ├── compradores.routes.js
│       ├── asociaciones.routes.js
│       ├── productos.routes.js
│       ├── publicaciones.routes.js
│       ├── negociaciones.routes.js
│       ├── entregas.routes.js
│       ├── pagos.routes.js
│       └── notificaciones.routes.js
├── tests/                     # Suites de pruebas
├── Dockerfile
└── package.json
```

---

## 3. Base de Datos — Diseño

### 3.1 Modelo Entidad-Relación (12 tablas)

```
Usuario (1) ──── (0..1) Productor
Usuario (1) ──── (0..1) Comprador
Usuario (1) ──── (0..1) Asociacion
Productor (*) ── (0..1) Asociacion
Productor (1) ──── (*) Publicacion
Producto (1) ──── (*) Publicacion
Publicacion (1) ── (*) Negociacion
Comprador (1) ──── (*) Negociacion
Productor (1) ──── (*) Negociacion
Negociacion (1) ── (1)  Entrega
Entrega (1) ────── (*) ConfirmacionEntrega
Usuario (1) ────── (*) ConfirmacionEntrega
Negociacion (1) ── (*) Pago
Usuario (1) ────── (*) Pago (registrado_por)
Negociacion (1) ── (*) Mensaje
Usuario (1) ────── (*) Mensaje (remitente)
Usuario (1) ────── (*) Notificacion
```

### 3.2 Enums del Dominio
```prisma
enum Rol { productor comprador asociacion }

enum EstadoPublicacion { activa pausada cerrada vencida }

enum EstadoNegociacion { pendiente en_proceso aceptada rechazada completada cancelada }

enum EstadoEntrega { pendiente en_transito entregado con_problema }

enum EstadoPago { pendiente completado fallido reembolsado }
```

### 3.3 Decisiones de Diseño

| Decisión | Justificación |
|---|---|
| Tablas separadas por rol (Productor, Comprador, Asociacion) | Cada rol tiene atributos distintos (DPI, NIT, hectáreas, etc.) |
| `@@map` a nombres en español | Coherencia con el dominio del negocio guatemalteco |
| Soft delete con `activo` booleano | Nunca perdemos datos, fácil recuperación |
| Índices en campos de búsqueda (`departamento`, `municipio`, `producto_id`) | Optimización de consultas con filtros |
| Unique constraint en `ConfirmacionEntrega(entrega_id, usuario_id)` | Un usuario solo puede confirmar una vez por entrega |
| `calificacion` en perfiles | Preparado para futura funcionalidad de reputación |

### 3.4 Seed Data
- 3 usuarios de prueba (1 por rol) con contraseña `Admin1234!`
- 12 productos en 5 categorías (Granos básicos, Verduras, Tubérculos, Frutas, Hortalizas)
- Perfiles completos con ubicación en departamentos de Guatemala

---

## 4. API REST — 35+ Endpoints

### 4.1 Autenticación
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | Registrar nuevo usuario |
| POST | `/api/auth/login` | No | Iniciar sesión |
| GET | `/api/auth/me` | Token | Obtener perfil actual |

### 4.2 Publicaciones
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/publicaciones` | No | Listar (filtros: departamento, municipio, producto_id, precio_min/max, paginación) |
| GET | `/api/publicaciones/:id` | No | Obtener detalle |
| POST | `/api/publicaciones` | productor | Crear |
| PUT | `/api/publicaciones/:id` | productor | Actualizar |
| PATCH | `/api/publicaciones/:id/estado` | productor | Cambiar estado (activa/pausada/cerrada) |
| DELETE | `/api/publicaciones/:id` | productor | Eliminación suave |

### 4.3 Negociaciones
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/negociaciones` | Token | Listar (filtrado por rol) |
| GET | `/api/negociaciones/:id` | Token | Obtener detalle |
| POST | `/api/negociaciones` | comprador | Crear (con duplicados prevenidos) |
| PATCH | `/api/negociaciones/:id/estado` | Token | Cambiar estado (máquina de estados) |

### 4.4 Mensajes
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/negociaciones/:id/mensajes` | Token | Listar mensajes de negociación |
| POST | `/api/negociaciones/:id/mensajes` | Token | Enviar mensaje |
| PATCH | `/api/negociaciones/:id/mensajes/leer` | Token | Marcar como leídos |

### 4.5 Entregas
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/entregas` | Token | Listar |
| GET | `/api/entregas/:id` | Token | Obtener |
| POST | `/api/entregas` | productor | Crear |
| PUT | `/api/entregas/:id` | Token | Actualizar |
| POST | `/api/entregas/:id/confirmar` | Token | Doble confirmación |

### 4.6 Pagos
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/pagos` | Token | Listar |
| GET | `/api/pagos/:id` | Token | Obtener |
| POST | `/api/pagos` | Token | Crear |
| PUT | `/api/pagos/:id` | Token | Actualizar |

### 4.7 Notificaciones
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/notificaciones` | Token | Listar (filtro por leída/tipo) |
| PATCH | `/api/notificaciones/:id/leer` | Token | Marcar una como leída |
| PATCH | `/api/notificaciones/leer-todas` | Token | Marcar todas como leídas |

### 4.8 Salud
| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Health check del servidor |

---

## 5. Máquina de Estados

### 5.1 Estados de Negociación
```
                    ┌──────────┐
                    │ Pendiente │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
             ┌──────│ En proceso │──────┐
             │      └────┬─────┘      │
             │           │            │
        ┌────▼───┐ ┌────▼────┐  ┌────▼────┐
        │Aceptada│ │Rechazada│  │Cancelada│
        └────┬───┘ └─────────┘  └─────────┘
             │
        ┌────▼──────┐
        │ Completada │
        └───────────┘
```

**Transiciones permitidas:**
- `pendiente → en_proceso` (productor acepta negociar)
- `pendiente → rechazada` (productor rechaza)
- `pendiente → cancelada` (cualquier parte cancela)
- `en_proceso → aceptada` (acuerdo final)
- `en_proceso → cancelada` (cualquier parte cancela)
- `aceptada → completada` (entrega + pago confirmados)

### 5.2 Estados de Entrega
```
pendiente → en_transito → entregado
                              ↓
                         con_problema
```

### 5.3 Estados de Pago
```
pendiente → completado
pendiente → fallido
completado → reembolsado
```

---

## 6. Sistema de Doble Confirmación de Entregas

Este es uno de los patrones más importantes del sistema, diseñado para garantizar transparencia:

1. El **productor** programa una entrega (`POST /api/entregas`)
2. Al llegar, el **productor** confirma que entregó (`POST /api/entregas/:id/confirmar`)
3. El **comprador** confirma que recibió (`POST /api/entregas/:id/confirmar`)
4. Solo cuando **ambos** han confirmado, la entrega se marca como `entregado`
5. Cada usuario puede confirmar solo una vez (unique constraint en `[entrega_id, usuario_id]`)

```
Implementación en entregas.controller.js:

function confirmar(req, res) {
  // 1. Verificar que el usuario es participante de la negociación
  // 2. Verificar que no haya confirmado ya
  // 3. Crear ConfirmacionEntrega
  // 4. Si ambos (productor + comprador) confirmaron → estado = entregado
  // 5. Si solo uno confirmó → estado = en_transito
}
```

---

## 7. Infraestructura — Docker

### 7.1 Arquitectura de Contenedores
```
┌──────────────────────────────────────────────────┐
│                   docker-compose                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   db      │  │ backend   │  │ frontend          │ │
│  │ postgres  │  │ node:20   │  │ nginx:alpine      │ │
│  │ :5433     │◄─┤ :3000    │◄─┤ :8081             │ │
│  │           │  │           │  │ proxy /api → backend│
│  └──────────┘  └──────────┘  └──────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 7.2 Servicios

| Servicio | Imagen | Puerto | Depende de |
|---|---|---|---|
| db | postgres:16-alpine | 5433:5432 | — |
| backend | node:20 | 3000:3000 | db (healthcheck) |
| frontend | multi-stage (build + nginx) | 8081:80 | backend |

### 7.3 Configuración Clave

**backend/Dockerfile:**
```dockerfile
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY . .
CMD npx prisma db push && npx prisma db seed && node src/index.js
```
- `prisma db push` sincroniza el schema (no usa migraciones formales por simplicidad)
- `prisma db seed` siembra datos de prueba
- `--only=production` evita devDependencies en producción

**frontend/Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**nginx.conf (frontend):**
```nginx
location /api/ {
    proxy_pass http://backend:3000/;
}
location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
}
```

### 7.4 Variables de Entorno
```
POSTGRES_DB=laesperanza_db
POSTGRES_USER=admin
POSTGRES_PASSWORD=1234!
DATABASE_URL=postgresql://admin:1234!@db:5432/laesperanza_db
JWT_SECRET=miClaveSecretaMuyLargaYSegura2025LaEsperanza
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://localhost
```

---

## 8. Pruebas Automatizadas

### 8.1 Stack de Pruebas
- **Framework:** Jest + Supertest
- **Cobertura:** 41 pruebas en 8 suites
- **Base de datos:** PostgreSQL real (no mockeado)

### 8.2 Suites de Pruebas

| Suite | Pruebas | Descripción |
|---|---|---|
| Auth | 8 | Registro (éxito, duplicado, datos inválidos), Login (éxito, credenciales incorrectas), Me (token válido, sin token) |
| Publicaciones | 12 | CRUD completo, filtros (departamento, categoría, precio min/max), paginación, cambios de estado |
| Negociaciones | 6 | Creación, cambio de estados (todas las transiciones permitidas y prohibidas), prevención de duplicados |
| Mensajes | 3 | Envío, listado, marcado como leído |
| Entregas | 4 | Creación, doble confirmación, verificación de participantes |
| Pagos | 3 | CRUD, cambios de estado |
| Notificaciones | 2 | Listado con filtros, marcado como leído |
| RBAC | 4 | Acceso denegado por rol, rutas protegidas sin token |
| Health | 1 | Health check endpoint |

### 8.3 Ejemplo de Prueba Crítica — Doble Confirmación
```javascript
test('Doble confirmación completa la entrega', async () => {
  const resProductor = await request(app)
    .post(`/api/entregas/${entregaId}/confirmar`)
    .set('Authorization', `Bearer ${tokenProductor}`);
  expect(resProductor.body.entrega.estado).toBe('en_transito');

  const resComprador = await request(app)
    .post(`/api/entregas/${entregaId}/confirmar`)
    .set('Authorization', `Bearer ${tokenComprador}`);
  expect(resComprador.body.entrega.estado).toBe('entregado');
});
```

---

## 9. Deuda Técnica y Mejoras Futuras

| Ítem | Impacto | Prioridad |
|---|---|---|
| Falta paginación consistente en todos los endpoints | Alto | Alta |
| No hay rate limiting en endpoints de auth | Alto | Alta |
| Logs centralizados (Winston/Pino en vez de Morgan) | Medio | Media |
| Pruebas de integración con base de datos separada | Medio | Media |
| Migraciones formales de Prisma (en vez de db push) | Bajo | Baja |
| WebSockets para chat en tiempo real (hoy usa polling) | Medio | Media |
| Validación con Joi/Zod en vez de manual | Bajo | Baja |
| CI/CD pipeline (GitHub Actions) | Medio | Media |

---

## 10. Matriz de Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Falla de BD PostgreSQL | Baja | Alto | Healthcheck en Docker, restart policy |
| JWT compromise | Baja | Alto | Rotación de secretos, expiración 7d |
| Escalabilidad horizontal | Media | Medio | Backend stateless (JWT, no sesiones), fácil replicar contenedores |
| Dependencia de Prisma ORM | Baja | Bajo | ORM abstrae BD, fácil cambiar si es necesario |
| Pérdida de datos en seed | Media | Bajo | Seed es solo para desarrollo, datos reales van por API |

---

## 11. Reflexiones del Scrum Master

Trabajar como Scrum Master y único responsable del backend en un equipo de 2:

- **No hay especialización estricta** — aunque mi foco es backend/infraestructura, conocía todo el frontend para entender el contexto completo
- **La documentación técnica** (este documento, la API, los casos de prueba) era fundamental porque no había un tercero que la hiciera
- **Cada sprint entregábamos** — no había espacio para sprints "perdidos". El Po siempre tenía una US full-stack lista
- **Docker fue la decisión de infraestructura más acertada** — eliminó "en mi máquina sí funciona" desde el día 1
- **La doble confirmación de entregas** es el feature técnicamente más complejo y del que estoy más orgulloso

> "En un equipo de 2, el Scrum Master no solo facilita el proceso, sino que construye la columna vertebral técnica del sistema."
