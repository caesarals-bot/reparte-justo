import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppPropina from './AppPronina.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppPropina />
  </StrictMode>,
)
