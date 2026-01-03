import { useState, useEffect } from 'react'
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/context/AuthContext'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  isActive: boolean
  views: number
  helpful: number
  notHelpful: number
  tags: string[]
  createdAt: any
  order?: number
}

export function FAQPage() {
  const {} = useAuth()
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{ [key: string]: 'helpful' | 'notHelpful' | null }>({})
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    // Cargar FAQs solo al entrar a la página
    loadFAQs()
  }, [])

  // Escuchar cambios en localStorage para actualización inmediata
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'faq_updated') {
        console.log('🔄 FAQ actualizada, recargando...')
        loadFAQs()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const loadFAQs = async () => {
    try {
      // Query simple sin where ni orderBy para evitar índices
      const q = query(collection(db, 'faqs'))

      const querySnapshot = await getDocs(q)

      const faqsData = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          question: data.question,
          answer: data.answer,
          category: data.category,
          isActive: data.isActive,
          views: data.views ?? 0,
          helpful: data.helpful ?? 0,
          notHelpful: data.notHelpful ?? 0,
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt,
          order: data.order
        }
      }) as FAQ[]

      // Filtrar FAQs activas (si no existe isActive, asumimos activa)
      const activeFAQs = faqsData.filter(faq => faq.isActive !== false)

      // Ordenar por order y createdAt en JavaScript
      const sortedFAQs = activeFAQs.sort((a, b) => {
        // Primero por order (si existe)
        if (a.order !== null && a.order !== undefined && b.order !== null && b.order !== undefined) {
          return a.order - b.order
        }
        // Si no hay order o es null, por createdAt
        if (a.createdAt?.toMillis && b.createdAt?.toMillis) {
          return b.createdAt.toMillis() - a.createdAt.toMillis()
        }
        return 0
      })

      setFaqs(sortedFAQs)
      setLastUpdate(new Date())

    } catch (error) {
      console.error('❌ Error detallado al cargar FAQs:', error)
      console.error('❌ Error code:', (error as any).code)
      console.error('❌ Error message:', (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
      // Incrementar vistas
      incrementViews(id)
    }
    setExpandedItems(newExpanded)
  }

  const incrementViews = async (faqId: string) => {
    try {
      const faqRef = doc(db, 'faqs', faqId)
      await updateDoc(faqRef, {
        views: (faqs.find(f => f.id === faqId)?.views || 0) + 1,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error al incrementar vistas:', error)
    }
  }

  const handleFeedback = async (faqId: string, type: 'helpful' | 'notHelpful') => {
    if (feedback[faqId]) return // Ya votó

    try {
      const faqRef = doc(db, 'faqs', faqId)
      const faq = faqs.find(f => f.id === faqId)

      if (faq) {
        await updateDoc(faqRef, {
          helpful: type === 'helpful' ? faq.helpful + 1 : faq.helpful,
          notHelpful: type === 'notHelpful' ? faq.notHelpful + 1 : faq.notHelpful,
          updatedAt: serverTimestamp()
        })

        setFeedback(prev => ({ ...prev, [faqId]: type }))

        // Actualizar estado local
        setFaqs(prev => prev.map(f => 
          f.id === faqId 
            ? { ...f, helpful: type === 'helpful' ? f.helpful + 1 : f.helpful, notHelpful: type === 'notHelpful' ? f.notHelpful + 1 : f.notHelpful }
            : f
        ))
      }
    } catch (error) {
      console.error('Error al guardar feedback:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            Cargando preguntas frecuentes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center">
              <h1 className="text-4xl font-bold mb-4">
                ❓ Preguntas Frecuentes
              </h1>
              <p className="text-lg text-blue-100 mb-6">
                Encuentra respuestas a las preguntas más comunes sobre ReparteJusto
              </p>
              {/* Controles */}
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={loadFAQs}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-semibold"
                >
                  🔄 Actualizar FAQs
                </button>
              </div>
              <div className="text-sm text-blue-200 mt-4">
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>

            {/* Botón de Contacto */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl shadow-xl flex flex-col items-center justify-center text-center">
              <h3 className="text-xl font-semibold mb-3">🤝 ¿No encontraste lo que buscabas?</h3>
              <p className="text-purple-100 mb-4">
                Si tienes una pregunta nueva o necesitas ayuda adicional, no dudes en contactarnos.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-semibold"
              >
                📧 Contactar Soporte
              </a>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg text-gray-300">
              Cargando preguntas frecuentes...
            </p>
          </div>
        )}

        {/* No FAQs State */}
        {!loading && faqs.length === 0 && (
          <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
            <div className="text-6xl mb-6">📭</div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              No hay preguntas frecuentes disponibles
            </h2>
            <p className="text-gray-400 mb-8">
              Pronto agregaremos contenido útil para ti
            </p>
          </div>
        )}

        {/* FAQs List */}
        {!loading && faqs.length > 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-400">
                Se encontraron {faqs.length} {faqs.length === 1 ? 'pregunta frecuente' : 'preguntas frecuentes'}
              </p>
            </div>
            
            {faqs.map((faq, index) => (
              <div key={faq.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden hover:border-blue-600 transition-colors">
                {/* FAQ Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => toggleExpanded(faq.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-white">
                          {faq.question}
                        </h3>
                      </div>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {faq.tags.map((tag, tagIndex) => (
                          <span 
                            key={tagIndex}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-gray-300"
                          >
                            🏷️ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        👁️ {faq.views} vistas
                      </span>
                      <span className="text-2xl text-gray-400">
                        {expandedItems.has(faq.id) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* FAQ Content */}
                {expandedItems.has(faq.id) && (
                  <div className="px-6 pb-6 border-t border-slate-700">
                    <div className="pt-4">
                      {/* Answer */}
                      <div 
                        className="prose prose-invert max-w-none text-gray-300"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                      
                      {/* Feedback Section */}
                      <div className="mt-6 pt-6 border-t border-slate-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">
                              ¿Esta respuesta fue útil?
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFeedback(faq.id, 'helpful')
                                }}
                                disabled={feedback[faq.id] !== null}
                                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                                  feedback[faq.id] === 'helpful' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                }`}
                              >
                                👍 Sí ({faq.helpful})
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFeedback(faq.id, 'notHelpful')
                                }}
                                disabled={feedback[faq.id] !== null}
                                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                                  feedback[faq.id] === 'notHelpful' 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                }`}
                              >
                                👎 No ({faq.notHelpful})
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {feedback[faq.id] ? 'Gracias por tu feedback' : 'Tu opinión nos ayuda a mejorar'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Footer Stats */}
        {!loading && faqs.length > 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 px-6 py-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-sm text-gray-400">
                <span className="font-semibold text-white">{faqs.length}</span> FAQs
              </div>
              <div className="text-sm text-gray-400">
                <span className="font-semibold text-white">{faqs.reduce((sum, f) => sum + f.views, 0)}</span> vistas totales
              </div>
              <div className="text-sm text-gray-400">
                <span className="font-semibold text-white">{faqs.reduce((sum, f) => sum + f.helpful, 0)}</span> votos útiles
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
