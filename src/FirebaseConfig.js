// ATENÇÃO: As chaves do Firebase são lidas do arquivo .env e nunca devem ser expostas ou comitadas no código!
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulator in development
if (process.env.NODE_ENV === 'development') {
  // Check if we're not already connected to avoid multiple connections
  if (window.location.hostname === 'localhost') {
    try {
      // Connect Firestore emulator
      const firestoreEmulatorHost = localStorage.getItem('firestore_emulator_connected');
      if (!firestoreEmulatorHost) {
        import('firebase/firestore').then(({ connectFirestoreEmulator }) => {
          connectFirestoreEmulator(db, 'localhost', 8080);
          localStorage.setItem('firestore_emulator_connected', 'true');
        });
      }
    } catch (error) {
      console.log('Firestore emulator connection error (this is normal if emulator is not running):', error.message);
    }
  }
}

export default app;
