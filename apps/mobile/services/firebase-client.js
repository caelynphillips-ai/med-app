import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyANOk059wTj6TT2ptKCN79iojR9Rs8R6TI",
  authDomain: "med-test-7a252.firebaseapp.com",
  projectId: "med-test-7a252",
  storageBucket: "med-test-7a252.firebasestorage.app",
  messagingSenderId: "501078768121",
  appId: "1:501078768121:web:8b4e1dc443f807793be528",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const MOBILE_CLIENT_NAME = "ios";
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
