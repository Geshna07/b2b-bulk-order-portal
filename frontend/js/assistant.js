const SYSTEM_PROMPT = "You are the AI Assistant for Ganga Maxx Marketplace B2B Bulk Order Portal. You help users understand how to use the portal. You know the following: The portal has 3 user types: Customer (institutions like schools, hotels, hospitals), Staff Members (Sales Admin, Warehouse Staff, Salesman, Delivery Coordinator, Accounts Manager, Compliance Admin), and Admin. Customers can browse the product catalog, place bulk cleaning supply orders, request quotations, track orders, and manage their credit account. Orders flow through statuses: Pending → Approved → Packed → Dispatched → Delivered. Sales Admin approves orders. Warehouse Staff packs them and manages inventory. Salesman visits customers and builds quotations. Delivery Coordinator assigns and tracks deliveries. Accounts Manager handles credit and invoices. Compliance Admin manages chemical safety documents. To register as a customer, go to the Register page and fill your institution details. Staff members need admin approval before they can login. For any order or delivery updates, WhatsApp notifications are sent automatically. If you need help with anything specific, ask me and I will guide you step by step.";

let messageHistory = [];
const sessionId = Math.random().toString(36).substring(2, 15);

const chatMessages = document.getElementById('chat_messages');
const chatForm = document.getElementById('chat_form');
const chatInput = document.getElementById('chat_input');
const sendBtn = document.getElementById('send_btn');
const typingIndicator = document.getElementById('typing_indicator');
const suggestedQuestions = document.getElementById('suggested_questions');

// Handle enter to submit
chatInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (chatInput.value.trim()) {
      chatForm.dispatchEvent(new Event('submit'));
    }
  }
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  
  await sendMessage(text);
});

window.sendSuggested = async function(text) {
  if (suggestedQuestions) {
    suggestedQuestions.style.display = 'none';
  }
  await sendMessage(text);
};

function appendUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'flex items-end gap-2 justify-end self-end max-w-[85%] sm:max-w-2xl';
  div.innerHTML = `
    <div class="bg-brand-green text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm text-sm whitespace-pre-wrap">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function appendBotMessage(text) {
  const div = document.createElement('div');
  div.className = 'flex items-end gap-2 max-w-[85%] sm:max-w-2xl mt-4';
  
  // Try to render markdown lists and bold text simply
  let formattedText = escapeHtml(text);
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formattedText = formattedText.replace(/\n- (.*?)(?=\n|$)/g, '<br>• $1');
  formattedText = formattedText.replace(/\n\d+\. (.*?)(?=\n|$)/g, '<br>• $1');
  
  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
      <i data-lucide="bot" class="w-4 h-4 text-brand-green"></i>
    </div>
    <div class="bg-white border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm whitespace-pre-wrap text-brand-text-dark leading-relaxed">${formattedText}</div>
  `;
  chatMessages.appendChild(div);
  
  if (window.lucide) {
    lucide.createIcons({ root: div });
  }
  
  scrollToBottom();
}

function escapeHtml(unsafe) {
  return unsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(text) {
  // Hide suggestions if they are still visible
  if (suggestedQuestions) {
    suggestedQuestions.style.display = 'none';
  }

  // Clear input
  chatInput.value = '';
  chatInput.style.height = '46px';
  chatInput.disabled = true;
  sendBtn.disabled = true;
  
  // Append UI
  appendUserMessage(text);
  
  // Show typing
  typingIndicator.classList.remove('hidden');
  scrollToBottom();
  
  // Add to history
  messageHistory.push({ role: 'user', content: text });
  
  try {
    const res = await fetch('/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messageHistory,
        sessionId: sessionId,
        systemPrompt: SYSTEM_PROMPT
      })
    });
    
    if (!res.ok) {
      throw new Error("Server returned " + res.status);
    }
    
    const data = await res.json();
    
    if (data.reply) {
      appendBotMessage(data.reply);
      messageHistory.push({ role: 'model', content: data.reply });
    } else {
      appendBotMessage("I'm sorry, I didn't get a response. Please try again.");
    }
    
  } catch (err) {
    console.error("Chat error:", err);
    appendBotMessage("Sorry, I encountered an error connecting to the server. Please try again later.");
  } finally {
    typingIndicator.classList.add('hidden');
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}
