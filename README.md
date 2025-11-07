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
- **Onboarding guiado ( `/setup` )** para configurar modos de liquidación (pocillo o venta directa) y administrar staff.
- **Cierre Diario ( `/cierre` )** con formularios paralelos que cubren los dos flujos operativos del restaurante.
- **Autenticación básica** con pantallas de login y registro, validaciones mínimas y mensajes informativos.
- **Accesibilidad cuidada**: etiquetas, `aria-*`, soporte para teclado en el menú móvil y inputs consistentes.

## Tecnologías
- **React 19**, **TypeScript**, **Vite**
- **Tailwind CSS** para estilos utilitarios
- **Shadcn/UI** como librería de componentes (Card, Tabs, Calendar, etc.)
- **Lucide Icons** para iconografía

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

## Scripts Disponibles
- `npm run dev`: inicia el servidor de desarrollo con HMR.
- `npm run build`: compila a producción usando `tsc` y `vite build`.
- `npm run preview`: sirve la versión compilada.

## Guía de Desarrollo
- **Estilos**: usar clases de Tailwind. Evitar CSS plano salvo casos muy específicos.
- **Componentes**: preferir los de Shadcn/UI y mantener consistencia en variantes.
- **Accesibilidad**: cada input debe tener su `Label`; usar `aria-label` en enlaces o botones iconográficos.
- **Estado**: actualmente se maneja con `useState`; la conexión a APIs se implementará en iteraciones posteriores.

## Próximos Pasos
1. Integrar API real para persistir configuraciones y cierres.
2. Añadir notificaciones de éxito/error (por ejemplo, Shadcn `sonner`).
3. Implementar pruebas unitarias para componentes críticos.
4. Incorporar autenticación real y protección de rutas sensibles.

---

Para detalles técnicos adicionales ver [DOCUMENTACION.md](./DOCUMENTACION.md).
