/* ════════════════════════════════════════════════════════════
   FIREBASE CONFIG — Portal Asociados FondoUne
   ⚠️  RESTRICCIÓN DE API KEY (hacer antes de producción):
   Google Cloud Console → APIs & Services → Credentials
   → API Key → Application restrictions → HTTP referrers
   → Agregar: https://tu-dominio.com/*  y  localhost:*
   ════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════
   CONFIGURACIÓN FIREBASE — FONDOUNE
   Reemplaza los valores de abajo con los de tu proyecto
   Firebase Console → Configuración del proyecto → SDK
   ════════════════════════════════════════════════════ */
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAUkk6h6IaDOvxRWRFGiV2USTzd6ZbJ3Qg",
  authDomain:        "fondoune-portal-33446.firebaseapp.com",
  projectId:         "fondoune-portal-33446",
  storageBucket:     "fondoune-portal-33446.firebasestorage.app",
  messagingSenderId: "901082593837",
  appId:             "1:901082593837:web:91292ed594e171715fd6a4"
};

/* Inicializar Firebase si la config es válida */
window._fbDB = null;
(function() {
  try {
    if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'REEMPLAZAR_API_KEY') {
      firebase.initializeApp(FIREBASE_CONFIG);
      window._fbDB = firebase.firestore();
      console.log('✅ Firebase conectado correctamente');
    } else {
      console.warn('⚠️ Firebase no configurado — usando localStorage');
    }
  } catch(e) {
    console.warn('Firebase error:', e.message);
    window._fbDB = null;
  }
})();
