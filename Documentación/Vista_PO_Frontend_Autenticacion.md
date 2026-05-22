# Documento de Visión — Product Owner & Frontend Lead

## Rol en el equipo Scrum: **Product Owner / Frontend Lead**

> *"La Esperanza es una plataforma que conecta al pequeño productor guatemalteco directamente con el comprador, eliminando intermediarios y fortaleciendo la economía local."*

---

## 1. Visión del Producto

### 1.1 Propósito
Empoderar a productores agrícolas guatemaltecos mediante una plataforma digital que facilite la publicación, negociación, venta y entrega de sus cosechas, conectándolos directamente con compradores minoristas y mayoristas.

### 1.2 Objetivos de Negocio
| Objetivo | Métrica | Meta |
|---|---|---|
| Reducir intermediarios en la cadena de suministro | % de transacciones directas | >90% |
| Acelerar el tiempo de negociación | Días promedio de negociación activa | <7 días |
| Digitalizar el control de entregas | % de entregas con doble confirmación | 100% |
| Incorporar asociaciones de productores | Asociaciones registradas activas | >5 en el primer trimestre |

### 1.3 Stakeholders
| Stakeholder | Interés | Prioridad |
|---|---|---|
| Productor (agricultor individual) | Publicar cosechas, negociar precios, gestionar entregas | Alto |
| Comprador (dueño de negocio) | Buscar productos, negociar, recibir entregas | Alto |
| Asociación de productores | Agrupar miembros, visibilidad colectiva | Medio |
| Administrador del sistema | Supervisar transacciones, gestionar usuarios | Medio |

---

## 2. User Personas

### 2.1 Don Juan — Productor
- **Perfil**: Agricultor en Suchitepéquez, 52 años, cultiva maíz y frijol
- **Necesidad**: Quiere vender su cosecha sin depender de coyotes (intermediarios)
- **Frustración**: Le pagan muy poco por su producto; no tiene visibilidad del precio real de mercado
- **Uso de la plataforma**: Publica su cosecha, recibe notificaciones de ofertas, confirma entregas

### 2.2 Doña María — Compradora
- **Perfil**: Dueña de tienda de barrio en Mixco, 38 años
- **Necesidad**: Quiere comprar directo al productor para obtener mejor precio y frescura
- **Frustración**: Los precios en el mercado mayorista son volátiles y no conoce a los proveedores
- **Uso de la plataforma**: Busca productos por región/precio, inicia negociaciones, confirma entregas

### 2.3 Cooperativa R.L. — Asociación
- **Perfil**: Asociación de 20 productores en Chimaltenango
- **Necesidad**: Quiere representar a sus miembros y centralizar ofertas
- **Frustración**: Dificultad para dar visibilidad a todos sus asociados
- **Uso de la plataforma**: Gestiona perfiles de miembros, visualiza estadísticas colectivas

---

## 3. Historias de Usuario Priorizadas (Product Backlog)

### Epic: Autenticación y Registro
| Historia | Prioridad | Esfuerzo | Criterios de Aceptación |
|---|---|---|---|
| Como usuario no registrado, quiero crear una cuenta eligiendo mi rol (productor/comprador/asociación) para acceder a la plataforma | P0 | 3 pts | Formulario de 2 pasos, validación de teléfono, feedback visual inmediato |
| Como usuario registrado, quiero iniciar sesión con mi teléfono y contraseña para acceder al sistema | P0 | 2 pts | Formato automático de teléfono, manejo de errores visibles, persistencia de sesión |
| Como usuario autenticado, quiero que mi sesión permanezca activa por 7 días sin tener que volver a iniciar sesión | P0 | 1 pt | Token JWT con expiración de 7d, almacenamiento local persistente |

### Epic: Publicaciones y Búsqueda
| Historia | Prioridad | Esfuerzo | Criterios de Aceptación |
|---|---|---|---|
| Como productor, quiero crear una publicación con foto, precio y cantidad para ofrecer mi cosecha | P0 | 5 pts | Formulario con catálogo de productos, selector de ubicación, imagen opcional |
| Como comprador, quiero filtrar publicaciones por departamento, producto y precio para encontrar lo que necesito | P0 | 5 pts | Filtros combinables, ordenamiento por precio/fecha, paginación |
| Como comprador, quiero ver el detalle de una publicación con información del productor para decidir si negocio | P0 | 3 pts | Vista detallada con tarjeta del productor, badge de calificación |

### Epic: Negociación y Mensajería
| Historia | Prioridad | Esfuerzo | Criterios de Aceptación |
|---|---|---|---|
| Como comprador, quiero iniciar una negociación con un productor para acordar el precio y la cantidad | P0 | 5 pts | Modal de inicio, validación de duplicados, notificación al productor |
| Como usuario, quiero chatear en tiempo real dentro de la negociación para discutir términos | P0 | 8 pts | Chat con mensajería, indicador de lectura, burbujas por remitente |
| Como productor, quiero cambiar el estado de la negociación (aceptar/rechazar) para gestionar mis ventas | P1 | 3 pts | Máquina de estados visual, badges de estado, confirmación de acción |

