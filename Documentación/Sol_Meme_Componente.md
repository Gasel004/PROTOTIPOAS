# Sol Meme — Documentación Técnica Visual

> Componente decorativo animado tipo caricatura/meme que aparece en el panel `auth-field` de las páginas **Login** y **Registro**.

---

## 1. Árbol de componentes — Jerarquía JSX

```
auth-field (section)
 │
 ├── .sun ───────────────── z-index: auto (0)
 │   ├── ::before (highlight interno)
 │   ├── ::after  (sonrisa smirk)     ── z: 1
 │   ├── .glasses (gafas wayfarer)    ── z: 1
 │   │   ├── (lente izquierda)
 │   │   ├── ::before (puente)
 │   │   └── ::after  (lente derecha)
 │   ├── .hand    (mano izquierda)    ── z: 2
 │   │   ├── ::before (dedo 1)
 │   │   └── ::after  (dedo 2)
 │   ├── .arm     (brazo pulgar)      ── z: 2
 │   │   └── ::after (mano/pulgar)
 │   ├── .brow    (ceja levantada)    ── z: 1
 │   │   ├── ::before (ceja izquierda)
 │   │   └── ::after  (ceja derecha + levantada)
 │   ├── .cheek   (mejillas)          ── z: 0
 │   │   └── ::after (mejilla derecha)
 │   └── .nose    (nariz)             ── z: 1
 │
 ├── .cloud-one / .cloud-two
 ├── .bird-1 / .bird-2 / .bird-3
 ├── .field-copy
 ├── .hill-back / .hill-front
 ├── .furrows
 ├── .crop-row-one / .crop-row-two
 └── .tractor
```

> El `z-index` contextual del `.sun` es el del `auth-field` (`position: relative`). Los elementos dentro del sol heredan su posicionamiento absoluto respecto a `.sun`.

---

## 2. Tabla de animaciones

| Nombre | Duración | Easing | Iteración | Aplica a | Efecto |
|---|---|---|---|---|---|
| `sunPulse` | 6 s | `ease-in-out` | ∞ | `.sun` | Escala suave: `scale(1)` → `scale(1.02)` → `scale(0.99)` → `1`. Acompañado de leves cambios de opacidad (0.92 → 1 → 0.96). |
| `armBob` | 2.4 s | `ease-in-out` | ∞ | `.arm` | Balanceo del brazo extendido (pulgar arriba). Rota de `-28deg` a `-23deg` (5° de recorrido). |
| `handReach` | 4 s | `ease-in-out` | ∞ | `.hand` | Mano izquierda se estira hacia las gafas y retrocede. Combina rotación (`-18deg` → `-8deg`) con traslación en X (`0` → `-6px`). |
| *Desactivadas* | — | — | — | `.arm`, `.hand` en ≤520px | `animation: none` en mobile. |

### Curvas de animación

```
sunPulse (6s):
  1.02 ┤      ╱╲
  1.00 ┤╱╲  ╱  ╲╱╲
  0.99 ┤  ╲╱      ╲
       └────────────────►
       0   2s   4s   6s

armBob (2.4s):
  -23° ┤      ╱╲
  -28° ┤╱╲  ╱  ╲╱╲
       └────────────────►
       0  1.2s  2.4s

handReach (4s):
  rot  ┤  ╱╲
  -8°  ┤ ╱  ╲
  -18° ┤╱    ╲╱╲╱╲╱╲
       └────────────────►
       0  1.2s  2.4s  4s
```

---

## 3. Especificación de colores — Paleta del Sol Meme

