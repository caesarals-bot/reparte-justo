/**
 * Función de migración de datos de staff
 * 
 * Ejecutar desde la consola del navegador:
 * 1. Abre la aplicación y autentícate
 * 2. Abre la consola (F12)
 * 3. Ejecuta: window.migrateStaffData()
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';

export async function migrateStaffData(uid: string, restaurantId: string) {
  try {
    // 1. Leer datos del documento del UID
    const uidDocRef = doc(db, 'restaurants', uid);
    const uidSnapshot = await getDoc(uidDocRef);

    if (!uidSnapshot.exists()) {
      console.error('❌ No se encontró el documento del UID');
      return { success: false, error: 'Documento UID no encontrado' };
    }

    const uidData = uidSnapshot.data();

    // 2. Leer documento del restaurante
    const restaurantDocRef = doc(db, 'restaurants', restaurantId);
    const restaurantSnapshot = await getDoc(restaurantDocRef);

    if (!restaurantSnapshot.exists()) {
      console.error('❌ No se encontró el documento del restaurante');
      return { success: false, error: 'Documento restaurante no encontrado' };
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
    
    return { 
      success: true, 
      migratedData: {
        serviceStaffCount: dataToMigrate.serviceStaff.length,
        supportStaffCount: dataToMigrate.supportStaff.length,
      }
    };

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Exponer función globalmente para uso en consola
if (typeof window !== 'undefined') {
  (window as any).migrateStaffData = async () => {
    const uid = 'xTbuyXF7C5NqBIPQj6FBYukMBFc2';
    const restaurantId = 'rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881';
    return await migrateStaffData(uid, restaurantId);
  };
}
