# Documento del Product Owner — Sistema "La Esperanza"

## Rol en el equipo Scrum

**Rol:** Product Owner  
**Responsable de:** Frontend (React), Autenticación (JWT + RBAC), Documentación de producto, UX/UI  
**Equipo:** 2 personas (PO + Scrum Master)  
**Sprint duration:** 2 semanas  

---

## 1. Product Vision

La Esperanza es una plataforma digital que conecta directamente a pequeños y medianos **productores agrícolas de Guatemala** con **compradores** (restaurantes, tiendas, distribuidores) y **asociaciones de productores**, eliminando intermediarios y creando un mercado justo, transparente y eficiente.

**Valor diferencial:**
- Reducción de intermediarios → mejor precio para productor y comprador
- Trazabilidad completa desde la publicación hasta la entrega y confirmación
- Doble confirmación de entregas para transparencia total
- Sistema de roles específicos para cada actor del ecosistema

---

## 2. Stakeholders y Personas

### 2.1 Productor — "Don Carlos"
| Atributo | Descripción |
|---|---|
| Edad | 45 años |
| Escolaridad | Primaria completa |
| Tecnología | Smartphone básico, datos móviles limitados |
| Necesidad | Publicar su cosecha y negociar directamente sin intermediarios |
| Frustración | "Los intermediarios me pagan muy poco por mi maíz" |
| Uso | Publicar productos, gestionar negociaciones, coordinar entregas |

### 2.2 Comprador — "María"
| Atributo | Descripción |
|---|---|
| Edad | 38 años |
| Perfil | Dueña de restaurante en la capital |
| Necesidad | Encontrar productos frescos a buen precio directo del campo |
| Frustración | "No sé si el producto es realmente fresco ni quién lo cultiva" |
| Uso | Explorar publicaciones, negociar, pagar, confirmar entregas |

### 2.3 Asociación — "Cooperativa Unión Campesina"
| Atributo | Descripción |
|---|---|
| Perfil | Agrupa 30+ productores |
| Necesidad | Gestionar la producción y ventas de sus miembros |
| Valor | Dashboard consolidado con estadísticas de todos los miembros |
| Uso | Dashboard ejecutivo, monitoreo de miembros y actividad |

---

## 3. Épicas y User Stories (Product Backlog Priorizado)

### Épica 1: Autenticación y Registro (Prioridad: Crítica)
| ID | User Story | Estimación |
|---|---|---|
| US-01 | Como usuario no registrado, quiero registrarme seleccionando mi rol (productor/comprador/asociación) para acceder a la plataforma | 5 pts |
| US-02 | Como usuario registrado, quiero iniciar sesión con mi teléfono y contraseña para acceder a mi cuenta | 3 pts |
| US-03 | Como usuario autenticado, quiero que mi sesión se mantenga activa por 7 días para no tener que iniciar sesión constantemente | 2 pts |
| US-04 | Como usuario, quiero ver mi perfil y editarlo según mi rol | 5 pts |
| US-05 | Como usuario, quiero cambiar mi contraseña desde el perfil | 3 pts |

### Épica 2: Publicaciones y Catálogo (Prioridad: Alta)
| ID | User Story | Estimación |
|---|---|---|
| US-06 | Como productor, quiero crear una publicación con fotos, precio y cantidad para ofrecer mis productos | 8 pts |
| US-07 | Como comprador, quiero ver todas las publicaciones activas con filtros por departamento y categoría | 5 pts |
| US-08 | Como comprador, quiero ver el detalle completo de una publicación incluyendo datos del productor | 3 pts |
| US-09 | Como productor, quiero editar, pausar o cerrar mis publicaciones | 5 pts |
| US-10 | Como asociación, quiero ver todas las publicaciones de mis miembros | 3 pts |

### Épica 3: Negociación y Mensajería (Prioridad: Alta)
| ID | User Story | Estimación |
|---|---|---|
| US-11 | Como comprador, quiero iniciar una negociación desde una publicación para acordar precio y cantidad | 5 pts |
| US-12 | Como productor, quiero ver las negociaciones entrantes y aceptar/rechazar propuestas | 5 pts |
| US-13 | Como usuario involucrado, quiero chatear en tiempo real dentro de la negociación | 8 pts |
| US-14 | Como usuario, quiero ver el estado de cada negociación en un timeline visual | 3 pts |

### Épica 4: Entregas y Confirmación (Prioridad: Alta)
| ID | User Story | Estimación |
|---|---|---|
| US-15 | Como productor, quiero programar una entrega para una negociación aceptada | 5 pts |
| US-16 | Como comprador, quiero confirmar la recepción del producto con observaciones | 3 pts |
| US-17 | Como productor, quiero confirmar que entregué el producto (doble confirmación) | 3 pts |
| US-18 | Como usuario, quiero ver el historial de entregas completadas | 2 pts |

