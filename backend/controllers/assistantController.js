import { db } from '../utils/firebaseAdmin.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SYSTEM_PROMPT = `You are ARIA (Automated Response & Intelligence Assistant) for Ganga Maxx Marketplace B2B Bulk Order Portal. You are an expert assistant who knows everything about this portal inside out. Always be professional, clear, and helpful.`;

// Normalizes roles/subroles from frontend storage to match the required spec
export function getNormalizedRole(role, subRole) {
  if (!role) return 'customer';
  const r = role.toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'customer') return 'customer';
  if (r === 'staff') {
    const s = (subRole || '').toLowerCase();
    if (s === 'salesadmin' || s === 'sales_admin' || s === 'sales admin') return 'sales_admin';
    if (s === 'warehousestaff' || s === 'warehouse_staff' || s === 'warehouse staff') return 'warehouse_staff';
    if (s === 'salesman' || s === 'sales rep' || s === 'sales_rep') return 'salesman';
    if (s === 'deliverycoordinator' || s === 'delivery_coordinator' || s === 'delivery coordinator' || s === 'logistics' || s === 'logistics staff') return 'delivery_coordinator';
    if (s === 'accountsmanager' || s === 'accounts_manager' || s === 'accounts manager') return 'accounts_manager';
    if (s === 'complianceadmin' || s === 'compliance_admin' || s === 'compliance admin' || s === 'compliance officer') return 'compliance_admin';
  }
  return 'customer';
}

// Permission map for different intents
const PERMISSIONS = {
  admin: ['ORDERS', 'DELIVERIES', 'INVENTORY', 'CUSTOMERS', 'STAFF', 'QUOTATIONS', 'CREDIT', 'REVENUE', 'COMPLIANCE', 'SUMMARY'],
  sales_admin: ['ORDERS', 'QUOTATIONS', 'CUSTOMERS', 'REVENUE'],
  warehouse_staff: ['INVENTORY', 'ORDERS', 'COMPLIANCE'],
  salesman: ['CUSTOMERS', 'QUOTATIONS', 'ORDERS'],
  delivery_coordinator: ['DELIVERIES', 'ORDERS'],
  accounts_manager: ['CREDIT', 'REVENUE'],
  compliance_admin: ['COMPLIANCE'],
  customer: ['ORDERS', 'QUOTATIONS']
};

export function detectIntent(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('deliver') || 
      msg.includes('dispatch') ||
      msg.includes('in transit')) 
    return 'DELIVERIES';
    
  if (msg.includes('stock') || 
      msg.includes('inventory') ||
      msg.includes('low'))
    return 'INVENTORY';
    
  if (msg.includes('order') || 
      msg.includes('pending') ||
      msg.includes('approved'))
    return 'ORDERS';
    
  if (msg.includes('customer') || 
      msg.includes('institution'))
    return 'CUSTOMERS';
    
  if (msg.includes('staff') || 
      msg.includes('approval') ||
      msg.includes('team'))
    return 'STAFF';
    
  if (msg.includes('quotation') || 
      msg.includes('quote'))
    return 'QUOTATIONS';
    
  if (msg.includes('credit') || 
      msg.includes('payment') ||
      msg.includes('overdue') ||
      msg.includes('owes'))
    return 'CREDIT';
    
  if (msg.includes('revenue') || 
      msg.includes('earning') ||
      msg.includes('income'))
    return 'REVENUE';
    
  if (msg.includes('compliance') || 
      msg.includes('msds') ||
      msg.includes('chemical'))
    return 'COMPLIANCE';
    
  if (msg.includes('summary') || 
      msg.includes('overview') ||
      msg.includes('today'))
    return 'SUMMARY';
    
  return 'GENERAL';
}

// Helper to format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
};

// Helper to format date
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dateStr.substring(0, 10);
};

