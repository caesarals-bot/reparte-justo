# Guía de Diseño "Dark Serenity"

> Referencia visual: mockup compartido por el equipo (dashboard oscuro con tarjetas). Este documento sintetiza la propuesta y sirve como punto de partida para el rediseño del frontend.

## 1. Principios Visuales

1. **Oscuridad controlada**: fondo profundo (#1A1A2E) para resaltar componentes flotantes.
2. **Degradados sutiles**: transiciones suaves para aportar profundidad sin distraer.
3. **Tipografía limpia**: familias como Inter, Lato u Open Sans con pesos 400/500/600.
4. **Animaciones ligeras**: microinteracciones <200 ms basadas en opacidad/translate para mantener sensación profesional.

## 2. Paleta Base

| Token | Hex | Uso principal |
| --- | --- | --- |
| `--background` | `#1A1A2E` | Body, navbar, modales
| `--foreground` | `#E0E0E0` | Texto primario
| `--card` | `#2A2A4A` | Tarjetas, contenedores
| `--card-foreground` | `#D0D0D0` | Texto en tarjetas
| `--muted` | `#6B7280` | Texto secundario, íconos deshabilitados
| `--primary` | `#5E64FF` | Botones, enlaces activos
| `--primary-foreground` | `#FFFFFF` | Texto sobre primario
| `--accent` | `#4A50C0` | Hovers, indicadores de navegación
| `--success` | `#28A745` | Estados "pagado"
| `--pending` | `#FFC107` | Estados "pendiente"

### Gradientes sugeridos
- `--gradient-success`: `linear-gradient(90deg, #28A745, #218838)`
- `--gradient-pending`: `linear-gradient(90deg, #FFC107, #E0A800)`
- `--gradient-primary`: `linear-gradient(90deg, #5E64FF, #4A50C0)`

> Recomendación: mantener opacidades al 80–90% sobre fondos oscuros para evitar banding. Añadir sutil blur (8–12px) cuando se busque efecto glow.

## 3. Componentes Clave

### Navegación
- Fondo: `var(--background)` con blur ligero (backdrop-filter) para efecto glass.
- Ítems inactivos: color `var(--foreground)` al 70% de opacidad.
- Hover: `var(--gradient-primary)` aplicado como borde inferior de 2px o background al 10%.
- Activo: texto `var(--primary)` + glow sutil (`box-shadow: 0 0 12px rgba(94,100,255,0.35)`).

### Botones
- **Primario**: fondo `var(--primary)`; hover → `var(--gradient-primary)` + elevate 2px (`transform: translateY(-1px)`).
- **Secundario**: fondo transparente, borde `var(--primary)` (1.5px), hover con fondo `rgba(74,80,192,0.15)`.
- Radios suaves (8px) para seguir lenguaje de tarjetas.

### Tarjetas / Panels
- Fondo `var(--card)`, borde `1px solid rgba(255,255,255,0.07)`.
- Hover: `background: rgba(74,80,192,0.08)` + `box-shadow: 0 15px 30px rgba(0,0,0,0.25)`.
- Títulos en `var(--foreground)`; subtítulos `var(--muted)`.

### Badges de estado
- Pagado: `background: var(--gradient-success)`; iconografía blanca.
- Pendiente: `background: var(--gradient-pending)`; texto `#1A1A2E`.
- Uso consistente en dashboard, listas y toasts.

### Tablas / Listas
- Filas alternas: `rgba(255,255,255,0.02)`.
- Highlight on hover: borde `var(--accent)` al 30%.
- Totales negativos → texto `#FF6B6B` para contraste con fondo oscuro.

### Modales & Formularios
- Fondo `rgba(26,26,46,0.95)` con borde iluminado (`box-shadow inset 0 0 0 1px rgba(94,100,255,0.25)`).
- Inputs: fondo `#1F1F38`, borde `1px solid rgba(255,255,255,0.08)`, focus `border-color: var(--primary)`.

## 4. Animaciones y Microinteracciones

| Escenario | Recomendación |
| --- | --- |
| Hover en tarjetas | `transition: transform 180ms ease, box-shadow 180ms ease`; translateY(-2px)
| Botones | Añadir `background-position` animado para gradiente (0→100%) en 250 ms.
| Badges al actualizar estado | Fade/scale (opacity 0→1 + scale 0.95→1) en 200 ms.
| Loader principal | Spinner con `conic-gradient(var(--gradient-primary))` y `animation: spin 1.1s linear infinite`.

Mantener `prefers-reduced-motion` respetado: desactivar translate/opacity animaciones cuando el usuario lo solicite.

## 5. Accesibilidad
- Contraste mínimo AA: 4.5:1 para texto normal, 3:1 para titulares.
- Revisar primario sobre fondo oscuro (`#5E64FF` vs `#1A1A2E` ≈ 4.9:1 → OK).
- Añadir estados focus visibles (box-shadow `0 0 0 3px rgba(94,100,255,0.35)`).
- Revisar uso de amarillo `#FFC107`: sobre texto oscuro alcanza contraste 7+:1.

## 6. Implementación Técnica

```css
:root {
  --background: #1A1A2E;
  --foreground: #E0E0E0;
  --card: #2A2A4A;
  --card-foreground: #D0D0D0;
  --muted: #6B7280;
  --primary: #5E64FF;
  --primary-foreground: #FFFFFF;
  --accent: #4A50C0;
  --success: #28A745;
  --pending: #FFC107;

  --gradient-primary: linear-gradient(90deg, #5E64FF, #4A50C0);
  --gradient-success: linear-gradient(90deg, #28A745, #218838);
  --gradient-pending: linear-gradient(90deg, #FFC107, #E0A800);
}
```

Integrar estos tokens en `tailwind.config.js` (extend colors) o en los CSS tokens globales para garantizar consistencia.

## 7. Próximos Pasos Recomendados

1. **Crear tema en Tailwind**: mapear tokens a `--background`, `--primary`, etc.
2. **Actualizar layout base**: body, navbar y tarjetas principales.
3. **Migrar componentes críticos**: botones CTA, badges, cards de dashboard.
4. **Revisar microcopys y jerarquías**: adaptar pesos tipográficos para reforzar claridad.
5. **QA visual**: validar en pantallas retina y estándar, y en dark/light environments.

Con esta guía, el equipo puede diseñar y desarrollar el nuevo look & feel "Dark Serenity" manteniendo consistencia y escalabilidad.
