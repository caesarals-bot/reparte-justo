# Staff Management Notes

## Datos extendidos
- Cada integrante del staff ahora cuenta con `email?`, `isActive` y `inactiveSince?`.
- Los mapeos `mapStoredStaffMember` y `mapStaffMemberForStorage` normalizan email y fechas para Firestore.

## Permisos sensibles
- Solo usuarios listados en `staffEditors` (máximo 2) pueden editar correo, estado y accesos sensibles.
- El hook `useStaffEditors` expone:
  - `staffInputsDisabled` para deshabilitar formularios.
  - Handlers `handleNewStaffEditorChange`, `handleAddStaffEditor`, `handleRemoveStaffEditor` con validaciones.

## Formularios de staff
- `useStaffForms` centraliza los formularios de servicio/soporte:
  - Estados `serviceStaffForm` y `supportStaffForm` con labels formateados.
  - `handleStaffFormChange` acepta campo categoria y actualiza fechas, switches y textos.
  - `resetStaffForm` reinicia según categoría y rol por defecto.
- Los componentes consumen estos hooks para mantener `InitialSetupPage` limitado a orquestación.
