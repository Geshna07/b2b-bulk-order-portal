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
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      transition: all 0.2s;
    }
    #gm_chat_bubble:hover {
      transform: scale(1.1);
      background: #245f4a;
    }
    #gm_chat_window {
      position: absolute;
      bottom: 4.5rem;
      right: 0;
      width: 20rem;
      height: 28rem;
      background: white;
      border: 1px border-brand-border;
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
      max-width: 85%;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      font-size: 0.875rem;
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
      <div class="p-4 bg-brand-dark text-white flex justify-between items-center">
        <div class="flex items-center gap-2">
          <div class="h-6 w-6 rounded-full bg-brand-green flex items-center justify-center">
            <i data-lucide="bot" class="h-3 w-3"></i>
          </div>
          <span class="text-xs font-bold uppercase tracking-wider">Assistant</span>
        </div>
        <button id="gm_close_chat" class="text-slate-400 hover:text-white transition-colors">
          <i data-lucide="x" class="h-4 w-4"></i>
        </button>
      </div>
      <div id="gm_chat_messages" class="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-slate-50">
        <div class="chat-msg chat-msg-bot">
          Hi! I'm your Ganga Maxx Assistant. Do you need any suggestions or help with the portal today?
        </div>
        <div class="flex flex-wrap gap-2 mt-2" id="gm_suggestions">
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full hover:border-brand-green transition-colors">How to place an order?</button>
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full hover:border-brand-green transition-colors">Check my credit limit</button>
          <button class="suggestion-btn text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-full hover:border-brand-green transition-colors">Track my shipment</button>
        </div>
      </div>
      <div class="p-3 border-t border-slate-200 bg-white">
        <form id="gm_chat_form" class="flex gap-2">
          <input type="text" id="gm_chat_input" placeholder="Type a message..." class="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-green">
          <button type="submit" class="p-2 bg-brand-green text-white rounded-lg hover:bg-brand-hover transition-colors">
            <i data-lucide="send" class="h-4 w-4"></i>
          </button>
        </form>
      </div>
    </div>
    <div id="gm_chat_bubble">
      <i data-lucide="message-circle" id="gm_bubble_icon" class="h-6 w-6"></i>
    </div>
  `;
  document.body.appendChild(widget);

  const bubble = document.getElementById('gm_chat_bubble');
  const chatWindow = document.getElementById('gm_chat_window');
  const closeBtn = document.getElementById('gm_close_chat');
  const form = document.getElementById('gm_chat_form');
  const input = document.getElementById('gm_chat_input');
  const msgContainer = document.getElementById('gm_chat_messages');

  bubble.onclick = () => {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      input.focus();
    }
  };

  closeBtn.onclick = () => {
    chatWindow.classList.remove('active');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addMessage(text, 'user');
    
    // Hide suggestions after first interaction
    const suggestions = document.getElementById('gm_suggestions');
    if (suggestions) suggestions.style.display = 'none';

    try {
      const response = await fetch('/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          systemPrompt: `You are the Ganga Maxx Marketplace Assistant. 
          Help users understand the portal:
          - Admins can manage staff, customers, products, and WhatsApp notifications.
          - Customers can place orders, request quotations, and track deliveries.
          - Staff can process orders, manage deliveries, and assist customers.
          Keep responses concise and helpful. If asked about features, explain how to find them in the dashboard.`
        })
      });
      const data = await response.json();
      addMessage(data.reply || "I'm sorry, I couldn't process that.", 'bot');
    } catch (err) {
      console.error("Chat error:", err);
      addMessage("Connection error. Please try again later.", 'bot');
    }
  };

  function addMessage(text, role) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${role}`;
    msg.innerText = text;
    msgContainer.appendChild(msg);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  // Init icons if lucide is available
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        'stroke-width': 2
      },
      nameAttr: 'data-lucide',
      icons: undefined
    });
  }
})();