| Elemento | Color / Gradiente | Hex / Valor |
|---|---|---|
| **Sol — centro** | Base del gradiente radial | `#FEF9E0` → `#FDEA71` |
| **Sol — núcleo** | Color principal del sol | `#F7C91F` |
| **Sol — medio** | Anillo medio del gradiente | `#E1AF19` |
| **Sol — borde** | Anillo de borde | `#B38C12` |
| **Sol — borde oscuro** | Anillo externo | `#96710E` |
| **Highlight spot 1** | `radial-gradient` en 32% 28% | `rgba(255,242,170,.55)` |
| **Highlight spot 2** | `radial-gradient` en 72% 62% | `rgba(255,228,115,.35)` |
| **Reflejo interno** | `::before` del sol | `rgba(255,252,225,.75)` |
| **Gafas — fondo** | Lentes oscuras | `#1a1a1a` → `#080300` / `#2a1a0a` |
| **Gafas — borde** | Marco de lentes y puente | `#150a03` |
| **Gafas — reflejo** | Diagonal translúcida | `rgba(255,255,255,.25)` / `rgba(255,255,255,.22)` |
| **Brazo derecho (pulgar)** | Gradiente lineal | `#E8BA28` → `#96700E` |
| **Brazo izquierdo (mano)** | Gradiente lineal | `#D5A51A` → `#96700E` |
| **Mano — dedo oscuro** | Gradiente | `#B38C12` → `#7A580A` |
| **Sonrisa (smirk)** | `border-bottom` y sombra | `rgba(70,35,8,.7)` |
| **Ceja** | Marrón oscuro | `#4a2208` |
| **Mejillas** | Rosa suave translúcido | `rgba(210,100,50,.3)` |
| **Nariz** | Marrón claro translúcido | `rgba(150,75,30,.35)` |

### Mapa visual de la paleta

```
  #FEF9E0 ──── highlight del núcleo
  #F7C91F ──── color principal del sol
  #E1AF19 ──── anillo medio
  #B38C12 ──── borde del sol / brazos
  #96710E ──── borde externo / extremos de brazos
  #4a2208 ──── ceja (marrón oscuro)
  #150a03 ──── marco de gafas (casi negro)
  #080300 ──── lente de gafas (negro absoluto)
```

---

## 4. Desglose de capas — z-index y propósito

| Elemento | z-index | Propósito |
|---|---|---|
| `.sun` | auto (0) | Contenedor base — círculo con gradiente y sombra |
| `.sun::before` | auto (0) | Highlight interno — reflejo especular superior-izquierdo |
| `.cheek` + `::after` | 0 | Dos mejillas sonrosadas — capa inferior del rostro |
| `.glasses` + `::before/::after` | 1 | Gafas wayfarer completas (lente izq, puente, lente der) |
| `.brow` + `::before/::after` | 1 | Ambas cejas encima de las gafas |
| `.nose` | 1 | Nariz justo debajo de las gafas |
| `.sun::after` | 1 | Sonrisa smirk — borde inferior sobre el rostro |
| `.hand` + `::before/::after` | 2 | Mano izquierda — debe pasar *sobre* las gafas |
| `.arm` + `::after` | 2 | Brazo derecho — sale del borde del sol |
| `.bird-*` | 3 | Pájaros — capa más alta del `auth-field` |

### Mapa de superposición visual (frontal)

```
      ┌─────────────────────────────────────┐
      │  .bird (z:3)          .bird (z:3)   │
      │                                      │
      │        ┌───── .sun ──────────┐      │
      │        │  .brow (z:1)        │      │
      │        │  .glasses (z:1)     │      │
      │  .hand │    .nose (z:1)      │ .arm  │
      │  (z:2) │  .cheek (z:0)       │ (z:2) │
      │        │  ::after sonrisa    │      │
      │        └─────────────────────┘      │
      │    .cloud            .cloud         │
      └─────────────────────────────────────┘
```

> **Orden de pintado real (de abajo arriba):** `.cheek` → `.nose` → `.glasses` → `.brow` → `::after` (sonrisa) → `.hand` / `.arm`.

---

## 5. Notas responsive — comportamiento en ≤520 px

