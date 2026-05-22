# Documento de Gestión Técnica — Scrum Master & Backend Lead

## Rol en el equipo Scrum: **Scrum Master / Backend Lead**

> *"La arquitectura y el proceso son los pilares invisibles que sostienen un producto confiable. Mi objetivo es que el equipo entregue valor de forma predecible, sostenible y con calidad."*

---

## 1. Proceso Scrum del Equipo

### 1.1 Ceremonias

| Ceremonia | Día/Horario | Duración | Participantes | Propósito |
|---|---|---|---|---|
| **Sprint Planning** | Lunes 9:00 AM | 2h | Todo el equipo | Definir Sprint Goal y compromiso del Sprint Backlog |
| **Daily Scrum** | Lunes a viernes 9:15 AM | 15 min | Todo el equipo | Sincronización: ¿qué hice ayer? ¿qué haré hoy? ¿hay impedimentos? |
| **Sprint Review** | Viernes 11:00 AM (último día del sprint) | 1.5h | Todo el equipo + stakeholders | Demostrar funcionalidad completada, recibir feedback |
| **Sprint Retrospective** | Viernes 2:00 PM (último día del sprint) | 1.5h | Todo el equipo | Inspeccionar y adaptar el proceso |

### 1.2 Roles dentro del Equipo

| Persona | Rol Scrum | Rol Técnico | Responsabilidades |
|---|---|---|---|
| **Yovani** | Scrum Master | Backend Lead | Facilitar ceremonias, eliminar impedimentos, arquitectura backend, base de datos, infraestructura |
| **[Product Owner]** | Product Owner | Frontend Lead | Gestionar el Product Backlog, priorizar historias, supervisar UX/autenticación |
| **[Dev 1]** | Developer | Fullstack | Desarrollo backend + frontend, pruebas |

### 1.3 Artefactos Scrum
- **Product Backlog**: Gestionado por el PO, priorizado por valor de negocio
- **Sprint Backlog**: Compromiso del equipo para el sprint actual
- **Incremento**: Código funcional, probado y documentado al final de cada sprint
- **Definition of Ready (DoR)**: Historia con criterios de aceptación claros, valor de negocio definido, factible técnicamente
- **Definition of Done (DoD)**: Ver documento del PO (sección 7) + criterios técnicos adicionales:
  - Pruebas de integración pasan
  - Linter sin errores
  - Prisma schema sincronizado (`prisma db push`)
  - Variables de entorno documentadas en `.env.example`

---

## 2. Arquitectura de Backend

### 2.1 Stack Tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Rendimiento, ecosistema, facilidad de contratación |
| Framework Web | Express | ^4.19.2 | Madurez, simplicidad, middleware extensible |
| ORM | Prisma | ^5.17.0 | Type safety, migraciones declarativas, generación automática de cliente |
| Base de datos | PostgreSQL | 16 | Confiabilidad, soporte de enums, integridad referencial |
| Autenticación | JWT + bcrypt | jsonwebtoken 9.x / bcryptjs 2.x | Stateless, seguro, estándar de la industria |
| Pruebas | Jest + Supertest | 29.x / 7.x | Estándar de la industria para testing en Node.js |

### 2.2 Patrones Arquitectónicos

```
REST API — Capas:
┌──────────────────────────────────────┐
│           Routes (routing)           │  ─── HTTP verbs + middleware
├──────────────────────────────────────┤
│        Controllers (orquestación)    │  ─── Valida request, llama servicios
├──────────────────────────────────────┤
│         Services (lógica de negocio) │  ─── Validaciones, transforms
├──────────────────────────────────────┤
│            Prisma Client (datos)     │  ─── ORM → PostgreSQL
└──────────────────────────────────────┘
```

