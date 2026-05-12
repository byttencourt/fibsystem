import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

async function testConnection() {
  try {
    // Try a simple ping
    await getDocFromServer(doc(db, 'test', 'ping'));
  } catch (error: any) {
    // Only log real connectivity issues, not permission drops
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("Firebase: Servidor offline ou problemas de conexão detectados.");
    }
  }
}
testConnection();