### Epic: Entregas y Pagos
| Historia | Prioridad | Esfuerzo | Criterios de Aceptación |
|---|---|---|---|
| Como productor, quiero registrar una entrega para formalizar la transacción | P0 | 5 pts | Fecha programada, lugar, solo en negociaciones aceptadas, sin duplicados |
| Como usuario, quiero confirmar la recepción/entrega para cerrar el ciclo | P0 | 5 pts | Sistema de doble confirmación; cuando ambas partes confirman, la entrega y negociación se completan automáticamente |
| Como usuario, quiero registrar pagos asociados a una negociación para llevar control financiero | P1 | 3 pts | Monto, método de pago, referencia, cambios de estado |

---

## 4. Arquitectura Frontend

### 4.1 Decisiones Técnicas

| Decisión | Opción Elegida | Justificación |
|---|---|---|
| Framework | **React 18 + Vite** | Ecosistema maduro, rendimiento con Vite, facilidad de contratación |
| Estado global | **Zustand** | Ligero (~1KB), sin boilerplate, persistencia nativa con `persist` middleware |
| HTTP Client | **Axios** | Interceptores para JWT, manejo centralizado de errores 401 |
| Enrutamiento | **React Router v6** | Estándar de la industria, nested routes, route guards |
| Estilos | **CSS nativo con custom properties** | Sin dependencias extra, design system propio, fácil de mantener |
| Iconos | **Lucide React** | Iconos consistentes, tree-shakeable, licencia MIT |

### 4.2 Estructura de Componentes

```
src/
├── api/
│   └── client.js              # Instancia Axios con interceptor JWT + redirect 401
├── store/
│   └── auth.store.js          # Estado global de autenticación (Zustand + persist)
├── components/
│   └── Layout.jsx             # Shell: sidebar + topbar + <Outlet>
├── pages/
│   ├── Login.jsx              # Login con auto-formato de teléfono
│   ├── Registro.jsx           # Registro en 2 pasos (rol → datos)
│   ├── Dashboard.jsx          # Dashboard genérico con estadísticas y mock data fallback
│   ├── DashboardAsociacion.jsx # Dashboard específico para asociaciones
│   ├── Publicaciones.jsx      # Listado con filtros combinables
│   ├── DetallePublicacion.jsx # Detalle + modal de inicio de negociación
│   ├── MisPublicaciones.jsx   # Gestión de publicaciones del productor
│   ├── CrearPublicacion.jsx   # Formulario crear/editar con catálogo de productos
│   ├── Negociaciones.jsx      # Listado de negociaciones con filtros por estado
│   ├── DetalleNegociacion.jsx # Chat + timeline + panel de acciones
│   ├── Entregas.jsx           # Listado de entregas con doble confirmación
│   ├── Pagos.jsx              # CRUD de pagos con totalizador
│   └── Perfil.jsx             # Perfil: datos personales + cambio de contraseña
└── styles/
    └── index.css              # Design system completo (642 líneas)
```

### 4.3 Principios de UX Aplicados
1. **Progressive disclosure**: Registro en 2 pasos para no abrumar al usuario
2. **Fallback resiliente**: Todas las pantallas muestran datos mock si el API falla, garantizando una experiencia de demostración funcional
3. **Feedback inmediato**: Formato automático de teléfono, validación en tiempo real, loaders en operaciones asíncronas
4. **Consistencia visual**: Design system con variables CSS que definen toda la paleta, tipografía y espaciado
5. **Navegación basada en roles**: El menú lateral se adapta según el rol del usuario, mostrando solo las opciones relevantes
6. **Doble confirmación crítica**: Acciones destructivas (rechazar negociación, eliminar publicación) requieren confirmación explícita

---

## 5. Sistema de Autenticación

### 5.1 Flujo de Registro
```
[Seleccionar Rol] → [Ingresar datos: nombre, teléfono, contraseña] 
→ [POST /auth/register] → [Crear Usuario + Perfil según rol] 
→ [Devolver JWT] → [Redirigir a Dashboard]
```

### 5.2 Flujo de Login
```
[Ingresar teléfono + contraseña] → [POST /auth/login]
→ [Validar hash bcrypt + cuenta activa] → [Devolver JWT]
→ [Almacenar en Zustand → localStorage] → [Redirigir a Dashboard]
```

### 5.3 Protección de Rutas (Frontend)
```
<PrivateRoute>
  ├── Verifica: ¿existe token en localStorage?
  │   ├── NO → redirige a /login
  │   └── SÍ → ¿requiere rol específico?
  │       ├── SÍ → ¿el usuario tiene ese rol? → NO → 404
  │       └── SÍ → renderiza componente
  └── Renderiza <Outlet />

<PublicRoute>
  └── ¿usuario autenticado? → SÍ → redirige a /dashboard
      └── NO → renderiza componente (Login/Registro)
```

### 5.4 Manejo de Sesión Expirada
```
Axios response interceptor:
  if (error.response.status === 401) {
    auth.store.logout()      // limpia localStorage
    window.location = '/login' // redirect forzado
  }
```