### Épica 5: Pagos (Prioridad: Media)
| ID | User Story | Estimación |
|---|---|---|
| US-19 | Como usuario, quiero registrar un pago asociado a una negociación | 5 pts |
| US-20 | Como usuario, quiero ver el estado de los pagos (pendiente/completado/fallido) | 3 pts |
| US-21 | Como usuario, quiero ver totales de pagos completados vs pendientes | 3 pts |

### Épica 6: Dashboard y Visibilidad (Prioridad: Media)
| ID | User Story | Estimación |
|---|---|---|
| US-22 | Como usuario, quiero un dashboard con estadísticas relevantes a mi rol | 8 pts |
| US-23 | Como asociación, quiero un dashboard con el resumen de todos mis miembros | 8 pts |
| US-24 | Como usuario, quiero recibir notificaciones de actividades importantes | 5 pts |
| US-25 | Como usuario, quiero marcar notificaciones como leídas | 2 pts |

---

## 4. Frontend — Arquitectura y Decisiones Técnicas

### 4.1 Stack Tecnológico
| Tecnología | Versión | Justificación |
|---|---|---|
| React | 18.x | Framework SPA maduro, gran ecosistema, componentes reutilizables |
| React Router DOM | 6.x | Enrutamiento declarativo con guards para roles |
| Zustand | 4.x | Estado global mínimo (solo auth), evita Redux overhead innecesario |
| Axios | 1.x | Cliente HTTP con interceptors para JWT y manejo de errores global |
| Vite | 5.x | Build ultra rápido, HMR instantáneo, chunk splitting optimizado |
| Lucide React | — | Iconos livianos, evita Font Awesome pesado |
| CSS Variables | — | Sistema de diseño propio, sin dependencia externa de UI frameworks |

### 4.2 Arquitectura de Componentes

```
src/
├── api/
│   └── client.js              # Axios instance + interceptors
├── store/
│   └── auth.store.js           # Zustand store (persist en localStorage)
├── components/
│   └── Layout.jsx              # Sidebar + Topbar + Notifications
├── pages/
│   ├── Login.jsx               # Autenticación
│   ├── Registro.jsx            # Registro multi-paso
│   ├── Dashboard.jsx           # Dashboard genérico (delega según rol)
│   ├── DashboardAsociacion.jsx # Dashboard específico para asociaciones
│   ├── Publicaciones.jsx       # Catálogo con filtros
│   ├── DetallePublicacion.jsx  # Detalle + modal de negociación
│   ├── CrearPublicacion.jsx    # Formulario crear/editar
│   ├── MisPublicaciones.jsx    # Gestión de publicaciones del productor
│   ├── Negociaciones.jsx       # Lista de negociaciones
│   ├── DetalleNegociacion.jsx  # Chat + timeline + acciones
│   ├── Entregas.jsx            # Gestión de entregas
│   ├── Pagos.jsx               # CRUD de pagos
│   └── Perfil.jsx              # Perfil + cambio de contraseña
├── styles/
│   └── index.css               # Sistema de diseño completo (642 líneas)
├── App.jsx                     # Router + guards
└── main.jsx                    # Entry point
```

### 4.3 Principio de Responsabilidad Única por Página
Cada página encapsula una funcionalidad completa del negocio. No existen componentes genéricos tipo `Modal` o `Table` fuera de las páginas para mantener el código explícito y fácil de seguir.

### 4.4 Enrutamiento y Guards
```
PublicRoutes (no autenticado):
  /login        → Login.jsx
  /registro     → Registro.jsx

PrivateRoutes (autenticado):
  /dashboard        → Dashboard.jsx (todos los roles)
  /publicaciones    → Publicaciones.jsx (todos)
  /publicaciones/:id → DetallePublicacion.jsx (todos)
  /mis-publicaciones → MisPublicaciones.jsx (productor)
  /crear-publicacion → CrearPublicacion.jsx (productor)
  /negociaciones    → Negociaciones.jsx (todos)
  /negociaciones/:id → DetalleNegociacion.jsx (todos)
  /entregas         → Entregas.jsx (todos)
  /pagos            → Pagos.jsx (todos)
  /perfil           → Perfil.jsx (todos)
  *                 → 404
```

### 4.5 Patrones de UI
1. **Formularios controlados** con validación inline (ej: teléfono en formato `1234-5678`)
2. **Optimistic UI** en el chat de negociaciones — el mensaje aparece instantáneamente antes de la confirmación del servidor
3. **Feedback visual inmediato** — estados de carga (spinners), errores (toast/banner), éxito (transiciones suaves)
4. **Sidebar responsiva** — colapsable en pantallas pequeñas (breakpoint 768px)

---

## 5. Sistema de Autenticación

### 5.1 Flujo de Registro
```
1. Selección de rol (productor | comprador | asociación)
2. Formulario: nombre, teléfono, contraseña, confirmación
3. POST /api/auth/register
4. Validación backend:
   - Teléfono único
   - Formato de teléfono guatemalteco (8 dígitos)
   - Contraseña mínima 6 caracteres
5. Creación de usuario + perfil según rol
6. Auto-login → redirección al dashboard
```