**Decisiones de diseño:**
- **Controllers delgados**: Solo orquestan request/response; la lógica vive en servicios
- **Servicios reutilizables**: `auth.service.js` contiene la lógica de registro/login que podría ser consumida por otros controladores
- **Middleware encadenable**: `verificarToken` + `soloRoles(...)` permite composición granular de autorización
- **Prisma como única fuente de verdad del schema**: El schema define modelos, relaciones y enums; el cliente se genera automáticamente

### 2.3 Máquina de Estados (Negociación)

```
                    ┌─────────┐
                    │ Pendiente│
                    └────┬─────┘
                         │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
          ┌────────┐ ┌────────┐ ┌────────┐
          │En Proceso│ │Rechazada│ │Cancelada│
          └────┬───┘ └────────┘ └────────┘
               │
          ┌────▼───┐
          │Aceptada│
          └────┬───┘
               │ (ambos confirman entrega)
          ┌────▼─────┐
          │Completada│
          └──────────┘
```

- **Validación estricta**: El controlador `negociaciones.controller.js:cambiarEstado` tiene una máquina de estados explícita que rechaza transiciones inválidas
- **Transiciones automáticas**: Cuando ambas partes confirman una entrega, el sistema auto-transiciona la negociación a `completada`

### 2.4 Doble Confirmación de Entregas
```
Productor confirma entrega ──┐
                             ├──➔ ¿Ambos confirmaron?
Comprador confirma entrega ──┘       │
                                     ├── SÍ → Entrega → "entregado"
                                     │        Negociación → "completada"
                                     └── NO → Entrega sigue "en_proceso"
```
- Restricción: cada usuario solo puede confirmar una vez (unique constraint en `confirmaciones_entrega`)
- Cuando se registra la segunda confirmación, se dispara la transición automática
- Las observaciones de cada parte se guardan de forma independiente

---

## 3. Base de Datos

### 3.1 Modelo Entidad-Relación (12 tablas)

```
Usuario (1) ──→ (1) Productor (1) ──→ (M) Publicacion
Usuario (1) ──→ (1) Comprador (1) ──→ (M) Negociacion
Usuario (1) ──→ (1) Asociacion (1) ──→ (M) Productor
Usuario (1) ──→ (M) Notificacion
Usuario (1) ──→ (M) ConfirmacionEntrega
Usuario (1) ──→ (M) Mensaje
Usuario (1) ──→ (M) Pago

Producto (1) ──→ (M) Publicacion
Publicacion (1) ──→ (M) Negociacion
Negociacion (1) ──→ (M) Mensaje
Negociacion (1) ──→ (1) Entrega
Negociacion (1) ──→ (M) Pago
Entrega (1) ──→ (M) ConfirmacionEntrega
```

### 3.2 Enums del Sistema

| Enum | Valores | Uso |
|---|---|---|
| `Rol` | `productor`, `comprador`, `asociacion` | Tipo de usuario |
| `EstadoPublicacion` | `activa`, `pausada`, `cerrada`, `vencida` | Ciclo de vida de publicación |
| `EstadoNegociacion` | `pendiente`, `en_proceso`, `aceptada`, `rechazada`, `cancelada`, `completada` | Máquina de estados |
| `EstadoEntrega` | `pendiente`, `en_proceso`, `entregado`, `cancelada` | Estado de entrega |
| `EstadoPago` | `pendiente`, `completado`, `reembolsado`, `fallido` | Estado de pago |

### 3.3 Índices y Optimización
- `usuario.telefono`: Unique index (búsqueda por login)
- `publicacion.estado`: Filtro por estado activo (consulta principal)
- `publicacion.departamento` + `publicacion.municipio`: Filtros geográficos
- `negociacion.publicacion_id + negociacion.comprador_id`: Evitar negociaciones duplicadas
- `mensaje.negociacion_id`: Carga de mensajes por negociación
- `notificacion.usuario_id + notificacion.leida`: Filtro de no leídas

---

## 4. API REST — Diseño y Convenciones

### 4.1 Estandarización de Endpoints

