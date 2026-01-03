# Firebase Setup para FAQ System

## 🚀 Pasos para Configurar

### **1. Deploy Security Rules**
```bash
# Desde la raíz del proyecto
firebase deploy --only firestore:rules
```

### **2. Crear Collections y Datos Iniciales**
```bash
# Ejecutar script de inicialización
node scripts/setup-faq-data.js
```

### **3. Verificar en Firebase Console**
1. Ir a Firebase Console → Firestore Database
2. Deberías ver:
   - Colección `faqCategories` con 5 categorías
   - Colección `faqs` con 3 FAQs de ejemplo

## 📋 Estructura de Datos

### **faqCategories**
```
cat_general/
├── name: "General"
├── description: "Preguntas generales sobre el sistema"
├── icon: "help-circle"
├── order: 1
├── isActive: true
├── color: "#3b82f6"
├── createdAt: timestamp
└── updatedAt: timestamp
```

### **faqs**
```
[faqId]/
├── question: "¿Qué es ReparteJusto?"
├── answer: "<p>ReparteJusto es...</p>"
├── category: "cat_general"
├── order: 1
├── isActive: true
├── views: 0
├── helpful: 0
├── notHelpful: 0
├── tags: ["funcionamiento", "general"]
├── locale: "es"
├── createdBy: "system"
├── updatedBy: "system"
├── createdAt: timestamp
└── updatedAt: timestamp
```

## 🔐 Permisos Configurados

### **FAQ Categories**
- **Read**: Todos (público)
- **Write**: super_admin, admin, closure_editor
- **Delete**: super_admin, admin

### **FAQs**
- **Read**: Todos (solo FAQs activos)
- **Write**: super_admin, admin, closure_editor
- **Delete**: super_admin, admin
- **Analytics**: Usuarios autenticados (views, helpful, notHelpful)

## 🎯 Siguiente Paso

Una vez configurado Firebase, podemos:
1. Reemplazar componentes de prueba con los reales
2. Conectar hooks con Firebase
3. Probar CRUD completo

## 🚨 Notas Importantes

- El script usa `serverTimestamp()` para fechas
- Las categorías usan IDs predecibles (`cat_general`, `cat_registro`, etc.)
- Los FAQs se crean con IDs auto-generados
- Todos los datos iniciales están en español
