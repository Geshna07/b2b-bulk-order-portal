// ARIA full-screen chat assistant page handler
let messageHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
const sessionId = Math.random().toString(36).substring(2, 15);

const chatMessages = document.getElementById('chat_messages');
const chatForm = document.getElementById('chat_form');
const chatInput = document.getElementById('chat_input');
const sendBtn = document.getElementById('send_btn');
const typingIndicator = document.getElementById('typing_indicator');
const suggestedQuestions = document.getElementById('suggested_questions');

// Display recent history on load
if (chatMessages) {
  chatMessages.innerHTML = '';
  messageHistory.slice(-15).forEach(msg => {
    if (msg.role === 'user') appendUserMessage(msg.content, false);
    else if (msg.role === 'model') appendBotMessage(msg.content, msg.suggestions || [], false);
  });
}

// Helper for typing dots
function showTyping() {
    if (typingIndicator) typingIndicator.classList.remove('hidden');
    scrollToBottom();
}

function hideTyping() {
    if (typingIndicator) typingIndicator.classList.add('hidden');
}

// Handle enter to submit
if (chatInput) {
  chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim()) {
        chatForm.dispatchEvent(new Event('submit'));
      }
    }
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    
    await sendMessage(text);
  });
}

window.sendSuggested = async function(text) {
  if (suggestedQuestions) {
    suggestedQuestions.style.display = 'none';
  }
  await sendMessage(text);
};

function appendUserMessage(text, save = true) {
  if (!chatMessages) return;
  const div = document.createElement('div');
  div.className = 'flex items-end gap-2 justify-end self-end max-w-[85%] sm:max-w-2xl';
  div.innerHTML = `
    <div class="bg-brand-green text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm text-sm whitespace-pre-wrap">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
  if (save) {
      messageHistory.push({ role: 'user', content: text });
      localStorage.setItem('chatHistory', JSON.stringify(messageHistory.slice(-15)));
  }
}

function appendBotMessage(text, suggestions = [], save = true) {
  if (!chatMessages) return;
  const div = document.createElement('div');
  div.className = 'flex flex-col gap-2 max-w-[85%] sm:max-w-2xl mt-4 bot-message self-start';
  
  // Check if text is HTML (contains tables or custom layout components)
  let htmlContent = text;
  const isHtml = text.includes('<table') || text.includes('grid-cols') || text.includes('<ul>') || text.includes('<div');
  
  if (!isHtml) {
    let formattedText = escapeHtml(text);
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/\n- (.*?)(?=\n|$)/g, '<br>• $1');
    htmlContent = formattedText;
  }
  
  div.innerHTML = `
    <div class="flex items-start gap-2 w-full">
      <div class="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
        <i data-lucide="bot" class="w-4 h-4 text-brand-green"></i>
      </div>
      <div class="bg-white border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm text-sm text-brand-text-dark leading-relaxed bot-content w-full overflow-hidden">
        ${htmlContent}
      </div>
    </div>
  `;

  // Append suggestions if present
  if (suggestions && suggestions.length > 0) {
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'flex flex-wrap gap-1.5 mt-1 ml-10';
    suggestions.forEach(sug => {
      const btn = document.createElement('button');
      btn.className = 'text-[11px] font-medium bg-white border border-slate-200 hover:border-brand-green hover:text-brand-green transition-all px-2.5 py-1 rounded-full cursor-pointer shadow-sm';
      btn.innerText = sug;
      btn.onclick = () => window.sendSuggested(sug);
      suggestionsDiv.appendChild(btn);
    });
    div.appendChild(suggestionsDiv);
  }
  
  chatMessages.appendChild(div);
  
  if (window.lucide) {
    lucide.createIcons({ root: div });
  }
  
  scrollToBottom();
  if (save) {
      messageHistory.push({ role: 'model', content: text, suggestions });
      localStorage.setItem('chatHistory', JSON.stringify(messageHistory.slice(-15)));
  }
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
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

async function sendMessage(text) {
  if (suggestedQuestions) {
    suggestedQuestions.style.display = 'none';
  }

  if (chatInput) {
    chatInput.value = '';
    chatInput.style.height = '46px';
    chatInput.disabled = true;
  }
  if (sendBtn) sendBtn.disabled = true;
  
  appendUserMessage(text);
  showTyping();
  
  try {
    // Read logged-in user session variables from local storage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    const res = await fetch('/assistant/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        messages: messageHistory.slice(-15),
        sessionId: sessionId,
        userId: currentUser?.uid || '',
        role: currentUser?.role || 'Customer',
        subRole: currentUser?.subRole || null,
        name: currentUser?.name || '',
        currentPage: window.location.pathname
      })
    });
    
    if (!res.ok) throw new Error("Server error");
    
    const data = await res.json();
    
    hideTyping();
    if (data.reply) {
      appendBotMessage(data.reply, data.suggestions || []);
    } else {
      appendBotMessage("I'm sorry, I didn't get a response. Please try again.");
    }
    
  } catch (err) {
    console.error("Chat error:", err);
    hideTyping();
    appendBotMessage("Sorry, I encountered an error. Please try again later.");
  } finally {
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
    if (sendBtn) sendBtn.disabled = false;
  }
}