```
Base URL: /api/v1

Convenciones:
  GET    /recurso        → Listar (con filtros query params)
  GET    /recurso/:id    → Obtener detalle
  POST   /recurso        → Crear
  PUT    /recurso/:id    → Actualizar (completo)
  PATCH  /recurso/:id    → Actualización parcial (estado)
  DELETE /recurso/:id    → Eliminación lógica
```

### 4.2 Formato de Respuesta

```json
// Éxito
{
  "ok": true,
  "data": { ... }
}

// Lista paginada
{
  "ok": true,
  "data": [ ... ],
  "total": 50,
  "page": 1,
  "limit": 10
}

// Error
{
  "ok": false,
  "error": "Mensaje descriptivo del error",
  "detalles": {} // Opcional, errores de validación
}
```

### 4.3 Códigos de Estado HTTP
| Código | Uso |
|---|---|
| 200 | Éxito (GET, PUT, PATCH) |
| 201 | Creado (POST) |
| 400 | Error de validación / solicitud inválida |
| 401 | No autenticado (token faltante o inválido) |
| 403 | No autorizado (rol incorrecto) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado, violación de regla de negocio) |
| 500 | Error interno del servidor |

### 4.4 Endpoints por Módulo (35+)

| Módulo | Endpoints | Autenticación |
|---|---|---|
| **Auth** | 3 | Solo `/me` requiere token |
| **Productores** | 3 | Solo `PUT` requiere token |
| **Compradores** | 2 | Solo `PUT` requiere token |
| **Asociaciones** | 2 | Ninguno |
| **Productos** | 1 | Ninguno |
| **Publicaciones** | 6 | POST/PUT/PATCH/DELETE requieren rol `productor` |
| **Negociaciones** | 4 (+2 sub-rutas mensajes) | Todos requieren token |
| **Entregas** | 4 | Todos requieren token |
| **Pagos** | 4 | Todos requieren token |
| **Notificaciones** | 3 | Todos requieren token |
| **Health** | 1 | Ninguno |

---

## 5. Infraestructura y Despliegue

### 5.1 Arquitectura de Contenedores

```
┌─────────────────────────────────────────────────────────┐
│                   docker-compose.yml                     │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Frontend    │   │   Backend    │   │     DB       │ │
│  │  nginx:alpine │──▶│  node:20     │──▶│postgres:16   │ │
│  │  :8081        │   │  :3000       │   │  :5433       │ │
│  └──────────────┘   └──────────────┘   └──────────────┘ │
│         │                                                 │
│         │ SPA fallback + proxy /api → backend            │
│         └── nginx.conf                                   │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Servicios Docker

| Servicio | Imagen | Puerto Expuesto | Depende de |
|---|---|---|---|
| `db` | `postgres:16-alpine` | 5433:5432 | — |
| `backend` | `node:20` | 3000:3000 | db (healthcheck) |
| `frontend` | construido local (multi-stage) | 8081:80 | — |

### 5.3 Volúmenes y Persistencia
```yaml
volumes:
  pgdata:                   # Volumen persistente para PostgreSQL
  backend/node_modules:     # Cache de dependencias del backend
```

### 5.4 Configuración de Nginx (Frontend)
```nginx
server {
    listen 80;
    
    location / {
        root   /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;  # SPA fallback
    }
    
    location /api/ {
        proxy_pass http://backend:3000;    # Proxy inverso al backend
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";  # Cacheo de assets
    }
}
```

### 5.5 Inicio del Backend (Docker)
```dockerfile
CMD ["sh", "-c", "npx prisma db push && npx prisma db seed && node src/index.js"]
```
- **`prisma db push`**: Sincroniza el schema sin migraciones formales (ideal para prototipo)
- **`prisma db seed`**: Pobla la base con datos de prueba (3 usuarios, 12 productos)
- **`node src/index.js`**: Inicia el servidor Express

### 5.6 Pipeline de Despliegue (Propuesto)

```
[Git push a develop] → [GitHub Actions] → [Tests automáticos]
                                          → [Build imágenes Docker]
                                          → [Push a registry]
                                          → [Deploy a staging]

