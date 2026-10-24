const chatWindow = document.getElementById("chatWindow");
const launcher = document.getElementById("launcher");
const closeChat = document.getElementById("closeChat");
const minimizeChat = document.getElementById("minimizeChat");
const messagesEl = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const quickActions = document.getElementById("quickActions");
const appScriptUrl = document.currentScript?.src;
const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const isStandaloneChatbot = appScriptUrl ? new URL(appScriptUrl).pathname === "/app.js" : false;
const chatEndpoint = isLocalPreview && window.location.port === "5500"
  ? "http://localhost:3000/api/chat"
  : "/api/chat";
const schoolLogoUrl = document.querySelector(".school-logo")?.src
  || (appScriptUrl ? new URL("assets/logo.png", appScriptUrl).href : "");

const history = [];

function setChatVisible(visible) {
  if (chatWindow) {
    chatWindow.classList.toggle("is-hidden", !visible);
  }
}

// লঞ্চার বোতামে টগল ফিচার (১ম বার খুলবে, ২য় বার বন্ধ হবে)
if (launcher) {
  launcher.addEventListener("click", () => {
    if (chatWindow) {
      const isHidden = chatWindow.classList.contains("is-hidden");
      setChatVisible(isHidden); // বন্ধ থাকলে খুলবে, খোলা থাকলে বন্ধ হবে
    }
  });
}

if (closeChat) closeChat.addEventListener("click", () => setChatVisible(false));
if (minimizeChat) minimizeChat.addEventListener("click", () => setChatVisible(false));

function scrollToBottom() {
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `message-row ${role === "user" ? "user-row" : "bot-row"}`;

  if (role === "assistant") {
    const logo = document.createElement("img");
    logo.className = "message-logo";
    logo.src = schoolLogoUrl;
    logo.alt = "স্কুল লোগো";
    row.appendChild(logo);
  }

  const wrapper = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "user-bubble" : "bot-bubble"}`;
  bubble.textContent = text;

  const timestamp = document.createElement("div");
  timestamp.className = "timestamp";
  timestamp.textContent = new Date().toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });

  wrapper.append(bubble, timestamp);
  row.appendChild(wrapper);
  messagesEl.appendChild(row);
  scrollToBottom();
}

let typingInterval;
function addTyping() {
  const row = document.createElement("div");
  row.className = "message-row bot-row";
  row.id = "typingIndicator";

  const logo = document.createElement("img");
  logo.className = "message-logo";
  logo.src = schoolLogoUrl;
  row.appendChild(logo);

  const wrapper = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = "bubble bot-bubble";
  bubble.style.fontSize = "20px";
  bubble.style.letterSpacing = "2px";
  bubble.style.fontWeight = "bold";

  let dotCount = 0;
  bubble.textContent = ".";
  typingInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    bubble.textContent = ".".repeat(dotCount) || ".";
  }, 300);

  wrapper.appendChild(bubble);
  row.appendChild(wrapper);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function removeTyping() {
  clearInterval(typingInterval);
  document.getElementById("typingIndicator")?.remove();
}

async function sendMessage(rawText) {
  const text = rawText.trim();
  if (!text || sendButton.disabled) return;

  if (quickActions) quickActions.remove();
  addMessage("user", text);
  history.push({ role: "user", text });
  input.value = "";
  input.style.height = "auto";
  sendButton.disabled = true;

  addTyping();

  try {
    const endpoint = isStandaloneChatbot ? "/api/chat" : chatEndpoint;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("সার্ভার থেকে উত্তর পাওয়া যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।");
    }

    if (!response.ok) {
      throw new Error(data.error || "সার্ভার থেকে সঠিক ডাটা আসেনি।");
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("দুঃখিত, এই মুহূর্তে উত্তর পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।");
    }

    removeTyping();
    addMessage("assistant", data.reply);
    history.push({ role: "assistant", text: data.reply });
  } catch (error) {
    removeTyping();
    const message = error instanceof TypeError && isLocalPreview
      ? "লোকাল preview-তে chatbot চালাতে chatbot সার্ভারটিও চালু করুন।"
      : error.message || "দুঃখিত, সংযোগে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    addMessage("assistant", message);
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
}

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });
}

if (input) {
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (form) form.requestSubmit();
    }
  });
}

if (quickActions) {
  quickActions.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-prompt]");
    if (button) sendMessage(button.dataset.prompt);
  });
}