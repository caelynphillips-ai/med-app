import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyANOk059wTj6TT2ptKCN79iojR9Rs8R6TI",
  authDomain: "med-test-7a252.firebaseapp.com",
  projectId: "med-test-7a252",
  storageBucket: "med-test-7a252.firebasestorage.app",
  messagingSenderId: "501078768121",
  appId: "1:501078768121:web:8b4e1dc443f807793be528",
};

const app = initializeApp(firebaseConfig);

export { app, firebaseConfig };
