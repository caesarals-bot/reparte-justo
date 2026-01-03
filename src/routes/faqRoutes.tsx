// FAQ Routes - Simple integration
import { lazy } from 'react'

// Lazy loaded components
export const FAQPage = lazy(() => import('@/components/faq/FAQPage').then(module => ({ default: module.FAQPage })))
export const FAQManagement = lazy(() => import('@/admin/faq/FAQManagement').then(module => ({ default: module.FAQManagement })))

// FAQ route configurations for existing router
export const faqRoutes = [
  {
    path: '/faq',
    element: <FAQPage />,
    index: true
  },
  {
    path: '/admin/faq',
    element: <FAQManagement />
  }
]