[Git push a main] → [GitHub Actions] → [Tests automáticos]
                                       → [Build imágenes Docker]
                                       → [Push a registry]
                                       → [Deploy a producción]
```

### 5.7 Variables de Entorno

| Variable | Descripción | Valor por Defecto | Requerida |
|---|---|---|---|
| `POSTGRES_DB` | Nombre de la base de datos | `laesperanza_db` | SÍ |
| `POSTGRES_USER` | Usuario de base de datos | `admin` | SÍ |
| `POSTGRES_PASSWORD` | Contraseña de base de datos | — | SÍ |
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://admin:1234!@db:5432/laesperanza_db` | SÍ |
| `JWT_SECRET` | Secreto para firmar tokens JWT | — | SÍ |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT | `7d` | NO |
| `PORT` | Puerto del servidor backend | `3000` | NO |
| `FRONTEND_URL` | Origen permitido por CORS | `http://localhost` | NO |

---

## 6. Estrategia de Pruebas

### 6.1 Tipos de Prueba

| Tipo | Framework | Cobertura | Automatizado |
|---|---|---|---|
| Unitarias | Jest | Servicios, utilidades | SÍ |
| Integración | Jest + Supertest | Endpoints HTTP, middleware, validaciones | SÍ |
| Funcionales (manual) | — | Flujos completos en navegador | NO |
| Cobertura | Jest --coverage | Mínimo 70% líneas | SÍ |

### 6.2 Suites de Prueba Automatizadas (41 tests)

| Suite | Tests | Cobertura |
|---|---|---|
| **Auth** | 8 | Registro exitoso, duplicado, incompleto; login exitoso, contraseña incorrecta, inexistente; /me autenticado y no autenticado |
| **Publicaciones** | 12 | CRUD completo, autorización por rol, filtros, cambios de estado, 404 |
| **Negociaciones** | 6 | Creación (solo comprador), duplicados, máquina de estados, autorización por participante |
| **Mensajes** | 3 | Enviar, listar, contenido vacío rechazado |
| **Entregas** | 4 | Crear, duplicados, doble confirmación, auto-completado |
| **Pagos** | 3 | Registrar, monto inválido, transiciones de estado |
| **RBAC** | 4 | Control de acceso por rol, token inválido |
| **Health** | 1 | Endpoint de salud responde |

### 6.3 Configuración Requerida para Pruebas
```
- Base de datos de prueba separada
- Variables de entorno para test (NODE_ENV=test)
- jest.setup.js para setup/teardown de la base de datos
- Exportar app Express desde index.js (requiere refactor)
```

### 6.4 Plan de Pruebas (Documentado)

El `Plan de pruebas.odt` contiene:
- **Alcance**: Funcionalidades críticas (auth, publicaciones, negociaciones, entregas)
- **Fuera de alcance**: Carga de imágenes, notificaciones push, rendimiento
- **Criterios de entrada**: Prerequisitos para iniciar pruebas
- **Criterios de salida**: Condiciones para considerar las pruebas completadas
- **Cronograma**: Semana de pruebas al final de cada sprint
- **37 casos de prueba documentados** con ID, descripción, precondiciones, pasos, datos de entrada, resultados esperados y prioridad

---

## 7. Gestión de Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Pérdida de datos en PostgreSQL | Baja | Alto | Volumen persistente Docker, respaldos periódicos |
| Falla de seguridad JWT | Media | Alto | Rotación de JWT_SECRET, expiración de 7d, HTTPS en producción |
| Cuello de botella en consultas | Media | Medio | Índices en campos de filtro, paginación obligatoria |
| `prisma db push` destructivo en prod | Media | Alto | Usar `prisma migrate` en producción, no `db push` |
| Sin SSL/TLS en producción | Alta | Alto | Configurar Nginx con certbot/Let's Encrypt |
| Dependencias desactualizadas | Media | Medio | `npm audit` en CI, Dependabot configurado |
| Sin monitoreo de errores | Alta | Medio | Implementar Sentry o similar en sprint post-MVP |

