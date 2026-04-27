// ============================================================
//  FÉLIX IA v4.1 — Vía Proxy GAS (API Key protegida)
//  Fondo UNE | Portal de Asociados
// ============================================================

const FELIX_CONFIG = {
  // URL del Web App de Google Apps Script (termina en /exec)
  PROXY_URL: "https://script.google.com/macros/s/TU_ID_DE_GAS_AQUI/exec",
  MAX_TOKENS:  1024,
  TEMPERATURE: 0.7,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1500, // ms base (se multiplica por intento)
  TIMEOUT_MS:  25000, // 25 seg — GAS puede ser lento en cold start
};

// Personalidad y contexto de Félix
const FELIX_SYSTEM_PROMPT = `Eres Félix, el asistente virtual oficial del Fondo de Empleados de UNE (Fondo UNE).
Tu rol es ayudar a los asociados con información sobre:
- Servicios y beneficios del fondo (créditos, auxilios, seguros, recreación)
- Requisitos y procesos para solicitudes
- Estado general de productos y servicios
- Educación financiera básica
- Orientación sobre trámites internos

Lineamientos de comportamiento:
- Responde siempre en español, con un tono cálido, profesional y cercano
- Sé conciso pero completo; no excedas 3 párrafos si no es necesario
- Si no tienes la información exacta, indícalo honestamente y sugiere contactar al equipo de Fondo UNE
- Nunca inventes datos financieros, tasas o montos específicos que no conozcas con certeza
- Trata a cada asociado con respeto y empatía
- Empieza tus respuestas de forma directa, sin saludos repetitivos en cada mensaje

Recuerda: eres la primera línea de atención del Fondo UNE. Tu objetivo es resolver dudas rápido y con precisión.`;

// ============================================================
//  CLASE PRINCIPAL DE FÉLIX
// ============================================================
class FelixIA {
  constructor() {
    this.conversationHistory = [];
    this.isProcessing = false;
  }

  async sendMessage(userMessage) {
    if (this.isProcessing || !userMessage?.trim()) return null;

    this.isProcessing = true;

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage.trim() }],
    });

    try {
      const responseText = await this._callWithRetry();

      if (responseText) {
        this.conversationHistory.push({
          role: "model",
          parts: [{ text: responseText }],
        });
      }

      return responseText;
    } catch (error) {
      this.conversationHistory.pop();
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  async _callWithRetry() {
    let lastError;

    for (let attempt = 1; attempt <= FELIX_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await this._callProxy();
      } catch (error) {
        lastError = error;
        if (error.isClientError) throw error;

        if (attempt < FELIX_CONFIG.MAX_RETRIES) {
          const waitMs = FELIX_CONFIG.RETRY_DELAY * attempt;
          console.warn(`Félix: intento ${attempt} fallido. Reintentando en ${waitMs}ms…`);
          await this._sleep(waitMs);
        }
      }
    }

    throw new Error(
      `Félix no pudo conectarse después de ${FELIX_CONFIG.MAX_RETRIES} intentos. ` +
      `Verifica tu conexión o intenta más tarde.`
    );
  }

  async _callProxy() {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FELIX_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(FELIX_CONFIG.PROXY_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: FELIX_SYSTEM_PROMPT }],
          },
          contents:        this.conversationHistory,
          maxOutputTokens: FELIX_CONFIG.MAX_TOKENS,
          temperature:     FELIX_CONFIG.TEMPERATURE,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data?.error) {
        const err = new Error(data.error);
        err.isClientError = data.error.includes("inválid") || data.error.includes("obligatori");
        throw err;
      }

      return this._extractText(data);

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error(
          "La solicitud tardó demasiado (GAS está iniciando). Intenta de nuevo en unos segundos."
        );
      }

      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error("Sin conexión a internet. Verifica tu red e intenta de nuevo.");
      }

      throw error;
    }
  }

  _extractText(data) {
    try {
      const candidate = data?.candidates?.[0];
      if (!candidate) return null;

      if (candidate.finishReason === "SAFETY") {
        return "Lo siento, no puedo responder esa consulta. ¿Puedo ayudarte con algo relacionado con los servicios de Fondo UNE?";
      }

      const text = candidate?.content?.parts?.[0]?.text;
      return text?.trim() || null;
    } catch {
      return null;
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  _sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ============================================================
//  INTERFAZ DE CHAT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const felix        = new FelixIA();
  const chatMessages = document.getElementById("chat-messages");
  const userInput    = document.getElementById("user-input");
  const sendBtn      = document.getElementById("send-btn");
  const clearBtn     = document.getElementById("clear-chat");

  if (!chatMessages || !userInput || !sendBtn) {
    console.error("Félix IA: Elementos del DOM no encontrados.");
    return;
  }

  function appendMessage(text, role) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = formatText(text);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "message felix typing-indicator";
    el.id = "typing-indicator";
    el.innerHTML = `<div class="bubble"><span></span><span></span><span></span></div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function removeTyping() {
    document.getElementById("typing-indicator")?.remove();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function setUIState(loading) {
    userInput.disabled = loading;
    sendBtn.disabled   = loading;
    sendBtn.classList.toggle("loading", loading);
  }

  function formatText(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  }

  async function handleSend() {
    const message = userInput.value.trim();
    if (!message || felix.isProcessing) return;

    userInput.value = "";
    userInput.style.height = "auto";
    appendMessage(message, "user");
    setUIState(true);
    showTyping();

    try {
      const response = await felix.sendMessage(message);
      removeTyping();

      if (response) {
        appendMessage(response, "felix");
      } else {
        appendMessage("No pude obtener una respuesta. Por favor intenta de nuevo.", "felix error");
      }
    } catch (error) {
      removeTyping();
      appendMessage(`⚠️ ${error.message}`, "felix error");
      console.error("Félix error:", error);
    } finally {
      setUIState(false);
      userInput.focus();
    }
  }

  sendBtn.addEventListener("click", handleSend);

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  clearBtn?.addEventListener("click", () => {
    felix.clearHistory();
    chatMessages.innerHTML = "";
    appendMessage(
      "¡Hola! Soy Félix, tu asistente de Fondo UNE. ¿En qué puedo ayudarte hoy?",
      "felix"
    );
  });

  appendMessage(
    "¡Hola! Soy Félix, tu asistente de Fondo UNE. ¿En qué puedo ayudarte hoy?",
    "felix"
  );
  userInput.focus();
});
