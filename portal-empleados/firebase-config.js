/* ════════════════════════════════════════════════════════════
   FIREBASE CONFIG — Portal Empleados FondoUne
   ⚠️  RESTRICCIÓN DE API KEY (hacer antes de producción):
   Google Cloud Console → APIs & Services → Credentials
   → API Key → Application restrictions → HTTP referrers
   → Agregar: https://tu-dominio.com/*  y  localhost:*
   → API restrictions → solo: Cloud Firestore API
   ════════════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════
   CONFIGURACIÓN FIREBASE — FONDOUNE (mismo config que portal-asociado)
   ════════════════════════════════════════════════════ */
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAUkk6h6IaDOvxRWRFGiV2USTzd6ZbJ3Qg",
  authDomain:        "fondoune-portal-33446.firebaseapp.com",
  projectId:         "fondoune-portal-33446",
  storageBucket:     "fondoune-portal-33446.firebasestorage.app",
  messagingSenderId: "901082593837",
  appId:             "1:901082593837:web:91292ed594e171715fd6a4"
};

window._fbDB = null;
window._fbIniciado = false;
(function() {
  try {
    if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'REEMPLAZAR_API_KEY') {
      firebase.initializeApp(FIREBASE_CONFIG);
      window._fbDB = firebase.firestore();
      window._fbIniciado = true;
      console.log('✅ Firebase conectado');
    } else {
      console.warn('⚠️ Firebase no configurado — modo localStorage');
    }
  } catch(e) { console.warn('Firebase error:', e.message); }
})();
