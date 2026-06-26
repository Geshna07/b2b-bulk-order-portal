/**
 * Toast Notification System
 */

class ToastManager {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info') {
    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    
    const icons = {
      success: '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
      error: '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
      warning: '<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
      info: '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };

    toast.className = `max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 transform translate-x-full opacity-0 flex items-center p-4 border ${colors[type] || colors.info}`;
    
    toast.innerHTML = `
      <div class="flex-shrink-0">${icons[type] || icons.info}</div>
      <div class="ml-3 w-0 flex-1 pt-0.5">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <div class="ml-4 flex-shrink-0 flex">
        <button class="bg-transparent rounded-md inline-flex text-inherit hover:opacity-75 focus:outline-none">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    `;

    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Close button
    toast.querySelector('button').addEventListener('click', () => {
      this.close(toast);
    });

    // Auto close
    setTimeout(() => {
      this.close(toast);
    }, 4000);
  }

  close(toast) {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => {
      if (toast.parentNode === this.container) {
        this.container.removeChild(toast);
      }
    }, 300);
  }
}

window.toast = new ToastManager();
