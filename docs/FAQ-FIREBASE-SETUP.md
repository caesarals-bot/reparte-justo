# Firebase Setup for FAQ System

## 🗄️ Firestore Collections

### **FAQs Collection**
```
/faqs/{faqId}
```

**Document Structure:**
```json
{
  "question": "¿Cómo funciona ReparteJusto?",
  "answer": "<p>ReparteJusto es un sistema que permite distribuir propinas de manera transparente...</p>",
  "category": "cat_general",
  "order": 1,
  "isActive": true,
  "views": 0,
  "helpful": 0,
  "notHelpful": 0,
  "tags": ["funcionamiento", "general"],
  "locale": "es",
  "createdAt": "2026-01-02T20:00:00Z",
  "updatedAt": "2026-01-02T20:00:00Z",
  "createdBy": "user123",
  "updatedBy": "user123"
}
```

### **FAQ Categories Collection**
```
/faqCategories/{categoryId}
```

**Document Structure:**
```json
{
  "name": "General",
  "description": "Preguntas generales sobre el sistema",
  "icon": "help-circle",
  "order": 1,
  "isActive": true,
  "color": "#3b82f6",
  "createdAt": "2026-01-02T20:00:00Z",
  "updatedAt": "2026-01-02T20:00:00Z"
}
```

## 🔐 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // FAQ Categories - Solo admin puede modificar
    match /faqCategories/{categoryId} {
      allow read: if true; // Todos pueden leer categorías
      allow write: if request.auth != null && 
        request.auth.token.role in ['super_admin', 'closure_editor'];
      allow delete: if request.auth != null && 
        request.auth.token.role in ['super_admin'];
    }
    
    // FAQs - Lectura pública, escritura por roles
    match /faqs/{faqId} {
      // Lectura: todos pueden leer FAQs activos
      allow read: if resource.data.isActive == true;
      
      // Escritura: solo roles admin
      allow write: if request.auth != null && 
        request.auth.token.role in ['super_admin', 'closure_editor'];
      
      // Eliminación: solo super_admin
      allow delete: if request.auth != null && 
        request.auth.token.role == 'super_admin';
      
      // Analytics updates (views, helpful): usuarios autenticados
      allow update: if request.auth != null && 
        request.auth.uid != null &&
        request.resource.data.keys().hasAll(['views', 'helpful', 'notHelpful']) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views', 'helpful', 'notHelpful']);
    }
  }
}
```

## 📦 Initial Data Setup

### **Default Categories**

```javascript
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
```

### **Sample FAQs**

```javascript
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
```

## 🚀 Setup Instructions

### **1. Create Collections in Firebase Console**

1. Ve a Firebase Console → Firestore Database
2. Crea las colecciones:
   - `faqCategories`
   - `faqs`

### **2. Add Security Rules**

1. Ve a Firestore → Rules
2. Reemplaza las reglas existentes con las de arriba
3. Publica los cambios

### **3. Populate Initial Data**

Opción A: Manual desde Firebase Console
- Crea los documentos de categorías
- Crea los FAQs de ejemplo

Opción B: Usando el script de inicialización
```bash
firebase firestore:delete --all-collections
firebase deploy --only firestore
node scripts/setup-faq-data.js
```

### **4. Test the System**

1. Inicia la aplicación
2. Navega a `/faq` - debería mostrar FAQs públicos
3. Navega a `/admin/faq` - debería mostrar el admin panel
4. Prueba crear, editar y eliminar FAQs

## 🔍 Indexes for Performance

Crea estos índices en Firestore para mejor rendimiento:

```javascript
// FAQs indexes
db.collection('faqs').createIndex({ isActive: 1, order: 1 });
db.collection('faqs').createIndex({ category: 1, isActive: 1 });
db.collection('faqs').createIndex({ locale: 1, isActive: 1 });
db.collection('faqs').createIndex({ views: -1 });

// Categories indexes
db.collection('faqCategories').createIndex({ order: 1 });
db.collection('faqCategories').createIndex({ isActive: 1, order: 1 });
```

## 📊 Monitoring

### **Metrics to Track:**
- FAQs más vistas
- Tasa de helpful/not helpful
- Búsquedas sin resultados
- Categorías más populares

### **Firebase Analytics Events:**
```javascript
// FAQ view
analytics.logEvent('faq_viewed', { faq_id, category })

// FAQ helpful
analytics.logEvent('faq_helpful', { faq_id, helpful: true })

// Search
analytics.logEvent('faq_search', { query, results_count })
```
