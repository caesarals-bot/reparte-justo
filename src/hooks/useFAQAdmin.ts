import { useState, useEffect, useCallback } from 'react'
import { FAQService } from '@/services/faqService'
import type { FAQ, FAQCategory, FAQSort } from '@/types/faq'

export function useFAQAdmin() {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFAQs = useCallback(async (sort?: FAQSort) => {
    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.getAllFAQs(sort)
      setFaqs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading FAQs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFAQs()
  }, [loadFAQs])

  const createFAQ = async (faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await FAQService.createFAQ(faq)
      await loadFAQs() // Refresh list
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating FAQ')
      throw err
    }
  }

  const updateFAQ = async (id: string, updates: Partial<Omit<FAQ, 'id' | 'createdAt'>>) => {
    try {
      await FAQService.updateFAQ(id, updates)
      await loadFAQs() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating FAQ')
      throw err
    }
  }

  const deleteFAQ = async (id: string) => {
    try {
      await FAQService.deleteFAQ(id)
      await loadFAQs() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting FAQ')
      throw err
    }
  }

  const toggleStatus = async (id: string, isActive: boolean) => {
    try {
      await FAQService.toggleFAQStatus(id, isActive)
      await loadFAQs() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating FAQ status')
      throw err
    }
  }

  const reorderFAQs = async (reorderedFaqs: Array<{ id: string; order: number }>) => {
    try {
      await FAQService.reorderFAQs(reorderedFaqs)
      await loadFAQs() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reordering FAQs')
      throw err
    }
  }

  return { 
    faqs, 
    loading, 
    error, 
    createFAQ, 
    updateFAQ, 
    deleteFAQ, 
    toggleStatus, 
    reorderFAQs,
    refetch: loadFAQs 
  }
}

export function useFAQCategoriesAdmin() {
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.getAllCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const createCategory = async (category: Omit<FAQCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const id = await FAQService.createCategory(category)
      await loadCategories() // Refresh list
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating category')
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Omit<FAQCategory, 'id' | 'createdAt'>>) => {
    try {
      await FAQService.updateCategory(id, updates)
      await loadCategories() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating category')
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      await FAQService.deleteCategory(id)
      await loadCategories() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting category')
      throw err
    }
  }

  const reorderCategories = async (reorderedCategories: Array<{ id: string; order: number }>) => {
    try {
      await FAQService.reorderCategories(reorderedCategories)
      await loadCategories() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reordering categories')
      throw err
    }
  }

  return { 
    categories, 
    loading, 
    error, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    reorderCategories,
    refetch: loadCategories 
  }
}

export function useFAQImportExport() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const exportFAQs = async () => {
    try {
      setLoading(true)
      setError(null)
      const faqs = await FAQService.exportFAQs()
      
      // Convert to JSON and download
      const dataStr = JSON.stringify(faqs, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `faqs-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      return faqs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exporting FAQs')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const importFAQs = async (file: File) => {
    try {
      setLoading(true)
      setError(null)
      setProgress(0)

      // Read file
      const text = await file.text()
      const faqs = JSON.parse(text) as Array<Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>>
      
      // Validate structure
      if (!Array.isArray(faqs)) {
        throw new Error('Invalid file format')
      }

      setProgress(25)
      
      // Import FAQs in batches to avoid overwhelming Firebase
      const batchSize = 10
      const importedIds: string[] = []
      
      for (let i = 0; i < faqs.length; i += batchSize) {
        const batch = faqs.slice(i, i + batchSize)
        const batchIds = await FAQService.importFAQs(batch)
        importedIds.push(...batchIds)
        
        setProgress(25 + Math.floor((i + batchSize) / faqs.length * 75))
      }
      
      setProgress(100)
      return importedIds
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error importing FAQs')
      throw err
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return { exportFAQs, importFAQs, loading, error, progress }
}
