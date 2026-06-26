/**
 * UI Enhancements (Loading, Confirm Dialog, Session Timeout, Empty States)
 */

class UIManager {
  constructor() {
    this.loadingOverlay = null;
    this.confirmModal = null;
    
    // Session timeout config
    this.timeoutLimit = 30 * 60 * 1000; // 30 minutes
    this.warningTime = 5 * 60 * 1000; // 5 minutes before timeout
    this.lastActivity = Date.now();
    this.sessionInterval = null;
    this.warningShown = false;
    
    this.initLoading();
    this.initConfirm();
    this.initSessionTimeout();
  }

  // --- Loading Spinner ---
  initLoading() {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'fixed inset-0 bg-white/80 backdrop-blur-sm z-[99999] hidden flex-col items-center justify-center transition-opacity duration-200 opacity-0';
    this.loadingOverlay.innerHTML = `
      <div class="w-12 h-12 border-4 border-slate-200 border-t-brand-green rounded-full animate-spin"></div>
      <p class="mt-4 text-sm font-medium text-slate-600 animate-pulse">Loading...</p>
    `;
    document.body.appendChild(this.loadingOverlay);
  }

  showLoading() {
    this.loadingOverlay.classList.remove('hidden');
    // slight delay for transition
    setTimeout(() => this.loadingOverlay.classList.remove('opacity-0'), 10);
  }

  hideLoading() {
    this.loadingOverlay.classList.add('opacity-0');
    setTimeout(() => this.loadingOverlay.classList.add('hidden'), 200);
  }

  // --- Confirm Dialog ---
  initConfirm() {
    this.confirmModal = document.createElement('div');
    this.confirmModal.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] hidden flex items-center justify-center opacity-0 transition-opacity duration-200';
    this.confirmModal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden transform scale-95 transition-transform duration-200" id="confirm_modal_box">
        <div class="p-6">
          <h3 class="text-lg font-bold text-slate-900 mb-2" id="confirm_title">Confirm Action</h3>
          <p class="text-sm text-slate-600 mb-6" id="confirm_message">Are you sure you want to proceed?</p>
          <div class="flex justify-end gap-3">
            <button id="confirm_btn_cancel" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button id="confirm_btn_action" class="px-4 py-2 text-sm font-medium text-white bg-brand-green hover:bg-brand-green/90 rounded-lg transition-colors shadow-sm">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.confirmModal);
  }

  confirm(message, title = "Confirm Action", confirmText = "Confirm", isDestructive = false) {
    return new Promise((resolve) => {
      document.getElementById('confirm_title').innerText = title;
      document.getElementById('confirm_message').innerText = message;
      
      const actionBtn = document.getElementById('confirm_btn_action');
      actionBtn.innerText = confirmText;
      if (isDestructive) {
        actionBtn.className = "px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm";
      } else {
        actionBtn.className = "px-4 py-2 text-sm font-medium text-white bg-brand-green hover:bg-brand-green/90 rounded-lg transition-colors shadow-sm";
      }

      this.confirmModal.classList.remove('hidden');
      setTimeout(() => {
        this.confirmModal.classList.remove('opacity-0');
        document.getElementById('confirm_modal_box').classList.remove('scale-95');
      }, 10);

      const handleConfirm = () => { cleanup(true); };
      const handleCancel = () => { cleanup(false); };

      const cancelBtn = document.getElementById('confirm_btn_cancel');
      actionBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);

      const cleanup = (result) => {
        actionBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        this.confirmModal.classList.add('opacity-0');
        document.getElementById('confirm_modal_box').classList.add('scale-95');
        setTimeout(() => this.confirmModal.classList.add('hidden'), 200);
        resolve(result);
      };
    });
  }

  // --- Session Timeout ---
  initSessionTimeout() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => { this.lastActivity = Date.now(); this.warningShown = false; };
    
    events.forEach(evt => document.addEventListener(evt, updateActivity, { passive: true }));

    this.sessionInterval = setInterval(() => {
      const now = Date.now();
      const inactiveTime = now - this.lastActivity;

      // Ignore if not logged in
      const currentUser = localStorage.getItem('currentUser');
      if (!currentUser) return;

      if (inactiveTime > this.timeoutLimit) {
        // Logout
        this.logout("Session expired due to inactivity.");
      } else if (inactiveTime > (this.timeoutLimit - this.warningTime) && !this.warningShown) {
        // Show warning
        this.warningShown = true;
        if (window.toast) {
          window.toast.show("Your session will expire soon due to inactivity. Please interact with the page to stay logged in.", "warning");
        }
      }
    }, 60000); // check every minute
  }

  logout(reason) {
    if (window.toast) window.toast.show(reason, "info");
    setTimeout(() => {
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
      window.location.href = '/pages/login.html';
    }, 2000);
  }
}

window.ui = new UIManager();

// Global fetch interception is disabled to prevent unnecessary full-screen loading overlays.


// Form Auto-save utility
export function initAutoSave(formId, storageKey) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Load saved
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      for (const key in data) {
        const el = form.elements[key];
        if (el) el.value = data[key];
      }
    } catch(e){}
  }

  // Save every 30s
  setInterval(() => {
    const data = {};
    const formData = new FormData(form);
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, 30000);

  // Clear on submit
  form.addEventListener('submit', () => {
    localStorage.removeItem(storageKey);
  });
}
