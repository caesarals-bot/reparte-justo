# ReparteJusto Frontend

Aplicación web orientada a restaurantes para gestionar la distribución transparente de propinas y cierres diarios. Construida sobre React, TypeScript y Vite, incorpora componentes de Shadcn/UI y estilos con Tailwind CSS para ofrecer una experiencia moderna, accesible y responsiva.

## Tabla de Contenidos
1. [Características Principales](#características-principales)
2. [Tecnologías](#tecnologías)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Primeros Pasos](#primeros-pasos)
5. [Scripts Disponibles](#scripts-disponibles)
6. [Guía de Desarrollo](#guía-de-desarrollo)
7. [Próximos Pasos](#próximos-pasos)

## Características Principales
- **Landing responsiva** con navegación sticky, héroe informativo y secciones de valor del producto.
- **Onboarding guiado ( `/setup` )** con persistencia en Firestore para nombre del restaurante, deducciones y staff (roles, emails, ponderaciones).
- **Cierre Diario ( `/cierre` )** conectado a la configuración guardada, calcula propinas cocina/garzones aplicando descuentos y muestra montos asignados por persona.
- **Dashboard administrativo (en progreso)** con páginas base para overview, restaurantes y usuarios.
- **Accesibilidad cuidada**: etiquetas, `aria-*`, soporte para teclado en el menú móvil y inputs consistentes.

## Tecnologías
- **React 19**, **TypeScript**, **Vite**
- **Tailwind CSS** para estilos utilitarios
- **Shadcn/UI** como librería de componentes (Card, Tabs, Calendar, etc.)
- **Lucide Icons** para iconografía
- **Firebase** (Auth + Firestore) como backend-as-a-service

## Estructura del Proyecto
```
src/
 ├─ appPropinaSegura/
 │   ├─ cierre/               # página de Cierre Diario
 │   ├─ component/navbar/     # NavBar y Footer
 │   ├─ features/
 │   ├─ hero/
 │   ├─ home/
 │   └─ setup/                # Configuración inicial
 ├─ auth/                     # Login y Register
 ├─ components/ui/            # Shadcn/UI
 ├─ router/                   # Definición de rutas
 └─ main.tsx, index.css
```

## Primeros Pasos

```bash
npm install
npm run dev
```

La aplicación quedará disponible usualmente en `http://localhost:5173`.

### Variables de entorno (Firebase)
Crear un archivo `.env` o `.env.local` con las claves de Firebase (ver `src/firebase/config.ts`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

> Consulta **AGENT.md** para lineamientos de contribución adicionales (naming, estilos, accesibilidad).

## Scripts Disponibles
- `npm run dev`: inicia el servidor de desarrollo con HMR.
- `npm run build`: compila a producción usando `tsc` y `vite build`.
- `npm run preview`: sirve la versión compilada.

## Guía de Desarrollo
- **Estilos**: usar clases de Tailwind. Evitar CSS plano salvo casos muy específicos.
- **Componentes**: preferir los de Shadcn/UI y mantener consistencia en variantes.
- **Accesibilidad**: cada input debe tener su `Label`; usar `aria-label` en enlaces o botones iconográficos.
- **Estado**: actualmente se maneja con `useState`; la conexión a APIs se implementará en iteraciones posteriores.

## Estado Actual & Próximos Pasos

### Hoy
- Configuración inicial persiste en Firestore y se reutiliza en el cierre diario.
- El cierre calcula propinas netas (cocina/garzones) aplicando descuentos y ponderaciones.
- Se creó el documento `plan-manana.md` con el roadmap inmediato.

### Mañana / Iteración inmediata
1. Implementar Cloud Function `guardarCierreDiario` para generar snapshots auditables y actualizar totales no liquidados.
2. Integrar el frontend del cierre con la API real (guardar vs. pagar) y mostrar feedback.
3. Diseñar/implementar dashboard con “Total No Liquidado” y flujo de “Liquidar Período”.
4. Versionar configuración utilizada y registrar actividad (timestamps, usuario encargado).

### Más adelante
- Añadir notificaciones de éxito/error (Shadcn `sonner`).
- Implementar pruebas unitarias para componentes críticos.
- Incorporar protección de rutas y autorización por roles.

---

Para detalles técnicos adicionales ver [DOCUMENTACION.md](./DOCUMENTACION.md).