| Elemento | Desktop | Mobile (≤520px) |
|---|---|---|
| `.sun` | 132 × 132 px | 92 × 92 px |
| Sombra del sol | 3 capas de box-shadow hasta 200 px | Escalada: 50px / 90px / 120px |
| `::after` (sonrisa) | 40 × 18 px, border-bottom 4 px | 24 × 14 px, border-bottom 2.5 px |
| `.glasses` | 28 × 20 px, border-radius 6 px | 20 × 14 px, border-radius 4 px |
| `.glasses::after` | left: 40 px | left: 28 px |
| `.brow` → width | 54 px | 38 px |
| `.brow::before/::after` | 16 × 4 px | 11 × 3 px |
| `.cheek` | 18 × 10 px, left: 10% | 13 × 7 px, left: 8% |
| `.cheek::after` | left: 48 px | left: 34 px |
| `.arm` | 30 × 16 px, right: -22 px | 21 × 11 px, right: -15 px, **animation: none** |
| `.arm::after` | 14 × 20 px, top: -18 px | 10 × 14 px, top: -13 px |
| `.hand` | 20 × 14 px, left: -6 px | 14 × 10 px, left: -4 px, **animation: none** |
| `.nose` | 10 × 8 px | 7 × 6 px |

### Cambios clave en mobile

```css
@media (max-width: 520px) {
  .sun { width: 92px; height: 92px; }
  .arm { animation: none; }
  .hand { animation: none; }
  .auth-field { min-height: 40vh; }
}
```

---

## 6. Instrucciones de mantenimiento

### Consideraciones al modificar el sol

1. **Coordenadas absolutas anidadas**
   - Todos los hijos de `.sun` usan `position: absolute` con porcentajes relativos al contenedor.
   - Modificar el `width`/`height` del sol **requiere reajustar** las posiciones de cada subelemento.
   - La media query `≤520px` escala todo proporcionalmente, pero no es automática: cada subelemento tiene reglas explícitas.

2. **Dependencia `transform`**
   - `.sun` usa `transform: translate(-50%, -60%)` para centrarse.
   - Subelementos como `.glasses`, `.brow`, `.nose` usan `transform` para corregir posición.
   - Las animaciones (`sunPulse`, `armBob`, `handReach`) modifican `transform` — asegurarse de no sobrescribir transforms de posicionamiento.

3. **z-index stacking**
   - `.hand` y `.arm` tienen `z-index: 2` y deben quedar sobre las gafas y la sonrisa.
   - Los pájaros (`z-index: 3`) están sobre **todo** el auth-field, incluyendo el sol.

4. **Animaciones y rendimiento**
   - `sunPulse` anima `transform` y `opacity` — propiedades aceleradas por GPU.
   - `armBob` y `handReach` animan `transform` — seguras para rendimiento.
   - En mobile se desactivan intencionalmente (rendimiento en dispositivos de gama baja).

5. **Simetría vs. asimetría intencional**
   - El sol es **asimétrico** a propósito: una ceja levantada, una mano alcanzando las gafas, sonrisa burlona.
   - No intentar "corregir" la asimetría — es parte del estilo caricatura/meme.
   - La posición `calc(-50% - 20px)` en `.glasses` está deliberadamente descentrada.

6. **Para agregar un nuevo rasgo facial**
   - Crear un nuevo `div` dentro del contenedor `.sun` en el JSX.
   - Estilizarlo con `position: absolute` y coordenadas porcentuales.
   - Definir un `z-index` acorde a la capa que debe ocupar.
   - Agregar la regla responsive correspondiente en `@media (max-width: 520px)`.

7. **Para duplicar el sol en otra página**
   - JSX: `<div className="sun"><div className="glasses" /><div className="hand" /><div className="arm" /><div className="brow" /><div className="cheek" /><div className="nose" /></div>`
   - Asegurarse de que el contenedor padre tenga `position: relative` y `overflow: hidden`.
   - No requiere JavaScript ni estado — es 100% CSS.

8. **Referencia cruzada de selectores**
   - Todos los estilos del sol están en `index.css` (~líneas 851–1067).
   - Las animaciones están en ~líneas 1228–1241.
   - El responsive está en `@media (max-width: 520px)` ~línea 1513.

---

### Checklist rápido de modificación

- [ ] ¿Ajusté todos los subelementos al cambiar tamaño del sol?
- [ ] ¿Actualicé la media query ≤520px para cada nuevo elemento?
- [ ] ¿Verifiqué que los `transform` de animación no rompan el posicionamiento?
- [ ] ¿Mantuve el orden de `z-index` correcto?
- [ ] ¿Las animaciones nuevas usan solo `transform` y `opacity` (GPU-friendly)?
- [ ] ¿El JSX coincide exactamente con el orden de los divs esperado por CSS?
