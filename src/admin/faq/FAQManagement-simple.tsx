import { useState, useEffect } from 'react'
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/context/AuthContext'

interface FAQ {
  id: string
  question: string
  answer: string
  category: string
  isActive: boolean
  tags: string[]
  createdAt: any
  views: number
  helpful: number
  notHelpful: number
}

export function FAQManagement() {
  const { user, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'cat_general',
    isActive: true,
    tags: ''
  })
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Debug: Mostrar información del usuario
  useEffect(() => {
    console.log('🔍 Debug - Usuario actual:', user)
    console.log('🔍 Debug - Autenticado:', isAuthenticated)
    console.log('🔍 Debug - UID:', user?.uid)
    console.log('🔍 Debug - Email:', user?.email)
  }, [user, isAuthenticated])

  // Cargar FAQs existentes
  const loadFAQs = async () => {
    try {
      const q = query(collection(db, 'faqs'), orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      const faqsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FAQ[]
      setFaqs(faqsData)
    } catch (error) {
      console.error('Error al cargar FAQs:', error)
    }
  }

  // Cargar FAQs al montar
  useEffect(() => {
    loadFAQs()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (editingId) {
        // Editar FAQ existente
        const faqRef = doc(db, 'faqs', editingId)
        await updateDoc(faqRef, {
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          isActive: formData.isActive,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          updatedBy: 'admin',
          updatedAt: serverTimestamp()
        })
        setMessage('✅ FAQ actualizada exitosamente')
        setEditingId(null)
      } else {
        // Crear nueva FAQ
        await addDoc(collection(db, 'faqs'), {
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          isActive: formData.isActive,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          views: 0,
          helpful: 0,
          notHelpful: 0,
          locale: 'es',
          createdBy: 'admin',
          updatedBy: 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        setMessage('✅ FAQ creada exitosamente')
      }
      
      // Disparar actualización inmediata en página FAQ
      localStorage.setItem('faq_updated', Date.now().toString())
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'faq_updated',
        newValue: Date.now().toString()
      }))
      
      // Reset form y recargar
      setFormData({
        question: '',
        answer: '',
        category: 'cat_general',
        isActive: true,
        tags: ''
      })
      loadFAQs()

    } catch (error) {
      console.error('Error al guardar FAQ:', error)
      setMessage('❌ Error al guardar FAQ')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: faq.isActive,
      tags: faq.tags.join(', ')
    })
    setEditingId(faq.id)
    setMessage('📝 Editando FAQ...')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta FAQ?')) return
    
    try {
      await deleteDoc(doc(db, 'faqs', id))
      setMessage('✅ FAQ eliminada exitosamente')
      
      // Disparar actualización inmediata en página FAQ
      localStorage.setItem('faq_updated', Date.now().toString())
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'faq_updated',
        newValue: Date.now().toString()
      }))
      
      loadFAQs()
    } catch (error) {
      console.error('Error al eliminar FAQ:', error)
      setMessage('❌ Error al eliminar FAQ')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'faqs', id), {
        isActive,
        updatedBy: 'admin',
        updatedAt: serverTimestamp()
      })
      setMessage(`✅ FAQ ${isActive ? 'activada' : 'desactivada'} exitosamente`)
      
      // Disparar actualización inmediata en página FAQ
      localStorage.setItem('faq_updated', Date.now().toString())
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'faq_updated',
        newValue: Date.now().toString()
      }))
      
      loadFAQs()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      setMessage('❌ Error al cambiar estado')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📚 Gestión de FAQs
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Crea, edita y gestiona las preguntas frecuentes del sistema
          </p>
        </div>
        
        {/* Alert Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${
            message.includes('✅') 
              ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-300'
              : message.includes('❌')
              ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-300'
              : 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-900/20 dark:border-blue-600 dark:text-blue-300'
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-2">{message.includes('✅') ? '✅' : message.includes('❌') ? '❌' : '📝'}</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        <div className="flex flex-row gap-8">
          {/* Formulario - Izquierda */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header del formulario */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  {editingId ? '✏️ Editar FAQ Existente' : '➕ Crear Nueva FAQ'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {editingId ? 'Modifica los datos de la FAQ seleccionada' : 'Completa el formulario para agregar una nueva pregunta frecuente'}
                </p>
              </div>
              
              {/* Formulario */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Pregunta */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                      📝 Pregunta <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="question"
                      value={formData.question}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                      placeholder="Ej: ¿Qué es ReparteJusto y cómo funciona?"
                      required
                    />
                  </div>

                  {/* Respuesta */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                      📄 Respuesta <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="answer"
                      value={formData.answer}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors resize-none"
                      placeholder="Escribe una respuesta detallada. Puedes usar HTML básico como &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, etc."
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 Tip: Puedes usar HTML para dar formato a tu respuesta
                    </p>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                      📁 Categoría
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white transition-colors appearance-none cursor-pointer"
                    >
                      <option value="cat_general">🏠 General</option>
                      <option value="cat_registro">👤 Registro y Cuenta</option>
                      <option value="cat_pagos">💳 Pagos y Liquidaciones</option>
                      <option value="cat_restaurantes">🏪 Restaurantes</option>
                      <option value="cat_staff">👥 Staff y Personal</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">
                      🏷️ Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400 transition-colors"
                      placeholder="funcionamiento, general, sistema"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Separa los tags con comas
                    </p>
                  </div>

                  {/* Estado Activo */}
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      name="isActive"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="mr-3 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                      ✅ FAQ Activa
                      <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Las FAQs activas son visibles en la página pública
                      </span>
                    </label>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          {editingId ? '✏️ Actualizar FAQ' : '➕ Crear FAQ'}
                        </>
                      )}
                    </button>
                    
                    {editingId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setFormData({
                            question: '',
                            answer: '',
                            category: 'cat_general',
                            isActive: true,
                            tags: ''
                          })
                          setMessage('')
                        }}
                        className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                      >
                        ❌ Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Lista de FAQs - Derecha */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Header de la lista */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  📋 FAQs Existentes ({faqs.length})
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  Gestiona las preguntas frecuentes del sistema
                </p>
              </div>
              
              {/* Lista */}
              <div className="max-h-[800px] overflow-y-auto">
                {faqs.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay FAQs creadas aún
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Usa el formulario para crear la primera FAQ
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 mr-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                              {faq.question}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {faq.category.replace('cat_', '').charAt(0).toUpperCase() + faq.category.replace('cat_', '').slice(1)}
                              </span>
                              {faq.isActive ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-xs font-medium">
                                  ✅ Activa
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-medium">
                                  ❌ Inactiva
                                </span>
                              )}
                            </div>
                            {faq.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {faq.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                    🏷️ {tag}
                                  </span>
                                ))}
                                {faq.tags.length > 3 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{faq.tags.length - 3} más
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => handleEdit(faq)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleToggleActive(faq.id, !faq.isActive)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                              faq.isActive
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                            }`}
                          >
                            {faq.isActive ? '🔒 Desactivar' : '✅ Activar'}
                          </button>
                          <button
                            onClick={() => handleDelete(faq.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-1"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