---

## 6. Documentación Generada

Como responsable de documentación, he supervisado la creación de los siguientes activos:

### Documentación Técnica
| Documento | Formato | Contenido |
|---|---|---|
| `Documentacion_API_LaEsperanza.docx` | DOCX | Documentación completa de 35+ endpoints con ejemplos de request/response |
| `Arquitectura_Componentes_Patrones_LaEsperanza.docx` | DOCX | Patrones de diseño, arquitectura de componentes, decisiones técnicas |
| `Diccionario_Datos_LaEsperanza.docx` | DOCX | Diccionario de datos de las 12 tablas del sistema |
| `README.md` | MD | Visión general, instrucciones rápidas, variables de entorno, módulos |
| `INSTRUCCIONES.txt` | TXT | Guía de instalación detallada (256 líneas, Docker y local) |

### Documentación de Pruebas
| Documento | Formato | Contenido |
|---|---|---|
| `Plan de pruebas.odt` | ODT | Estrategia de pruebas, alcance, criterios de entrada/salida |
| `Casos_Prueba_LaEsperanza.docx` | DOCX | 37 casos de prueba documentados con precondiciones, pasos y resultados esperados |
| `Ejemplos_Pruebas_Automatizadas_LaEsperanza_CORREGIDO.test.js` | JS | 41 pruebas automatizadas con Jest + Supertest (auth, publicaciones, negociaciones, mensajes, entregas, pagos, RBAC) |
| `Evidencias_Cobertura_LaEsperanza.docx` | DOCX | Reporte de cobertura de código |
| `Matriz de trazabilidad.odt` | ODT | Trazabilidad requisitos → casos de prueba |

### Documentación de Operaciones
| Documento | Formato | Contenido |
|---|---|---|
| `Guía de instalación.odt` | ODT | Instalación paso a paso en producción |
| `Guía de entorno de desarrollo.odt` | ODT | Configuración del entorno de desarrollo local |
| `Guía de lanzamiento.odt` | ODT | Release pipeline y procedimiento de deploy |
| `Release notes.odt` | ODT | Notas de la versión v1.0.0 |
| `Infraestructura del sistema.odt` | ODT | Diagrama de infraestructura, puertos, volúmenes, servicios |
| `Gitflow.odt` | ODT | Flujo de trabajo Gitflow (main, develop, feature, release, hotfix) |

---

## 7. Criterios de Aceptación — Estándares

### Formato para Historias de Usuario
```
Historia: Como [rol] quiero [acción] para [beneficio]
Criterios:
  DADO [contexto inicial]
  CUANDO [acción del usuario]
  ENTONCES [resultado esperado]
  Y [condiciones adicionales]
```

### Definición de Done (DoD)
- [ ] Código escrito y funcional en entorno local
- [ ] Prueba unitaria o de integración que cubra el escenario feliz
- [ ] Prueba del escenario de error
- [ ] Componente revisado en navegador (Chrome + Firefox)
- [ ] Responsive: funciona en pantallas ≥768px
- [ ] Sin errores de consola ni warnings de React
- [ ] Código sigue el design system (variables CSS, componentes existentes)
- [ ] Documentación de API actualizada si aplica

---

## 8. Roadmap del Producto (Siguientes Sprints)

### Sprint Backlog Priorizado
| Sprint | Objetivo | Historias Clave |
|---|---|---|
| **Sprint 1** | Base del producto | Autenticación, registro, seed de productos, layout base |
| **Sprint 2** | Publicaciones | CRUD de publicaciones, listado con filtros, detalle |
| **Sprint 3** | Negociaciones | Iniciar negociación, máquina de estados, listado |
| **Sprint 4** | Mensajería + Entregas | Chat en negociación, doble confirmación de entregas |
| **Sprint 5** | Pagos + Notificaciones | CRUD de pagos, centro de notificaciones, perfil |
| **Sprint 6** | Asociaciones + Pulido | Dashboard de asociación, refinamiento UX, carga de imágenes |

### Métricas de Producto (a medir post-lanzamiento)
- **Tasa de conversión**: Publicaciones vistas → negociaciones iniciadas
- **Tasa de finalización**: Negociaciones iniciadas → completadas
- **Tiempo promedio**: Desde publicación hasta entrega confirmada
- **Retención**: Productores que publican en más de una cosecha
- **NPS**: Encuesta de satisfacción a usuarios piloto

---

## 9. Gestión de Riesgos (Frontend)

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Usuarios con dispositivos de gama baja | Alta | Medio | CSS optimizado, sin animaciones pesadas, bundle size monitoreado |
| Conexiones lentas en áreas rurales | Alta | Alto | Fallback a mock data, loaders esqueletales, lazy loading de rutas |
| Token JWT expuesto en localStorage | Media | Alto | HttpOnly cookies en versión futura, corta duración del token (7d) |
| Datos mock ocultan errores reales del API | Media | Medio | Flags de desarrollo, console.warn cuando se usa mock data |

---

*Documento generado desde la perspectiva del Product Owner y Frontend Lead como parte del equipo Scrum de "La Esperanza".*
