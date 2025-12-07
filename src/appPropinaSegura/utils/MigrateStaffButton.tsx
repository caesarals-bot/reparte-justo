import { useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Button } from '@/components/ui/button';

export const MigrateStaffButton = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMigrate = async () => {
    const uid = 'xTbuyXF7C5NqBIPQj6FBYukMBFc2';
    const restaurantId = 'rest_xTbuyXF7C5NqBIPQj6FBYukMBFc2_1764900961881';

    setStatus('loading');
    setMessage('Migrando datos...');

    try {
      // 1. Leer datos del documento del UID
      const uidDocRef = doc(db, 'restaurants', uid);
      const uidSnapshot = await getDoc(uidDocRef);

      if (!uidSnapshot.exists()) {
        setStatus('error');
        setMessage('❌ No se encontró el documento del UID');
        return;
      }

      const uidData = uidSnapshot.data();
      console.log('✅ Datos encontrados:', {
        serviceStaff: uidData.serviceStaff?.length || 0,
        supportStaff: uidData.supportStaff?.length || 0,
      });

      // 2. Copiar datos al documento del restaurante
      const restaurantDocRef = doc(db, 'restaurants', restaurantId);
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

      setStatus('success');
      setMessage(`✅ Migración exitosa! ${dataToMigrate.serviceStaff.length} garzones y ${dataToMigrate.supportStaff.length} cocineros migrados. Recarga la página.`);

    } catch (error) {
      console.error('Error durante la migración:', error);
      setStatus('error');
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <Button 
        onClick={handleMigrate} 
        disabled={status === 'loading' || status === 'success'}
        variant="destructive"
        size="lg"
      >
        {status === 'loading' ? 'Migrando...' : status === 'success' ? '✅ Migrado' : '🔧 Migrar Staff'}
      </Button>
      
      {message && (
        <div className={`p-4 rounded-md ${status === 'error' ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'}`}>
          <p className="text-sm">{message}</p>
        </div>
      )}
    </div>
  );
};
