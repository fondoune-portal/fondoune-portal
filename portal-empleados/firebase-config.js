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

window._fbDB   = null;
window._fbAuth = null;
window._fbIniciado = false;

/* ── Callbacks pendientes hasta que Auth esté lista ── */
window._fbReadyCallbacks = [];
window._fbReady = function(fn) {
  if (window._fbIniciado) { fn(); }
  else { window._fbReadyCallbacks.push(fn); }
};

(function() {
  try {
    if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'REEMPLAZAR_API_KEY') {
      firebase.initializeApp(FIREBASE_CONFIG);
      window._fbDB   = firebase.firestore();
      window._fbAuth = firebase.auth();

      /* ✅ FIX: autenticar anónimamente para cumplir request.auth != null
         en las reglas de Firestore. El portal ya tiene su propio sistema
         de login (security.js); Firebase Auth solo actúa como "token de
         acceso" a la base de datos en la nube. */
      window._fbAuth.signInAnonymously()
        .then(function() {
          window._fbIniciado = true;
          console.log('✅ Firebase conectado y autenticado');
          window._fbReadyCallbacks.forEach(function(fn){ try{ fn(); }catch(e){} });
          window._fbReadyCallbacks = [];
        })
        .catch(function(e) {
          console.warn('⚠️ Firebase auth anónima falló:', e.message);
          window._fbIniciado = true;
          window._fbReadyCallbacks.forEach(function(fn){ try{ fn(); }catch(e){} });
          window._fbReadyCallbacks = [];
        });

    } else {
      console.warn('⚠️ Firebase no configurado — modo localStorage');
    }
  } catch(e) { console.warn('Firebase error:', e.message); }
})();
