/**
 * Script de migración: Copiar staff del documento UID al documento del restaurante
 * 
 * Ejecutar con: node migrate-staff-data.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Configuración de Firebase (copia de src/firebase/config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyBGfWxYOcZpJYqgVBjNfAqMqkwQqAJxqJk",
  authDomain: "reparte-justo.firebaseapp.com",
  projectId: "reparte-justo",
  storageBucket: "reparte-justo.firebasestorage.app",
  messagingSenderId: "1037627857093",
  appId: "1:1037627857093:web:b5c5f8c6e4e7f8a9b6c7d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateStaffData() {
  const uid = 'xTbuyXF7C5NqBIPQj6FBYukMBFc2';
  const restaurantId = 'rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881';

  console.log('🔄 Iniciando migración de datos de staff...');
  console.log(`   Origen: restaurants/${uid}`);
  console.log(`   Destino: restaurants/${restaurantId}`);

  try {
    // 1. Leer datos del documento del UID
    const uidDocRef = doc(db, 'restaurants', uid);
    const uidSnapshot = await getDoc(uidDocRef);

    if (!uidSnapshot.exists()) {
      console.error('❌ No se encontró el documento del UID');
      return;
    }

    const uidData = uidSnapshot.data();
    console.log('\n✅ Datos encontrados en documento UID:');
    console.log('   - serviceStaff:', uidData.serviceStaff?.length || 0, 'miembros');
    console.log('   - supportStaff:', uidData.supportStaff?.length || 0, 'miembros');
    console.log('   - settlementMode:', uidData.settlementMode);
    console.log('   - poolConfig:', uidData.poolConfig);
    console.log('   - directConfig:', uidData.directConfig);

    // 2. Leer documento del restaurante
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantSnapshot = await getDoc(restaurantDocRef);

    if (!restaurantSnapshot.exists()) {
      console.error('❌ No se encontró el documento del restaurante');
      return;
    }

    // 3. Copiar datos al documento del restaurante
    const dataToMigrate = {
      serviceStaff: uidData.serviceStaff || [],
      supportStaff: uidData.supportStaff || [],
      settlementMode: uidData.settlementMode || 'pool',
      poolConfig: uidData.poolConfig || {},
      directConfig: uidData.directConfig || {},
      additionalDeductions: uidData.additionalDeductions || [],
      contactEmail: uidData.contactEmail,
      responsibleName: uidData.responsibleName,
      staffEditors: uidData.staffEditors || [],
      updatedAt: serverTimestamp(),
    };

    await setDoc(restaurantDocRef, dataToMigrate, { merge: true });

    console.log('\n✅ Migración completada exitosamente!');
    console.log('   Los datos del staff ahora están en el documento del restaurante.');
    console.log('\n📝 Verifica en Firestore Console:');
    console.log(`   https://console.firebase.google.com/project/reparte-justo/firestore/data/restaurants/${restaurantId}`);

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
  }
}

// Ejecutar migración
migrateStaffData()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