---

## 8. Deuda Técnica Identificada

| Ítem | Área | Prioridad | Plan de Acción |
|---|---|---|---|
| Mock data en frontend como fallback general | Frontend | Alta | Reemplazar con manejo de error real (toast + estado vacío) |
| `prisma db push` en lugar de migraciones | Backend | Alta | Migrar a `prisma migrate dev` + `prisma migrate deploy` |
| Sin pruebas de carga/rendimiento | QA | Media | Agregar k6 o Artillery en sprint de hardening |
| Contraseña de BD hardcodeada en .env.example | Seguridad | Alta | Rotar contraseña en producción, usar secrets manager |
| Sin rate limiting en endpoints de auth | Backend | Alta | Agregar express-rate-limit en login/register |
| Notificaciones solo en DB (sin push) | Backend | Media | Evaluar WebSockets o Firebase Cloud Messaging |
| Sin manejo de errores centralizado en frontend | Frontend | Media | Crear ErrorBoundary + hook useApi con estados |

---

## 9. Métricas y Reportes del Sprint

### 9.1 Métricas del Equipo
- **Velocity**: Story points completados por sprint (para planificación)
- **Cumulative Flow**: Trabajo en progreso vs. completado
- **Cycle Time**: Días desde que una historia entra al sprint hasta que está Done
- **Bug Rate**: Bugs reportados / historias completadas
- **Code Coverage**: % de cobertura de pruebas (objetivo: ≥70%)

### 9.2 Reporte de Incidencias
| Sprint | Incidencias Bloqueantes | Incidencias Altas | Resueltas | Pendientes |
|---|---|---|---|---|
| Sprint 1 | 0 | 2 | 2 | 0 |
| Sprint 2 | 1 | 3 | 3 | 0 |
| Sprint 3 | 0 | 1 | 1 | 0 |

---

## 10. Configuración de Git (Gitflow)

```
main  ───●────────────────●────────────── (producción)
          \              /
develop ──●──●──●──●──●──●──●──●─────── (integración)
          |  |  |  |     |  |  |
feature/  ●  ●  ●  ●    ●  ●  ●
auth  pub neg men  pag not asoc

hotfix/                  ●
                         fix-crash

release/                 ●──●──●
                         v1.0.0-rc
```

**Reglas del equipo:**
- `main` se protege: requiere PR + aprobación de al menos 1 miembro
- `develop` es la rama base para features
- Nombres de ramas: `feature/descripcion-corta`, `fix/descripcion`, `hotfix/descripcion`
- Commits en español (el equipo habla español), formato: `[módulo]: descripción corta`
- No hacer push directo a `main` ni `develop`

---

## 11. Notas de la Retrospectiva (Sprint 1)

### ¿Qué salió bien?
- ✅ La división frontend/backend permitió trabajo paralelo
- ✅ Prisma aceleró la creación del schema y las consultas
- ✅ El design system CSS mantuvo consistencia sin framework externo

### ¿Qué podemos mejorar?
- ⚠️ Las pruebas automatizadas se escribieron al final; deben ir en paralelo con el código
- ⚠️ La documentación se generó de forma reactiva, no proactiva
- ⚠️ Faltó rate limiting desde el inicio

### Acciones concretas
1. Integrar Jest con `--watch` en el flujo de desarrollo diario
2. Documentar endpoints inmediatamente después de crearlos
3. Agregar `express-rate-limit` en el siguiente sprint

---

*Documento generado desde la perspectiva del Scrum Master y Backend Lead como parte del equipo Scrum de "La Esperanza".*
