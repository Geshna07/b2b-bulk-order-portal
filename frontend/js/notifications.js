import { db } from '/firebase/firebaseConfig.js';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';

export function initNotifications(userId) {
  const bellBtn = document.getElementById('notification_bell');
  if (!bellBtn) return;

  // Create notification dropdown container if it doesn't exist
  let dropdown = document.getElementById('notifications_dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'notifications_dropdown';
    dropdown.className = 'fixed top-16 right-4 w-80 bg-white border border-brand-border rounded-xl shadow-xl z-50 hidden flex flex-col max-h-[400px] overflow-hidden';
    dropdown.innerHTML = `
      <div class="p-4 border-b border-brand-border flex justify-between items-center bg-slate-50">
        <h3 class="text-sm font-bold text-brand-dark">Notifications</h3>
        <button id="close_notifications" class="text-brand-text-muted hover:text-brand-dark">
          <i data-lucide="x" class="h-4 w-4"></i>
        </button>
      </div>
      <div id="notifications_list" class="flex-1 overflow-y-auto divide-y divide-brand-border">
        <div class="p-8 text-center text-xs text-brand-text-muted">No new notifications.</div>
      </div>
    `;
    document.body.appendChild(dropdown);
    
    // Add event listener to bell
    bellBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    };

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== bellBtn && !bellBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Close button
    document.getElementById('close_notifications').onclick = () => {
      dropdown.classList.add('hidden');
    };
  }

  const badge = bellBtn.querySelector('span') || document.createElement('span');
  if (!bellBtn.querySelector('span')) {
    badge.className = 'absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-rose-500 border border-white hidden';
    bellBtn.appendChild(badge);
  }

  // Check for morning notification
  const lastGreeting = localStorage.getItem('lastGreetingDate');
  const today = new Date().toDateString();
  if (lastGreeting !== today) {
    // This is a simple client-side check. In a real app, this should be server-side.
    // For this, I will just trigger a UI toast/notification.
    setTimeout(() => {
        if(window.toast) window.toast.show("Good Morning! Ready to explore new products today?");
        localStorage.setItem('lastGreetingDate', today);
    }, 2000);
  }

  // Real-time listener
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    renderNotifications(notifications);
  }, (err) => {
    console.error("Notifications listener error:", err);
  });

  async function markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  function renderNotifications(notifications) {
    const list = document.getElementById('notifications_list');
    if (notifications.length === 0) {
      list.innerHTML = '<div class="p-8 text-center text-xs text-brand-text-muted">No notifications yet.</div>';
      return;
    }

    list.innerHTML = notifications.map(n => {
      const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const readClass = n.read ? 'opacity-60' : 'bg-brand-green/5';
      
      return `
        <div class="p-4 hover:bg-slate-50 transition-colors cursor-pointer ${readClass}" onclick="this.dataset.id && window.markNotificationRead(this.dataset.id)" data-id="${n.id}">
          <div class="flex justify-between items-start mb-1">
            <span class="text-xs font-bold text-brand-dark">${n.title || 'Notification'}</span>
            <span class="text-[10px] text-brand-text-muted">${timeStr}</span>
          </div>
          <p class="text-xs text-brand-text-muted leading-relaxed">${n.message}</p>
        </div>
      `;
    }).join('');

    // Attach to window for the onclick handler
    window.markNotificationRead = markAsRead;
    
    // Re-init icons
    if (window.lucide) window.lucide.createIcons();
  }
}
