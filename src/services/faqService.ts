import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { FAQ, FAQCategory, FAQFilter, FAQSort } from '@/types/faq'

export class FAQService {
  // === FAQs Públicos ===
  
  static async getActiveFAQs(filter?: FAQFilter): Promise<FAQ[]> {
    const constraints = [
      where('isActive', '==', true),
      orderBy('order', 'asc'),
      orderBy('question', 'asc')
    ]

    if (filter?.category) {
      constraints.push(where('category', '==', filter.category))
    }

    if (filter?.locale) {
      constraints.push(where('locale', '==', filter.locale))
    }

    const q = query(collection(db, 'faqs'), ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQ
    })
  }

  static async getFAQsByCategory(categoryId: string, locale?: string): Promise<FAQ[]> {
    const constraints = [
      where('category', '==', categoryId),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    ]

    if (locale) {
      constraints.push(where('locale', '==', locale))
    }

    const q = query(collection(db, 'faqs'), ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQ
    })
  }

  static async searchFAQs(searchQuery: string, locale?: string): Promise<FAQ[]> {
    // Para búsqueda simple, obtenemos todos los FAQs y filtramos client-side
    // En producción, considerar Algolia o similar para búsqueda avanzada
    const constraints = [
      where('isActive', '==', true),
      orderBy('order', 'asc')
    ]

    if (locale) {
      constraints.push(where('locale', '==', locale))
    }

    const q = query(collection(db, 'faqs'), ...constraints)
    const snapshot = await getDocs(q)
    
    const allFAQs = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQ
    })

    // Filtrado client-side (case-insensitive)
    const queryLower = searchQuery.toLowerCase()
    return allFAQs.filter(faq => 
      faq.question.toLowerCase().includes(queryLower) ||
      faq.answer.toLowerCase().includes(queryLower) ||
      faq.tags.some(tag => tag.toLowerCase().includes(queryLower))
    )
  }

  static async getTopFAQs(limitCount = 10): Promise<FAQ[]> {
    const q = query(
      collection(db, 'faqs'),
      where('isActive', '==', true),
      orderBy('views', 'desc'),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQ
    })
  }

  // === Admin FAQs ===
  
  static async getAllFAQs(sort?: FAQSort): Promise<FAQ[]> {
    const constraints = []
    
    if (sort) {
      constraints.push(orderBy(sort.field, sort.direction))
    } else {
      constraints.push(orderBy('order', 'asc'))
    }

    const q = query(collection(db, 'faqs'), ...constraints)
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQ
    })
  }

  static async createFAQ(faq: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'faqs'), {
      ...faq,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    return docRef.id
  }

  static async updateFAQ(id: string, updates: Partial<Omit<FAQ, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, 'faqs', id)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  }

  static async deleteFAQ(id: string): Promise<void> {
    await deleteDoc(doc(db, 'faqs', id))
  }

  static async reorderFAQs(faqs: Array<{ id: string; order: number }>): Promise<void> {
    const batch = faqs.map(({ id, order }) => 
      updateDoc(doc(db, 'faqs', id), { order, updatedAt: serverTimestamp() })
    )
    
    await Promise.all(batch)
  }

  static async toggleFAQStatus(id: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'faqs', id), {
      isActive,
      updatedAt: serverTimestamp(),
    })
  }

  // === Categorías ===
  
  static async getCategories(): Promise<FAQCategory[]> {
    const q = query(
      collection(db, 'faqCategories'),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    )
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQCategory
    })
  }

  static async getAllCategories(): Promise<FAQCategory[]> {
    const q = query(collection(db, 'faqCategories'), orderBy('order', 'asc'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as FAQCategory
    })
  }

  static async createCategory(category: Omit<FAQCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'faqCategories'), {
      ...category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    return docRef.id
  }

  static async updateCategory(id: string, updates: Partial<Omit<FAQCategory, 'id' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, 'faqCategories', id)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  }

  static async deleteCategory(id: string): Promise<void> {
    // Verificar que no haya FAQs usando esta categoría
    const faqsQuery = query(collection(db, 'faqs'), where('category', '==', id))
    const faqsSnapshot = await getDocs(faqsQuery)
    
    if (!faqsSnapshot.empty) {
      throw new Error('No se puede eliminar la categoría porque está siendo utilizada por FAQs')
    }
    
    await deleteDoc(doc(db, 'faqCategories', id))
  }

  static async reorderCategories(categories: Array<{ id: string; order: number }>): Promise<void> {
    const batch = categories.map(({ id, order }) => 
      updateDoc(doc(db, 'faqCategories', id), { order, updatedAt: serverTimestamp() })
    )
    
    await Promise.all(batch)
  }

  // === Analytics y Feedback ===
  
  static async incrementViews(id: string): Promise<void> {
    await updateDoc(doc(db, 'faqs', id), {
      views: increment(1),
    })
  }

  static async markHelpful(id: string, helpful: boolean): Promise<void> {
    const field = helpful ? 'helpful' : 'notHelpful'
    await updateDoc(doc(db, 'faqs', id), {
      [field]: increment(1),
    })
  }

  static async getFAQAnalytics(id: string): Promise<{
    views: number
    helpful: number
    notHelpful: number
    helpfulRatio: number
  }> {
    const docRef = doc(db, 'faqs', id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      throw new Error('FAQ not found')
    }
    
    const data = docSnap.data()
    const views = data.views || 0
    const helpful = data.helpful || 0
    const notHelpful = data.notHelpful || 0
    const total = helpful + notHelpful
    const helpfulRatio = total > 0 ? Math.round((helpful / total) * 100) : 0
    
    return { views, helpful, notHelpful, helpfulRatio }
  }

  // === Import/Export ===
  
  static async exportFAQs(): Promise<FAQ[]> {
    return this.getAllFAQs()
  }

  static async importFAQs(faqs: Array<Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>>): Promise<string[]> {
    const createdIds: string[] = []
    
    for (const faq of faqs) {
      const id = await this.createFAQ(faq)
      createdIds.push(id)
    }
    
    return createdIds
  }
}
