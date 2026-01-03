// FAQ System Types
export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  views: number
  helpful: number
  notHelpful: number
  tags: string[]
  locale: 'es' | 'en'
}

export interface FAQCategory {
  id: string
  name: string
  description: string
  icon: string
  order: number
  isActive: boolean
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface FAQFormData {
  question: string
  answer: string
  category: string
  tags: string[]
  isActive: boolean
  order: number
  locale: 'es' | 'en'
}

export interface FAQSearchResult {
  faqs: FAQ[]
  total: number
  categories: FAQCategory[]
}

export interface FAQAnalytics {
  totalViews: number
  totalHelpful: number
  totalNotHelpful: number
  topFAQs: FAQ[]
  searchQueries: Array<{
    query: string
    count: number
    hasResults: boolean
  }>
  categoryStats: Array<{
    categoryId: string
    categoryName: string
    views: number
    helpful: number
  }>
}

export interface FAQFilter {
  category?: string
  tags?: string[]
  locale?: 'es' | 'en'
  isActive?: boolean
}

export interface FAQSort {
  field: 'order' | 'question' | 'views' | 'helpful' | 'createdAt'
  direction: 'asc' | 'desc'
}
