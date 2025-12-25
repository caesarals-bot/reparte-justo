# Base SEO lista para comercial

Fecha: 24 dic 2025
Estado: implementado en rama `feature/seo-demo` y build validado.

## Qué ya está en producción de la rama
- `lang="es"` y título base descriptivo en `index.html`.
- Componente `Seo` (React 19 hoistea `<title>/<meta>/<link>` al `<head>` sin dependencias).
- Landing con metadatos completos (title, description, canonical, OG/Twitter) + JSON-LD de `SoftwareApplication` y `Organization`.
- Sección de características con ancla `#features` para enlazado interno.
- Ruta `/demo` con CTA “Agenda tu demo” y “Probar gratis”, enlazada desde héroe, navbar y footer.

## Uso rápido del componente `Seo`
Archivo: `src/components/Seo.tsx`
Props: `title`, `description`, opcionales `canonicalUrl`, `ogImage`, `ogType`, `siteName`, `twitterHandle`, `jsonLd`, `noIndex`.
Ejemplo:
```tsx
<Seo
  title="Título de la página"
  description="Descripción concisa (150-160 caracteres)."
  canonicalUrl="https://repartejusto.com/ruta"
  ogImage="https://repartejusto.com/og.png"
  siteName="ReparteJusto"
  jsonLd={{ "@context": "https://schema.org", "@type": "Article", name: "..." }}
/>
```

## Mensaje y promesa para campañas
- Valor: "Reparto transparente de propinas con trazabilidad para sala y cocina".
- Prueba: demo guiada + checklist + grabación; free trial disponible.
- Confianza: historial inmutable, ponderaciones configurables, roles con permisos claros.

## Próximos pasos recomendados
1) **Páginas de intención**: crear `/precios`, `/casos/restaurante-x`, `/seguridad`, cada una con `Seo` y OG específicos.
2) **Imágenes OG**: generar assets por ruta (1200x630) con copy/claim consistente.
3) **Schema**: añadir `BreadcrumbList` y `FAQPage` en páginas de intención; mantener `SoftwareApplication`/`Organization` en landing.
4) **Velocidad**: revisar splitting para reducir bundle (>500 kB advertido en build) y servir imágenes optimizadas.
5) **Tracking**: agregar `utm` en CTA de campañas hacia `/demo` y medir conversión demo→registro.

## Checklist mínimo por página nueva
- `Seo` con `title` (<= 60 chars) y `description` (150-160 chars).
- `canonicalUrl` absoluta.
- `og:image` real y accesible.
- JSON-LD si aplica (producto, FAQ, artículo, breadcrumb).
- Enlazado interno desde navbar/footer o secciones relevantes.
