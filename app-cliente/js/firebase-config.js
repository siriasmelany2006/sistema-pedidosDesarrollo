//--------- CONFIGURACIÓN DE FIREBASE ---------
const firebaseConfig = {
  apiKey: "AIzaSyDpvNV8KcYuiK6XUgC5XWiNrw9mqwMsJco",
  authDomain: "pedidos-pwa-6cefc.firebaseapp.com",
  projectId: "pedidos-pwa-6cefc",
  storageBucket: "pedidos-pwa-6cefc.firebasestorage.app",
  messagingSenderId: "1017648638028",
  appId: "1:1017648638028:web:a6293c801a7f22d8cc6ce9"
};

// Inicializar Firebase y obtener la conexión a Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();