// Helper to render HTML Badge
const getBadge = (status) => {
  const val = (status || '').toLowerCase();
  let bg = 'bg-slate-100 text-slate-800';
  if (['pending', 'scheduled', 'sent'].includes(val)) {
    bg = 'bg-amber-100 text-amber-800';
  } else if (['approved', 'active', 'compliant', 'healthy'].includes(val)) {
    bg = 'bg-emerald-100 text-emerald-800';
  } else if (['packed', 'partial'].includes(val)) {
    bg = 'bg-indigo-100 text-indigo-800';
  } else if (['dispatched', 'in_transit', 'in transit'].includes(val)) {
    bg = 'bg-purple-100 text-purple-800';
  } else if (['delivered', 'paid'].includes(val)) {
    bg = 'bg-teal-100 text-teal-800';
  } else if (['cancelled', 'rejected', 'failed', 'overdue', 'low stock', 'out of stock'].includes(val)) {
    bg = 'bg-rose-100 text-rose-800';
  }
  return `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${bg}">${status}</span>`;
};

// Render full table
const wrapTable = (headers, rows) => {
  return `
    <div class="overflow-x-auto max-h-[260px] overflow-y-auto border border-slate-200 rounded-lg my-2 shadow-sm">
      <table class="min-w-full text-xs text-left text-slate-600 border-collapse">
        <thead class="text-[10px] text-white uppercase bg-[#2d7a5f] sticky top-0">
          <tr>
            ${headers.map(h => `<th class="px-3 py-2 border-b border-slate-200 font-bold">${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map((row, i) => `
            <tr class="${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors">
              ${row.map(cell => `<td class="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// Main controller handler for /assistant/query
export async function queryAssistant(req, res) {
  try {
    const { message, userId, role, subRole, name } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const intent = detectIntent(message);
    const normRole = getNormalizedRole(role, subRole);

    console.log(`[Assistant Query] Message: "${message}" | Intent: ${intent} | Role: ${normRole} | User: ${name || userId}`);

    // If intent is GENERAL, fall back to Gemini-powered conversational assistant
    if (intent === 'GENERAL') {
      return await handleGeneralChat(req, res);
    }

    // Role-based Access Rules Check
    const allowedIntents = PERMISSIONS[normRole] || [];
    if (!allowedIntents.includes(intent)) {
      return res.json({
        reply: "You don't have permission to access that data. Please contact your administrator.",
        suggestions: ["How to place an order?", "How to track a delivery?", "Account setup help"],
        intent
      });
    }

    // Fetch and handle different intents
    let reply = '';
    let suggestions = [];

    switch (intent) {
      case 'ORDERS': {
        const snapshot = await db.collection('orders').get();
        let orders = [];
        snapshot.forEach(doc => {
          orders.push({ id: doc.id, ...doc.data() });
        });

        // 1. Role level filtering
        if (normRole === 'customer') {
          orders = orders.filter(o => o.customerId === userId);
        } else if (normRole === 'salesman') {
          // salesman sees assigned or default salesman orders
          orders = orders.filter(o => o.assignedSalesman === name || o.assignedSalesman === 'Vikram Singh');
        } else if (normRole === 'warehouse_staff') {
          // warehouse can only see orders at packed or approved stage
          orders = orders.filter(o => ['approved', 'packed'].includes(o.status));
        } else if (normRole === 'delivery_coordinator') {
          // delivery coordinator sees dispatched orders
          orders = orders.filter(o => o.status === 'dispatched');
        }

        // 2. Keyword sub-filtering
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('pending')) {
          orders = orders.filter(o => o.status === 'pending');
        } else if (lowerMsg.includes('delivered')) {
          orders = orders.filter(o => o.status === 'delivered');
        } else if (lowerMsg.includes('cancelled')) {
          orders = orders.filter(o => o.status === 'cancelled');
        } else if (lowerMsg.includes('approved')) {
          orders = orders.filter(o => o.status === 'approved');
        } else if (lowerMsg.includes('packed')) {
          orders = orders.filter(o => o.status === 'packed');
        } else if (lowerMsg.includes('dispatched')) {
          orders = orders.filter(o => o.status === 'dispatched');
        } else if (lowerMsg.includes('today')) {
          const todayStr = new Date().toISOString().substring(0, 10);
          orders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
        } else if (lowerMsg.includes('for ')) {
          // Extract possible customer name
          const customerMatch = lowerMsg.match(/for\s+([a-zA-Z0-9_\s]+)/);
          if (customerMatch && customerMatch[1]) {
            const searchName = customerMatch[1].trim();
            orders = orders.filter(o => 
              (o.customerName && o.customerName.toLowerCase().includes(searchName)) ||
              (o.institutionName && o.institutionName.toLowerCase().includes(searchName))
            );
          }
        }

        // Sort by date descending
        orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        if (orders.length === 0) {
          reply = "No orders found matching your query! Everything is up to date ✅";
        } else {
          const headers = ["Order ID", "Customer", "Institution", "Amount", "Status", "Date"];
          const rows = orders.map(o => [
            o.orderId || o.id,
            o.customerName || 'N/A',
            o.institutionName || 'N/A',
            formatCurrency(o.orderTotal),
            getBadge(o.status),
            formatDate(o.createdAt)
          ]);
          reply = `Here are the orders matching your query:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show only pending orders",
          "Show delivered orders today",
          "Which order needs attention?"
        ];
        break;
      }

      case 'DELIVERIES': {
        const deliveriesSnap = await db.collection('deliveries').get();
        const ordersSnap = await db.collection('orders').get();

        const ordersMap = {};
        ordersSnap.forEach(doc => {
          ordersMap[doc.id] = doc.data();
        });

        let list = [];
        deliveriesSnap.forEach(doc => {
          const del = doc.data();
          const order = ordersMap[del.orderId] || {};
          list.push({
            id: doc.id,
            ...del,
            customerName: order.customerName || 'N/A',
            address: order.deliveryAddress ? `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` : 'N/A',
            date: del.estimatedDate || del.createdAt || order.createdAt
          });
        });

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('today')) {
          const todayStr = new Date().toISOString().substring(0, 10);
          list = list.filter(d => d.date && d.date.startsWith(todayStr));
        } else if (lowerMsg.includes('pending')) {
          list = list.filter(d => d.status === 'scheduled');
        } else if (lowerMsg.includes('failed')) {
          list = list.filter(d => d.status === 'failed');
        } else if (lowerMsg.includes('in transit') || lowerMsg.includes('dispatched')) {
          list = list.filter(d => ['dispatched', 'in_transit'].includes(d.status));
        }

        if (list.length === 0) {
          reply = "No deliveries found matching your query! 🚚";
        } else {
          const headers = ["Order ID", "Customer", "Address", "Driver", "Vehicle", "Status", "Date"];
          const rows = list.map(d => [
            d.orderId || 'N/A',
            d.customerName,
            d.address,
            d.driverName || 'Unassigned',
            d.vehicleNumber || 'Unassigned',
            getBadge(d.status),
            formatDate(d.date)
          ]);
          reply = `Here is the current delivery schedule:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show failed deliveries",
          "Mark an order as delivered",
          "Show today's delivery schedule"
        ];
        break;
      }

      case 'INVENTORY': {
        const inventorySnap = await db.collection('inventory').get();
        const productsSnap = await db.collection('products').get();

        const productsMap = {};
        productsSnap.forEach(doc => {
          productsMap[doc.id] = doc.data();
        });

        let items = [];
        inventorySnap.forEach(doc => {
          const inv = doc.data();
          const product = productsMap[inv.productId] || {};
          items.push({
            id: doc.id,
            ...inv,
            sku: product.sku || inv.sku || 'GMX-PROD-SKU'
          });
        });

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('low') || lowerMsg.includes('alert') || lowerMsg.includes('restock')) {
          items = items.filter(i => i.currentStock <= i.reorderLevel);
        } else if (lowerMsg.includes('out of stock')) {
          items = items.filter(i => i.currentStock === 0);
        }

        if (items.length === 0) {
          reply = "No inventory records found! Everything is perfectly stocked. ✅";
        } else {
          const headers = ["Product", "SKU", "Current Stock", "Reorder Level", "Status"];
          const rows = items.map(i => {
            const isLow = i.currentStock <= i.reorderLevel;
            const statusStr = i.currentStock === 0 ? 'Out of Stock' : (isLow ? 'Low Stock' : 'Healthy');
            const stockDisplay = isLow ? `<span class="text-rose-600 font-bold">${i.currentStock}</span>` : i.currentStock;
            return [
              i.productName || 'N/A',
              i.sku,
              stockDisplay,
              i.reorderLevel,
              getBadge(statusStr)
            ];
          });
          reply = `Here are the latest stock levels from the warehouse:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Which products need restocking?",
          "Show out of stock products",
          "Update stock levels"
        ];
        break;
      }

      case 'CUSTOMERS': {
        const usersSnap = await db.collection('users').get();
        const ordersSnap = await db.collection('orders').get();

        // Count orders per customer
        const orderCounts = {};
        ordersSnap.forEach(doc => {
          const order = doc.data();
          if (order.customerId) {
            orderCounts[order.customerId] = (orderCounts[order.customerId] || 0) + 1;
          }
        });

        let customers = [];
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (u.role === 'customer') {
            customers.push({
              id: doc.id,
              ...u,
              ordersCount: orderCounts[doc.id] || 0
            });
          }
        });

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('new')) {
          // Customers created in the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          customers = customers.filter(c => new Date(c.createdAt || 0) >= thirtyDaysAgo);
        } else if (lowerMsg.includes('pending')) {
          customers = customers.filter(c => c.status === 'pending');
        } else if (lowerMsg.includes('active')) {
          customers = customers.filter(c => c.status === 'active');
        }

        if (customers.length === 0) {
          reply = "No registered customers found. 👤";
        } else {
          const headers = ["Name", "Institution", "Type", "Email", "Status", "Orders Count"];
          const rows = customers.map(c => [
            c.name || 'N/A',
            c.institutionName || 'N/A',
            c.institutionType || 'N/A',
            c.email || 'N/A',
            getBadge(c.status),
            `<span class="font-bold text-[#2d7a5f]">${c.ordersCount}</span>`
          ]);
          reply = `Here is the list of B2B client institutions:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show new customers this month",
          "Which customer has most orders?",
          "Show overdue credit customers"
        ];
        break;
      }

      case 'STAFF': {
        const usersSnap = await db.collection('users').get();
        let staff = [];
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (u.role === 'staff') {
            staff.push({ id: doc.id, ...u });
          }
        });

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('pending') || lowerMsg.includes('approval')) {
          staff = staff.filter(s => s.status === 'pending');
        }

        // Format subRole label helper
        const getSubRoleLabel = (sub) => {
          const map = {
            salesAdmin: "Sales Admin",
            warehouseStaff: "Warehouse Staff",
            salesman: "Salesman",
            deliveryCoordinator: "Delivery Coordinator",
            accountsManager: "Accounts Manager",
            complianceAdmin: "Compliance Admin"
          };
          return map[sub] || sub || 'Staff';
        };

        if (staff.length === 0) {
          reply = "No staff members found matching your request. 🧑‍💼";
        } else {
          const headers = ["Name", "Sub Role", "Email", "Status", "Joined Date"];
          const rows = staff.map(s => [
            s.name || 'N/A',
            getSubRoleLabel(s.subRole),
            s.email || 'N/A',
            getBadge(s.status),
            formatDate(s.createdAt)
          ]);
          reply = `Here are the portal staff members:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show pending staff approvals",
          "Who are my salesmen?",
          "Approved staff list"
        ];
        break;
      }

      case 'QUOTATIONS': {
        const snapshot = await db.collection('quotations').get();
        let list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });

        if (normRole === 'customer') {
          list = list.filter(q => q.customerId === userId);
        }

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('pending') || lowerMsg.includes('sent')) {
          list = list.filter(q => q.status === 'sent');
        } else if (lowerMsg.includes('accepted')) {
          list = list.filter(q => q.status === 'accepted');
        } else if (lowerMsg.includes('rejected')) {
          list = list.filter(q => q.status === 'rejected');
        } else if (lowerMsg.includes('today')) {
          const todayStr = new Date().toISOString().substring(0, 10);
          list = list.filter(q => q.createdAt && q.createdAt.startsWith(todayStr));
        }

        if (list.length === 0) {
          reply = "No quotations found. 💰";
        } else {
          const headers = ["Quotation ID", "Customer", "Amount", "Status", "Valid Until"];
          const rows = list.map(q => [
            q.quotationId || q.id,
            q.customerName || 'N/A',
            formatCurrency(q.totalAmount || q.subtotal),
            getBadge(q.status),
            formatDate(q.validUntil)
          ]);
          reply = `Here are the active pricing quotations:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show pending quotations",
          "Show quotations today",
          "Create new quotation"
        ];
        break;
      }

      case 'CREDIT': {
        const snapshot = await db.collection('creditAccounts').get();
        let list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });

        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('overdue') || lowerMsg.includes('due') || lowerMsg.includes('owes')) {
          list = list.filter(c => c.status === 'overdue' || (c.agingBuckets && c.agingBuckets.days90plus > 0));
        }

        if (list.length === 0) {
          reply = "No credit accounts found matching your query! Everything is balanced. ✅";
        } else {
          const headers = ["Customer", "Credit Limit", "Used", "Balance", "Days Overdue", "Status"];
          const rows = list.map(c => [
            c.customerName || 'N/A',
            formatCurrency(c.creditLimit),
            formatCurrency(c.usedCredit),
            formatCurrency(c.balance),
            c.paymentTermDays || '30',
            getBadge(c.status)
          ]);
          reply = `Here is the credit accounts outstanding balance report:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show overdue accounts",
          "Who owes most money?",
          "Credit accounts summary"
        ];
        break;
      }

      case 'REVENUE': {
        const ordersSnap = await db.collection('orders').get();
        let deliveredOrders = [];
        ordersSnap.forEach(doc => {
          const order = doc.data();
          if (order.status === 'delivered' || order.paymentStatus === 'paid') {
            deliveredOrders.push(order);
          }
        });

        const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.orderTotal || 0), 0);

        // Breakdown by month
        const monthlyBreakdown = {};
        deliveredOrders.forEach(o => {
          if (o.createdAt) {
            const date = new Date(o.createdAt);
            const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + (o.orderTotal || 0);
          }
        });

        let breakdownHtml = `<ul class="list-disc pl-5 mt-2 space-y-1 font-mono text-xs text-slate-700">`;
        for (const [month, value] of Object.entries(monthlyBreakdown)) {
          breakdownHtml += `<li><strong>${month}:</strong> ${formatCurrency(value)}</li>`;
        }
        breakdownHtml += `</ul>`;

        reply = `
          <div class="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
            <div class="text-[10px] uppercase font-bold tracking-wider text-[#2d7a5f]">Total B2B Portal Revenue</div>
            <div class="text-2xl font-extrabold text-slate-800 my-1 font-mono">${formatCurrency(totalRevenue)}</div>
            <div class="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
              <strong>Monthly Breakdown:</strong>
              ${breakdownHtml}
            </div>
          </div>
        `;

        suggestions = [
          "Show monthly revenue breakdown",
          "Total sales this week",
          "Download revenue report"
        ];
        break;
      }

      case 'COMPLIANCE': {
        const snapshot = await db.collection('complianceRecords').get();
        let list = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });

        if (list.length === 0) {
          reply = "No chemical compliance records found. 🧪";
        } else {
          const headers = ["Product", "Document Status", "Last Review", "Pending Acknowledgements"];
          const rows = list.map(c => [
            c.productName || 'N/A',
            getBadge(c.status),
            formatDate(c.lastReviewDate),
            `<span class="text-indigo-600 font-bold">${c.acknowledgements ? Math.max(0, 3 - c.acknowledgements.length) : 3} Pending</span>`
          ]);
          reply = `Here is the current MSDS compliance register:<br>${wrapTable(headers, rows)}`;
        }

        suggestions = [
          "Show pending acknowledgements",
          "Check MSDS status",
          "Chemical handling guidelines"
        ];
        break;
      }

      case 'SUMMARY': {
        // Fetch all key counts in parallel
        const [usersSnap, ordersSnap, inventorySnap, creditSnap] = await Promise.all([
          db.collection('users').get(),
          db.collection('orders').get(),
          db.collection('inventory').get(),
          db.collection('creditAccounts').get()
        ]);

        let totalCustomers = 0;
        let pendingStaffApprovals = 0;
        usersSnap.forEach(doc => {
          const u = doc.data();
          if (u.role === 'customer') totalCustomers++;
          if (u.role === 'staff' && u.status === 'pending') pendingStaffApprovals++;
        });

        let pendingOrders = 0;
        let deliveredToday = 0;
        let totalRevenueThisMonth = 0;
        const currentMonthStr = new Date().toISOString().substring(0, 7); // "2026-06"
        const todayStr = new Date().toISOString().substring(0, 10); // "2026-06-26"

        ordersSnap.forEach(doc => {
          const o = doc.data();
          if (o.status === 'pending') pendingOrders++;
          if (o.status === 'delivered') {
            if (o.updatedAt && o.updatedAt.startsWith(todayStr)) {
              deliveredToday++;
            }
            if (o.createdAt && o.createdAt.startsWith(currentMonthStr)) {
              totalRevenueThisMonth += (o.orderTotal || 0);
            }
          }
        });

        let lowStockAlerts = 0;
        inventorySnap.forEach(doc => {
          const i = doc.data();
          if (i.currentStock <= i.reorderLevel) lowStockAlerts++;
        });

        let overdueCredits = 0;
        creditSnap.forEach(doc => {
          const c = doc.data();
          if (c.status === 'overdue') overdueCredits++;
        });

        reply = `
          <div class="text-xs font-semibold text-slate-700 mb-2">📊 Ganga Maxx Portal Overview (Today)</div>
          <div class="grid grid-cols-2 gap-2 my-2">
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Customers</span>
              <span class="text-base font-black text-slate-800 font-mono">${totalCustomers}</span>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Pending Orders</span>
              <span class="text-base font-black text-amber-700 font-mono">${pendingOrders}</span>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Delivered Today</span>
              <span class="text-base font-black text-[#2d7a5f] font-mono">${deliveredToday}</span>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Low Stock Alerts</span>
              <span class="text-base font-black text-rose-700 font-mono">${lowStockAlerts}</span>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Pending Approvals</span>
              <span class="text-base font-black text-blue-700 font-mono">${pendingStaffApprovals}</span>
            </div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-150 shadow-sm flex flex-col justify-between">
              <span class="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Overdue Accounts</span>
              <span class="text-base font-black text-rose-700 font-mono">${overdueCredits}</span>
            </div>
            <div class="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex justify-between items-center">
              <span class="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Revenue This Month</span>
              <span class="text-sm font-extrabold text-[#2d7a5f] font-mono">${formatCurrency(totalRevenueThisMonth)}</span>
            </div>
          </div>
        `;

        suggestions = [
          "Show low stock products",
          "Show pending orders",
          "Give me sales report"
        ];
        break;
      }
    }

    return res.json({ reply, suggestions, intent });

  } catch (error) {
    console.error("Assistant API Error:", error);
    return res.json({
      reply: "I couldn't fetch that data right now. Please check the dashboard directly.",
      suggestions: ["How to place an order?", "How to track a delivery?", "Report a problem"],
      intent: 'ERROR'
    });
  }
}

// Support conversational chat powered by Gemini (formerly handled by assistant.js)
async function handleGeneralChat(req, res) {
  const { messages, role, currentPage } = req.body;
  const lastUserMessage = messages[messages.length - 1].content.toLowerCase();

  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'model') {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
  }

  const modelCandidates = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash'];
  const contextInstruction = `\n\nUSER CONTEXT:
- Role: ${role || 'Customer'}
- Current Dashboard Page: ${currentPage || 'Unknown'}`;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let lastError = null;

  for (const candidate of modelCandidates) {
    let delay = 1000;
    const attempts = 2;
    let success = false;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        console.log(`Attempting conversation fallback with model: ${candidate} (attempt ${attempt + 1})`);
        const result = await ai.models.generateContent({
          model: candidate,
          contents: contents,
          config: {
            systemInstruction: SYSTEM_PROMPT + contextInstruction,
          }
        });
        
        const fullResponse = result.text;
        return res.json({
          reply: fullResponse,
          suggestions: ["How to place order", "How to track order", "Quotations help"],
          intent: 'GENERAL'
        });
      } catch (err) {
        lastError = err;
        console.warn(`Attempt ${attempt + 1} failed for conversational model ${candidate}:`, err);
        if (attempt < attempts - 1) {
          await sleep(delay);
          delay *= 2;
        }
      }
    }
    if (success) return;
  }
  
  throw lastError || new Error("All general conversational model candidates failed.");
}
