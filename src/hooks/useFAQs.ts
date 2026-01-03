import { useState, useEffect, useCallback } from 'react'
import { FAQService } from '@/services/faqService'
import type { FAQ, FAQCategory, FAQFilter } from '@/types/faq'

export function useFAQs(filter?: FAQFilter) {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFAQs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.getActiveFAQs(filter)
      setFaqs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading FAQs')
    } finally {
      setLoading(false)
    }
  }, [filter?.category, filter?.locale])

  useEffect(() => {
    loadFAQs()
  }, [loadFAQs])

  return { faqs, loading, error, refetch: loadFAQs }
}

export function useFAQSearch() {
  const [results, setResults] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (query: string, locale?: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.searchFAQs(query, locale)
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error searching FAQs')
    } finally {
      setLoading(false)
    }
  }

  return { results, loading, error, search, clearResults: () => setResults([]) }
}

export function useFAQCategories() {
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.getCategories()
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

  return { categories, loading, error, refetch: loadCategories }
}

export function useFAQAnalytics(faqId: string) {
  const [analytics, setAnalytics] = useState<{
    views: number
    helpful: number
    notHelpful: number
    helpfulRatio: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await FAQService.getFAQAnalytics(faqId)
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading analytics')
    } finally {
      setLoading(false)
    }
  }, [faqId])

  useEffect(() => {
    if (faqId) {
      loadAnalytics()
    }
  }, [faqId, loadAnalytics])

  const markViewed = async () => {
    try {
      await FAQService.incrementViews(faqId)
      if (analytics) {
        setAnalytics({
          ...analytics,
          views: analytics.views + 1
        })
      }
    } catch (err) {
      console.error('Error marking FAQ as viewed:', err)
    }
  }

  const markHelpful = async (helpful: boolean) => {
    try {
      await FAQService.markHelpful(faqId, helpful)
      if (analytics) {
        setAnalytics({
          ...analytics,
          helpful: helpful ? analytics.helpful + 1 : analytics.helpful,
          notHelpful: !helpful ? analytics.notHelpful + 1 : analytics.notHelpful,
          helpfulRatio: Math.round(((helpful ? analytics.helpful + 1 : analytics.helpful) / 
            ((helpful ? analytics.helpful + 1 : analytics.helpful) + 
             (!helpful ? analytics.notHelpful + 1 : analytics.notHelpful))) * 100)
        })
      }
    } catch (err) {
      console.error('Error marking FAQ feedback:', err)
    }
  }

  return { analytics, loading, error, markViewed, markHelpful }
}
