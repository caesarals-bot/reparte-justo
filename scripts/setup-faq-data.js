// Script para inicializar collections de FAQ en Firebase
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import firebaseConfig from './firebase-config.js'

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Categorías por defecto
const defaultCategories = [
  {
    name: "General",
    description: "Preguntas generales sobre el sistema",
    icon: "help-circle",
    order: 1,
    isActive: true,
    color: "#3b82f6"
  },
  {
    name: "Registro",
    description: "Preguntas sobre registro y cuenta",
    icon: "user-plus",
    order: 2,
    isActive: true,
    color: "#10b981"
  },
  {
    name: "Pagos",
    description: "Preguntas sobre pagos y liquidaciones",
    icon: "credit-card",
    order: 3,
    isActive: true,
    color: "#f59e0b"
  },
  {
    name: "Restaurantes",
    description: "Preguntas para dueños de restaurantes",
    icon: "store",
    order: 4,
    isActive: true,
    color: "#8b5cf6"
  },
  {
    name: "Staff",
    description: "Preguntas para garzones y personal",
    icon: "users",
    order: 5,
    isActive: true,
    color: "#ef4444"
  }
]

// FAQs de ejemplo
const sampleFAQs = [
  {
    question: "¿Qué es ReparteJusto?",
    answer: "<p>ReparteJusto es una plataforma digital que permite distribuir propinas de manera <strong>transparente y justa</strong> entre el personal de servicio, cumpliendo con la Ley 20.549 de Chile.</p><p>Nuestro sistema garantiza que las propinas sean propiedad de los trabajadores y no de la empresa.</p>",
    category: "cat_general",
    order: 1,
    isActive: true,
    tags: ["funcionamiento", "general", "ley"],
    locale: "es"
  },
  {
    question: "¿Cómo me registro como restaurante?",
    answer: "<p>Para registrar tu restaurante en ReparteJusto:</p><ol><li>Completa el formulario de registro</li><li>Verifica tu email</li><li>Configura tu perfil de restaurante</li><li>Agrega a tu personal</li><li>¡Listo para empezar!</li></ol>",
    category: "cat_registro",
    order: 1,
    isActive: true,
    tags: ["registro", "restaurante", "configuración"],
    locale: "es"
  },
  {
    question: "¿Cómo se distribuyen las propinas?",
    answer: "<p>Las propinas se distribuyen según las reglas que configures para tu restaurante:</p><ul><li><strong>Reparto equitativo:</strong> Todos por igual</li><li><strong>Por porcentaje:</strong> Según horas trabajadas</li><li><strong>Por rol:</strong> Diferentes porcentajes por cargo</li></ul><p>El sistema calcula automáticamente y genera informes detallados.</p>",
    category: "cat_pagos",
    order: 1,
    isActive: true,
    tags: ["distribución", "propinas", "cálculo"],
    locale: "es"
  }
]

// Función para crear categorías
async function createCategories() {
  console.log('📁 Creando categorías...')
  
  for (const category of defaultCategories) {
    const categoryId = `cat_${category.name.toLowerCase().replace(/\s+/g, '_')}`
    const categoryRef = doc(db, 'faqCategories', categoryId)
    
    await setDoc(categoryRef, {
      ...category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log(`✅ Categoría creada: ${category.name} (${categoryId})`)
  }
}

// Función para crear FAQs
async function createFAQs() {
  console.log('❓ Creando FAQs...')
  
  for (const faq of sampleFAQs) {
    const faqRef = doc(collection(db, 'faqs'))
    
    await setDoc(faqRef, {
      ...faq,
      views: 0,
      helpful: 0,
      notHelpful: 0,
      createdBy: 'system',
      updatedBy: 'system',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    console.log(`✅ FAQ creada: ${faq.question}`)
  }
}

// Función principal
async function initializeFAQData() {
  try {
    console.log('🚀 Inicializando datos de FAQ...')
    
    await createCategories()
    await createFAQs()
    
    console.log('✅ Datos de FAQ inicializados correctamente')
    console.log('📊 Collections creadas:')
    console.log('  - faqCategories')
    console.log('  - faqs')
    
  } catch (error) {
    console.error('❌ Error al inicializar datos:', error)
  }
}

// Ejecutar si es un script
if (require.main === module) {
  initializeFAQData()
}

export { initializeFAQData, createCategories, createFAQs }
