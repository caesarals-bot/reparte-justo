# Plan de Optimización de Rendimiento Móvil - ReparteJusto

## Análisis del Estado Actual

### **Problemas Identificados:**
- **Score Performance: 67/100** (móvil)
- **FCP: 4.7s, LCP: 5.3s** (crítico)
- **Chunks > 500KB**: 3 archivos problemáticos detectados
- **Bundle principal: 671KB** (excesivo para móvil)

### **Causas Raíz:**
- **LiquidacionPage.js: 460KB** (muy pesada)
- **LiquidationTrendChart.js: 359KB** (gráficos pesados)
- **CierreDiarioPage.js: 99KB** (lógica compleja)
- **Sin code splitting** (todo carga inicialmente)

---

## PLAN ESTRATÉGICO DE OPTIMIZACIÓN

### **FASE 1: Optimización Crítica (Impacto Inmediato)**

#### **Micro Plan 1.1: Code Splitting Urgente**
- **Objetivo**: Reducir bundle inicial de 671KB a < 200KB
- **Acciones**:
  - Implementar `dynamic import()` para rutas pesadas
  - Separar componentes de gráficos (`recharts`)
  - Lazy loading para páginas no críticas
- **Resultado esperado**: FCP 4.7s → 2.5s

#### **Micro Plan 1.2: Optimización de Imágenes**
- **Objetivo**: Reducir peso visual 40-60%
- **Acciones**:
  - Implementar WebP/AVIF format
  - Lazy loading para imágenes below-fold
  - Responsive images con srcset
- **Resultado esperado**: LCP 5.3s → 3s

#### **Micro Plan 1.3: CSS Crítico + Async**
- **Objetivo**: Eliminar render-blocking CSS
- **Acciones**:
  - Extraer CSS above-the-fold (inline)
  - Async loading para Tailwind no crítico
  - Purge CSS no utilizado
- **Resultado esperado**: FCP mejora 20-30%

---

### **FASE 2: Optimización Intermedia**

#### **Micro Plan 2.1: Component Library Optimization**
- **Objetivo**: Reducir peso de Radix UI + Shadcn
- **Acciones**:
  - Tree shaking de componentes no usados
  - Bundle splitting por componente
  - Custom components vs librerías pesadas
- **Resultado esperado**: Bundle -15-20%

#### **Micro Plan 2.2: Firebase SDK Optimization**
- **Objetivo**: Optimizar carga de Firebase
- **Acciones**:
  - Modular imports (auth, firestore separados)
  - SDK splitting por feature
  - Cache estratégico de SDK
- **Resultado esperado**: Bundle -10-15%

#### **Micro Plan 2.3: Chart Library Optimization**
- **Objetivo**: Reducir peso de recharts (359KB)
- **Acciones**:
  - Dynamic import para gráficos
  - Custom chart components más ligeros
  - SVG inline vs librería completa
- **Resultado esperado**: Gráficos -60%

---

### **FASE 3: Optimización Avanzada**

#### **Micro Plan 3.1: Service Worker + Caching**
- **Objetivo**: Estrategia de cache completa
- **Acciones**:
  - Service Worker para assets estáticos
  - Cache-first para imágenes/icons
  - Network-first para datos dinámicos
- **Resultado esperado**: LCP segunda visita < 1s

#### **Micro Plan 3.2: Server Optimization**
- **Objetivo**: Reducir Time to First Byte
- **Acciones**:
  - CDN implementation
  - Compression (Brotli)
  - HTTP/2 push para críticos
- **Resultado esperado**: TTFB < 200ms

#### **Micro Plan 3.3: Performance Monitoring**
- **Objetivo**: Métricas continuas
- **Acciones**:
  - Real User Monitoring (RUM)
  - Performance budgets automáticos
  - Core Web Vitals tracking
- **Resultado esperado**: Score sostenido > 85

---

## IMPLEMENTACIÓN PRIORIZADA

### **Sprint 1 (Semana 1): Code Splitting Crítico**
```typescript
// Antes: Todo carga junto
import LiquidacionPage from './LiquidacionPage';

// Después: Dynamic import
const LiquidacionPage = lazy(() => import('./LiquidacionPage'));
```

### **Sprint 2 (Semana 2): Imágenes + CSS**
- Implementar WebP + lazy loading
- CSS crítico inline
- Tailwind purging

### **Sprint 3 (Semana 3): Librerías**
- Optimizar recharts
- Firebase modular
- Radix UI tree shaking

### **Sprint 4 (Semana 4): Cache + CDN**
- Service Worker
- CDN setup
- Brotli compression

---

## MÉTRICAS DE ÉXITO

### **Objetivos Finales:**
- **Performance Score**: 67 → 85+
- **FCP**: 4.7s → < 2.5s
- **LCP**: 5.3s → < 3s
- **Bundle inicial**: 671KB → < 200KB
- **Chunks pesados**: 0 (todos < 500KB)

### **KPIs de Negocio:**
- **Tasa de rebote móvil**: -30%
- **Tiempo en página**: +40%
- **Conversiones**: +25%
- **SEO ranking**: Mejora Core Web Vitals

---

## RIESGOS Y MITIGACIÓN

### **Riesgos:**
- **Regresiones funcionales** en code splitting
- **Compatibilidad** con browsers antiguos
- **Complejidad** de mantenimiento

### **Mitigación:**
- **Testing automatizado** por cada cambio
- **Feature flags** para rollbacks rápidos
- **Performance budgets** en CI/CD
- **Monitorización continua** en producción

---

## ESTADO ACTUAL

- **Fecha creación**: 2 de enero de 2026
- **Rama**: `feature/performance-optimization`
- **Estado**: Planificación completa
- **Próximo paso**: Sprint 1 - Code Splitting

## CHECKLIST DE IMPLEMENTACIÓN

### **Sprint 1 - Code Splitting**
- [ ] Configurar lazy loading para rutas pesadas
- [ ] Separar componentes de gráficos
- [ ] Implementar Suspense con loading states
- [ ] Configurar manual chunks en Vite
- [ ] Testear funcionalidad post-splitting

### **Sprint 2 - Imágenes + CSS**
- [ ] Implementar WebP/AVIF formats
- [ ] Configurar lazy loading para imágenes
- [ ] Extraer CSS crítico inline
- [ ] Implementar async CSS loading
- [ ] Configurar Tailwind purging

### **Sprint 3 - Librerías**
- [ ] Optimizar imports de Firebase
- [ ] Reducir peso de recharts
- [ ] Tree shaking de Radix UI
- [ ] Custom components livianos
- [ ] Bundle analysis post-optimización

### **Sprint 4 - Cache + CDN**
- [ ] Implementar Service Worker
- [ ] Configurar estrategia de cache
- [ ] Setup CDN (si aplica)
- [ ] Habilitar Brotli compression
- [ ] Monitorización continua

---

## RECURSOS

### **Herramientas de Análisis:**
- PageSpeed Insights
- Lighthouse CI
- Bundle Analyzer
- Web Vitals extension

### **Documentación:**
- Vite Code Splitting Guide
- Web Performance Best Practices
- Core Web Vitals Documentation
- Firebase Performance Guide