### 5.2 Flujo de Login
```
1. Ingresar teléfono y contraseña
2. POST /api/auth/login
3. Validar credenciales (bcrypt compare)
4. Generar JWT { id, telefono, rol } con expiración de 7 días
5. Guardar token + user en Zustand (persiste en localStorage)
6. Redirección al dashboard según rol
```

### 5.3 Control de Acceso (RBAC)
```
Capas:
1. Ruta pública   → cualquiera puede acceder
2. Ruta privada   → requiere token válido (verificarToken middleware)
3. Ruta por rol   → requiere rol específico (soloRoles middleware)

Roles:
- productor  → publicaciones CRUD, negociaciones, entregas, pagos
- comprador  → ver catálogo, negociar, confirmar entregas, pagar
- asociación → dashboard de miembros, vista general
```

### 5.4 Seguridad
- JWT almacenado en localStorage (con persistencia)
- Interceptor Axios: inyecta `Authorization: Bearer <token>` en cada request
- Interceptor de respuesta 401: limpia sesión y redirige a `/login`
- Contraseñas hasheadas con bcrypt (10 rounds)
- No se almacenan tokens en cookies (evita CSRF)

---

## 6. Diseño UX/UI — Sistema de Diseño "La Esperanza"

### 6.1 Paleta de Colores
```
🎨 Esquema: Tierra y Cosecha

Primary (Verde campo):    #1B5E20 → #2E7D32 → #4CAF50
Secondary (Oro maíz):     #F57F17 → #F9A825 → #FFD54F
Neutral (Tierra):         #3E2723 → #5D4037 → #8D6E63
Surface:                  #FFFFFF → #F5F5F5 → #E0E0E0
Error:                    #C62828
Success:                  #2E7D32
```

### 6.2 Principios UX
1. **Mobile-first** — diseñado para productores que usan smartphone básico
2. **Progresivo** — registro en 2 pasos para no abrumar
3. **Predecible** — cada acción tiene retroalimentación inmediata
4. **Perdonador** — confirmaciones antes de acciones destructivas
5. **Contextual** — la interfaz se adapta al rol del usuario

### 6.3 Micro-interacciones
- Auto-formato de teléfono en login/registro
- Badges de no leídos en notificaciones y negociaciones
- Timeline visual en detalle de negociación
- Tarjetas con sombra suave y hover elevado
- Estados de carga esqueletales (spinner mientras carga datos)

---

## 7. Documentación del Producto

### 7.1 Documentos Generados (por el PO)

| Documento | Propósito | Formato |
|---|---|---|
| README.md | Vista general del proyecto, stack, cómo empezar | Markdown |
| INSTRUCCIONES.txt | Guía de instalación detallada (Docker y local) | Texto |
| Documento_PO_Frontend_Autenticacion.md | Este documento — visión PO | Markdown |
| Casos_Prueba_LaEsperanza.docx | Casos de prueba funcionales | Word |
| Diccionario_Datos_LaEsperanza.docx | Glosario de términos del dominio | Word |
| Matriz de trazabilidad.odt | Trazabilidad requisitos ↔ implementación | ODT |
| Historial de tareas.odt | Registro de tareas completadas por sprint | ODT |

---

## 8. Roadmap del Producto

### Fase 1 — Fundación (Sprints 1-2) ✅
- [x] Autenticación (registro, login, JWT, roles)
- [x] Perfiles por rol (productor, comprador, asociación)
- [x] Layout responsivo con sidebar

### Fase 2 — Núcleo del Negocio (Sprints 3-4) ✅
- [x] CRUD de publicaciones
- [x] Catálogo con filtros y búsqueda
- [x] Detalle de publicación con modal de negociación

### Fase 3 — Transacciones (Sprints 5-6) ✅
- [x] Sistema de negociaciones con estados
- [x] Chat integrado por negociación
- [x] Timeline visual de progreso

### Fase 4 — Cierre y Confianza (Sprints 7-8) ✅
- [x] Entregas con doble confirmación
- [x] Pagos con estados y totales
- [x] Notificaciones por evento
- [x] Dashboard por rol

---

## 9. Reflexiones del Product Owner

Trabajar en equipo de 2 personas significó:
- Cada sprint priorizamos **funcionalidades completas** de principio a fin (full-stack)
- Las historias de usuario se dividían verticalmente: una capa el PO (frontend/auth) y otra el SM (backend/infra)
- La comunicación diaria era directa y sin burocracia — daily de 10 minutos
- El mayor reto fue equilibrar la **calidad del diseño** con la **velocidad de entrega**
- La documentación se generó en paralelo al desarrollo, no al final

**Lección aprendida:** en un equipo de 2, el Product Owner no solo define "qué" construir, sino que también construye activamente la interfaz y la experiencia del usuario.
