import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

testConnection();

export const signInWithGoogle = async (role: 'admin' | 'student') => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn("Popup sign-in failed, falling back to redirect:", error);
    const fallbackCodes = ['auth/popup-blocked', 'auth/internal-error', 'auth/cancelled-popup-request'];
    if (error?.code && fallbackCodes.includes(error.code)) {
      sessionStorage.setItem('loginRole', role);
      await signInWithRedirect(auth, googleProvider);
      return undefined;
    }
    console.error("Error signing in with Google:", error);
    throw error;
  }
};
