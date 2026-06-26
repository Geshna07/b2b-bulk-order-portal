const fs = require('fs');
const path = require('path');

function processAdminStaff(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Talk to AI Assistant')) return;
  const target = '</nav>';
  const replacement = `
        <button onclick="window.location.href='/pages/assistant.html'" class="w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg font-medium transition-colors hover:bg-slate-800 text-slate-300 mt-4 border border-slate-800">
          <span class="flex items-center gap-3">
            <i data-lucide="bot" class="h-4 w-4 text-brand-green"></i>
            Talk to AI Assistant
          </span>
        </button>
      </nav>`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Updated nav in', file);
  }
}

function processCustomer(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Talk to AI Assistant')) return;
  const target = `<span>Quotations</span>\n        </a>\n      </div>`;
  const replacement = `<span>Quotations</span>\n        </a>\n        \n        <a href="/pages/assistant.html" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-green hover:bg-brand-green hover:text-white transition-colors border border-brand-green/20 mt-4">\n          <i data-lucide="bot" class="h-4 w-4"></i>\n          <span>Talk to AI Assistant</span>\n        </a>\n      </div>`;
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log('Updated nav in', file);
  }
}

const adminFile = path.join(__dirname, 'frontend/pages/admin/dashboard.html');
processAdminStaff(adminFile);

['sales-admin.html', 'warehouse.html', 'salesman.html', 'delivery.html', 'accounts.html', 'compliance.html'].forEach(name => {
  processAdminStaff(path.join(__dirname, 'frontend/pages/staff/', name));
});

['dashboard.html', 'products.html', 'place-order.html', 'my-orders.html', 'quotation.html'].forEach(name => {
  processCustomer(path.join(__dirname, 'frontend/pages/customer/', name));
});
console.log("Done");
