import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, GoogleAuthProvider, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyANOk059wTj6TT2ptKCN79iojR9Rs8R6TI",
  authDomain: "med-test-7a252.firebaseapp.com",
  projectId: "med-test-7a252",
  storageBucket: "med-test-7a252.firebasestorage.app",
  messagingSenderId: "501078768121",
  appId: "1:501078768121:web:8b4e1dc443f807793be528",
};

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || fallbackFirebaseConfig.authDomain,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || fallbackFirebaseConfig.databaseURL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || fallbackFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || fallbackFirebaseConfig.appId,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const MOBILE_CLIENT_NAME = "ios";
export const auth = initializeNativeAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

function initializeNativeAuth(app) {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error?.code === "auth/already-initialized") {
      return getAuth(app);
    }
    throw error;
  }
}
