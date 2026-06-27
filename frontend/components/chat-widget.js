// Floating AI Chat Widget for all dashboards
(function() {
  const styles = `
    #gm_chat_widget {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1000;
      font-family: 'Inter', sans-serif;
    }
    #gm_chat_bubble {
      width: 3.5rem;
      height: 3.5rem;
      background: #2d7a5f;
      color: white;
      border-radius: 9999px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
    }
    #gm_chat_bubble:hover {
      transform: scale(1.05);
      background: #245f4a;
    }
    #gm_brand {
        font-size: 8px;
        font-weight: bold;
        margin-top: 2px;
    }
    #gm_chat_window {
      position: absolute;
      bottom: 4.5rem;
      right: 0;
      width: 21rem;
      height: 30rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    #gm_chat_window.active {
      display: flex;
    }
    .chat-msg {
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      font-size: 0.8125rem;
      line-height: 1.25rem;
    }
    .chat-msg-bot {
      background: #f1f5f9;
      color: #1a2332;
      align-self: flex-start;
      border-bottom-left-radius: 0.25rem;
    }
    .chat-msg-user {
      background: #2d7a5f;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 0.25rem;
    }
    .suggestion-btn {
      cursor: pointer;
      font-weight: 500;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  const widget = document.createElement('div');
  widget.id = 'gm_chat_widget';
  widget.innerHTML = `
    <div id="gm_chat_window">
      <div class="p-4 bg-slate-900 text-white flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="h-6 w-6 rounded-full bg-brand-green flex items-center justify-center">
            <i data-lucide="bot" class="h-3 w-3 text-white"></i>
          </div>
          <span class="text-xs font-bold uppercase tracking-wider text-white">ARIA AI Assistant</span>
        </div>
        <button id="gm_close_chat" class="text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none outline-none">
          <i data-lucide="x" class="h-4 w-4"></i>
        </button>
      </div>
      <div id="gm_chat_messages" class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50">
        <div class="flex flex-col gap-1 w-full max-w-[85%] self-start">
          <div class="chat-msg chat-msg-bot">
            Hi! I'm ARIA, your real-time B2B Portal Assistant 👋 How can I assist you with orders, stock, deliveries, or compliance today?
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-1" id="gm_suggestions">
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2.5 py-1 rounded-full hover:border-brand-green hover:text-brand-green transition-colors" data-msg="Give me today's summary">📊 Today's Summary</button>
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2.5 py-1 rounded-full hover:border-brand-green hover:text-brand-green transition-colors" data-msg="Which products are running low on stock?">⚠️ Low Stock</button>
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2.5 py-1 rounded-full hover:border-brand-green hover:text-brand-green transition-colors" data-msg="Show me overdue credit accounts">💳 Overdue Credits</button>
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2.5 py-1 rounded-full hover:border-brand-green hover:text-brand-green transition-colors" data-msg="Give me list of orders to be delivered">🚚 Deliveries</button>
        </div>
      </div>
      <div class="p-3 border-t border-slate-200 bg-white">
        <form id="gm_chat_form" class="flex gap-2">
          <input type="text" id="gm_chat_input" placeholder="Type a message..." class="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-green">
          <button type="submit" class="p-2 bg-brand-green text-white rounded-lg hover:bg-brand-hover transition-colors cursor-pointer border-none outline-none">
            <i data-lucide="send" class="h-4 w-4"></i>
          </button>
        </form>
      </div>
    </div>
    <div id="gm_chat_bubble" title="Ask ARIA">
      <i data-lucide="message-circle" id="gm_bubble_icon" class="h-6 w-6"></i>
      <span id="gm_brand">ARIA</span>
    </div>
  `;
  document.body.appendChild(widget);

  const bubble = document.getElementById('gm_chat_bubble');
  const chatWindow = document.getElementById('gm_chat_window');
  const closeBtn = document.getElementById('gm_close_chat');
  const form = document.getElementById('gm_chat_form');
  const input = document.getElementById('gm_chat_input');
  const msgContainer = document.getElementById('gm_chat_messages');
  const suggestionBtns = document.querySelectorAll('.suggestion-btn');

  bubble.onclick = () => {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      input.focus();
    }
  };

  closeBtn.onclick = () => {
    chatWindow.classList.remove('active');
  };

  suggestionBtns.forEach(btn => {
      btn.onclick = () => {
          input.value = btn.getAttribute('data-msg');
          form.dispatchEvent(new Event('submit'));
      }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');
    
    // Hide original suggestions after first user message
    const suggestions = document.getElementById('gm_suggestions');
    if (suggestions) suggestions.style.display = 'none';

    try {
      // Load current user profile from local storage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

      const response = await fetch('/assistant/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: currentUser?.uid || '',
          role: currentUser?.role || 'Customer',
          subRole: currentUser?.subRole || null,
          name: currentUser?.name || '',
          currentPage: window.location.pathname
        })
      });
      const data = await response.json();
      addMessage(data.reply || "I'm sorry, I couldn't process that.", 'bot', data.suggestions || []);
    } catch (err) {
      console.error("Chat error:", err);
      addMessage("Connection error. Please try again later.", 'bot');
    }
  };

  function addMessage(text, role, suggestions = []) {
    const msg = document.createElement('div');
    msg.className = `flex flex-col gap-1 w-full max-w-[85%] ${role === 'user' ? 'self-end' : 'self-start'}`;
    
    const bubbleElement = document.createElement('div');
    bubbleElement.className = `chat-msg chat-msg-${role} w-full overflow-hidden`;
    
    const isHtml = text.includes('<table') || text.includes('grid-cols') || text.includes('<ul>') || text.includes('<div');
    
    if (role === 'bot' && isHtml) {
      bubbleElement.innerHTML = text;
    } else if (role === 'bot') {
      let formatted = escapeHtml(text);
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/\n- (.*?)(?=\n|$)/g, '<br>• $1');
      bubbleElement.innerHTML = formatted;
    } else {
      bubbleElement.innerText = text;
    }
    
    msg.appendChild(bubbleElement);
    
    // Append dynamic suggestions if present
    if (role === 'bot' && suggestions && suggestions.length > 0) {
      const sugContainer = document.createElement('div');
      sugContainer.className = 'flex flex-wrap gap-1 mt-1';
      suggestions.forEach(sug => {
        const btn = document.createElement('button');
        btn.className = 'text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded-full hover:border-[#2d7a5f] hover:text-[#2d7a5f] transition-all cursor-pointer font-medium bg-transparent outline-none';
        btn.innerText = sug;
        btn.onclick = () => {
          input.value = sug;
          form.dispatchEvent(new Event('submit'));
        };
        sugContainer.appendChild(btn);
      });
      msg.appendChild(sugContainer);
    }
    
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    
    if (window.lucide) {
      window.lucide.createIcons({ root: msg });
    }
    
    return msg;
  }

  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
})();
