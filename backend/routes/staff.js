import express from 'express';
import { db } from '../utils/firebaseAdmin.js';
import { verifyStaff } from '../middleware/verifyStaff.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// Apply general staff verification to all routes in this router
router.use(verifyStaff());

// ==========================================
// COMMON ENDPOINTS
// ==========================================

// GET /staff/me - Return current staff profile
router.get('/me', async (req, res) => {
  return res.json({ user: req.user, uid: req.uid });
});

// GET /staff/customers - Get list of active customers
router.get('/customers', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'customer')
      .get();

    const customers = [];
    snapshot.forEach(doc => {
      customers.push({ id: doc.id, ...doc.data() });
    });

    return res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// GET /staff/products - Get all active products
router.get('/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

// ==========================================
// SALES ADMIN ENDPOINTS (DASHBOARD 1)
// ==========================================

// GET /staff/stats - Overview metrics for Sales Admin
router.get('/stats', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. New Orders Today
    const ordersSnapshot = await db.collection('orders').get();
    let newOrdersToday = 0;
    let pendingApprovals = 0;
    let revenueThisMonth = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      const createdAtDate = new Date(data.createdAt);
      
      // Compare dates
      if (createdAtDate.toISOString().split('T')[0] === todayStr) {
        newOrdersToday++;
      }
      
      if (data.status === 'pending') {
        pendingApprovals++;
      }

      if (data.status === 'approved' || data.status === 'packed' || data.status === 'dispatched' || data.status === 'delivered') {
        if (createdAtDate.getMonth() === currentMonth && createdAtDate.getFullYear() === currentYear) {
          revenueThisMonth += Number(data.orderTotal || data.total || 0);
        }
      }
    });

    // 2. Active Quotations
    const quotationsSnapshot = await db.collection('quotations')
      .where('status', '==', 'sent')
      .get();
    const activeQuotations = quotationsSnapshot.size;

    return res.json({
      newOrdersToday,
      pendingApprovals,
      activeQuotations,
      revenueThisMonth
    });
  } catch (error) {
    console.error('Error getting staff stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve stats', details: error.message });
  }
});

// GET /staff/orders - Get all orders with optional status filters
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('orders');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const orders = [];
    
    for (const doc of snapshot) {
      const orderData = doc.data();
      
      // Fetch customer phone number from users collection for WhatsApp links
      let customerPhone = '+919999999999';
      if (orderData.customerId) {
        const userDoc = await db.collection('users').doc(orderData.customerId).get();
        if (userDoc.exists) {
          customerPhone = userDoc.data().phone || userDoc.data().whatsappNumber || customerPhone;
        }
      }
      
      orders.push({
        id: doc.id,
        ...orderData,
        customerPhone: customerPhone.replace(/[^0-9+]/g, '') // sanitize
      });
    }

    // Sort by newest first
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json(orders);
  } catch (error) {
    console.error('Error fetching orders for staff:', error);
    return res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});

// PUT /staff/orders/:orderId/approve - Approve an order
router.put('/orders/:orderId/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    
    // Get customer phone for WhatsApp notification
    let customerPhone = '+919999999999';
    if (orderData.customerId) {
      const userDoc = await db.collection('users').doc(orderData.customerId).get();
      if (userDoc.exists) {
        customerPhone = userDoc.data().phone || userDoc.data().whatsappNumber || customerPhone;
      }
    }

    const historyEntry = {
      status: 'approved',
      updatedBy: req.user.name || 'Sales Admin',
      timestamp: new Date().toISOString(),
      note: 'Order approved by Sales Administrator.'
    };

    const updatedHistory = orderData.statusHistory || [];
    updatedHistory.push(historyEntry);

    await orderRef.update({
      status: 'approved',
      updatedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    // Notify Customer
    if (orderData.customerId) {
      await createNotification(orderData.customerId, 'Order Approved', `Your order ${orderId} has been approved and moved to packing.`, 'success');
    }

    return res.json({
      success: true,
      message: 'Order approved successfully',
      orderId,
      customerPhone: customerPhone.replace(/[^0-9+]/g, '')
    });
  } catch (error) {
    console.error('Error approving order:', error);
    return res.status(500).json({ error: 'Failed to approve order', details: error.message });
  }
});

// PUT /staff/orders/:orderId/reject - Reject an order
router.put('/orders/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    const historyEntry = {
      status: 'rejected',
      updatedBy: req.user.name || 'Sales Admin',
      timestamp: new Date().toISOString(),
      note: reason ? `Rejected: ${reason}` : 'Order rejected by Sales Administrator.'
    };

    const updatedHistory = orderData.statusHistory || [];
    updatedHistory.push(historyEntry);

    await orderRef.update({
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    // Notify Customer
    if (orderData.customerId) {
      await createNotification(orderData.customerId, 'Order Rejected', `Your order ${orderId} was rejected. Reason: ${reason || 'Not specified'}.`, 'error');
    }

    return res.json({
      success: true,
      message: 'Order rejected successfully',
      orderId
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    return res.status(500).json({ error: 'Failed to reject order', details: error.message });
  }
});

// GET /staff/contract-pricing - Get all contract prices
router.get('/contract-pricing', async (req, res) => {
  try {
    const snapshot = await db.collection('contractPricing').get();
    const pricing = [];
    snapshot.forEach(doc => {
      pricing.push({ id: doc.id, ...doc.data() });
    });
    return res.json(pricing);
  } catch (error) {
    console.error('Error fetching contract pricing:', error);
    return res.status(500).json({ error: 'Failed to fetch contract pricing', details: error.message });
  }
});

// POST /staff/contract-pricing - Add or edit contract pricing
router.post('/contract-pricing', async (req, res) => {
  try {
    const { customerId, customerName, productId, productName, contractPrice } = req.body;

    if (!customerId || !productId || contractPrice === undefined) {
      return res.status(400).json({ error: 'Missing required fields: customerId, productId, contractPrice' });
    }

    const docId = `${customerId}_${productId}`;
    const pricingData = {
      customerId,
      customerName: customerName || 'B2B Customer',
      productId,
      productName: productName || 'Product',
      contractPrice: Number(contractPrice),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name || 'Staff'
    };

    await db.collection('contractPricing').doc(docId).set(pricingData, { merge: true });

    return res.json({
      success: true,
      message: 'Contract pricing updated successfully',
      id: docId,
      pricing: pricingData
    });
  } catch (error) {
    console.error('Error setting contract pricing:', error);
    return res.status(500).json({ error: 'Failed to save contract pricing', details: error.message });
  }
});

// ==========================================
// WAREHOUSE STAFF ENDPOINTS (DASHBOARD 2)
// ==========================================

// GET /staff/warehouse/stats - Warehouse metrics
router.get('/warehouse/stats', async (req, res) => {
  try {
    // 1. Items to pack today (approved orders)
    const ordersSnapshot = await db.collection('orders')
      .where('status', '==', 'approved')
      .get();
    const itemsToPackToday = ordersSnapshot.size;

    // 2. Inventory and SKUs
    const inventorySnapshot = await db.collection('inventory').get();
    let lowStockAlerts = 0;
    const totalSKUs = inventorySnapshot.size;

    inventorySnapshot.forEach(doc => {
      const data = doc.data();
      const currentStock = Number(data.currentStock || 0);
      const reorderLevel = Number(data.reorderLevel || 0);
      if (currentStock <= reorderLevel) {
        lowStockAlerts++;
      }
    });

    // 3. Pending Deliveries
    const deliveriesSnapshot = await db.collection('deliveries').get();
    let pendingDeliveries = 0;
    deliveriesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'delivered' && data.status !== 'failed') {
        pendingDeliveries++;
      }
    });

    return res.json({
      itemsToPackToday,
      lowStockAlerts,
      totalSKUs,
      pendingDeliveries
    });
  } catch (error) {
    console.error('Error getting warehouse stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve stats', details: error.message });
  }
});

// GET /staff/inventory - Get all inventory with product details
router.get('/inventory', async (req, res) => {
  try {
    const snapshot = await db.collection('inventory').get();
    const inventory = [];
    snapshot.forEach(doc => {
      inventory.push({ id: doc.id, ...doc.data() });
    });
    return res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
  }
});

// POST /staff/inventory/:inventoryId/stock - Update stock level manually
router.post('/inventory/:inventoryId/stock', async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { currentStock } = req.body;

    if (currentStock === undefined || isNaN(currentStock)) {
      return res.status(400).json({ error: 'Invalid currentStock level' });
    }

    const invRef = db.collection('inventory').doc(inventoryId);
    const invDoc = await invRef.get();

    if (!invDoc.exists) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    const data = invDoc.data();

    await invRef.update({
      currentStock: Number(currentStock),
      lastUpdated: new Date().toISOString(),
      updatedBy: req.user.name || 'Warehouse Staff'
    });

    // Also update main products stock
    if (data.productId) {
      await db.collection('products').doc(data.productId).update({
        stock: Number(currentStock)
      }).catch(e => console.warn('Could not update stock on product document:', e.message));
    }

    return res.json({
      success: true,
      message: 'Stock updated successfully',
      inventoryId,
      currentStock: Number(currentStock)
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return res.status(500).json({ error: 'Failed to update stock', details: error.message });
  }
});

// PUT /staff/orders/:orderId/pack - Pack order and reduce inventory
router.put('/orders/:orderId/pack', async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();
    if (orderData.status !== 'approved') {
      return res.status(400).json({ error: `Order is in status: ${orderData.status}. Can only pack approved orders.` });
    }

    // Reduce inventory for each item
    const items = orderData.items || [];
    for (const item of items) {
      const { productId, qty } = item;
      
      // Look for inventory record matching this product
      const invQuery = await db.collection('inventory')
        .where('productId', '==', productId)
        .limit(1)
        .get();

      if (!invQuery.empty) {
        const invDoc = invQuery.docs[0];
        const invRef = db.collection('inventory').doc(invDoc.id);
        const invData = invDoc.data();
        const newStock = Math.max(0, Number(invData.currentStock || 0) - Number(qty));

        await invRef.update({
          currentStock: newStock,
          lastUpdated: new Date().toISOString(),
          updatedBy: req.user.name || 'Warehouse Staff'
        });

        // Also update products collection
        await db.collection('products').doc(productId).update({
          stock: newStock
        }).catch(e => console.warn('Failed to update product stock:', e.message));
      }
    }

    const historyEntry = {
      status: 'packed',
      updatedBy: req.user.name || 'Warehouse Staff',
      timestamp: new Date().toISOString(),
      note: 'Order packed and inventory allocated.'
    };

    const updatedHistory = orderData.statusHistory || [];
    updatedHistory.push(historyEntry);

    await orderRef.update({
      status: 'packed',
      updatedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    // Notify Customer
    if (orderData.customerId) {
      await createNotification(orderData.customerId, 'Order Packed', `Your order ${orderId} has been packed and is ready for dispatch.`, 'info');
    }

    return res.json({
      success: true,
      message: 'Order marked as Packed successfully. Stock levels updated.',
      orderId
    });
  } catch (error) {
    console.error('Error packing order:', error);
    return res.status(500).json({ error: 'Failed to pack order', details: error.message });
  }
});

// ==========================================
// SALESMAN ENDPOINTS (DASHBOARD 3)
// ==========================================

// GET /staff/visits - Get visit logs
router.get('/visits', async (req, res) => {
  try {
    const snapshot = await db.collection('visits').get();
    const visits = [];
    snapshot.forEach(doc => {
      visits.push({ id: doc.id, ...doc.data() });
    });
    // Sort newest first
    visits.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    return res.json(visits);
  } catch (error) {
    console.error('Error fetching visits:', error);
    return res.status(500).json({ error: 'Failed to fetch visits', details: error.message });
  }
});

// POST /staff/visits - Log a new visit
router.post('/visits', async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      institutionName,
      visitDate,
      contactPerson,
      discussionNotes,
      followUpDate,
      outcome
    } = req.body;

    if (!customerName || !visitDate || !contactPerson || !outcome) {
      return res.status(400).json({ error: 'Missing required visit log fields' });
    }

    const randomId = `visit_${Math.floor(100000 + Math.random() * 900000)}`;
    const visitData = {
      visitId: randomId,
      customerId: customerId || '',
      customerName,
      institutionName: institutionName || 'Independent',
      visitDate,
      contactPerson,
      discussionNotes: discussionNotes || '',
      followUpDate: followUpDate || '',
      outcome,
      loggedBy: req.user.name || 'Salesman',
      salesmanId: req.uid,
      createdAt: new Date().toISOString()
    };

    await db.collection('visits').doc(randomId).set(visitData);

    return res.status(201).json({
      success: true,
      message: 'Visit logged successfully',
      visitId: randomId,
      visit: visitData
    });
  } catch (error) {
    console.error('Error logging visit:', error);
    return res.status(500).json({ error: 'Failed to log visit', details: error.message });
  }
});

// GET /staff/reorder-reminders - Find customers requiring reorder
router.get('/reorder-reminders', async (req, res) => {
  try {
    // Fetch all customers
    const custSnapshot = await db.collection('users')
      .where('role', '==', 'customer')
      .get();

    const reminders = [];
    const today = new Date();

    for (const custDoc of custSnapshot) {
      const customer = custDoc.data();
      const customerId = custDoc.id;

      // Find last order for this customer
      const ordersSnapshot = await db.collection('orders')
        .where('customerId', '==', customerId)
        .get();

      let lastOrderDate = null;
      let lastOrderId = null;

      ordersSnapshot.forEach(orderDoc => {
        const order = orderDoc.data();
        const oDate = new Date(order.createdAt);
        if (!lastOrderDate || oDate > lastOrderDate) {
          lastOrderDate = oDate;
          lastOrderId = order.orderId;
        }
      });

      let daysSinceLastOrder = null;
      let status = 'Never Ordered';

      if (lastOrderDate) {
        const diffTime = Math.abs(today - lastOrderDate);
        daysSinceLastOrder = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        status = daysSinceLastOrder > 30 ? 'Overdue for Reorder' : 'Active';
      }

      // Add to reminders if overdue or never ordered
      if (!lastOrderDate || (daysSinceLastOrder && daysSinceLastOrder >= 30)) {
        reminders.push({
          customerId,
          customerName: customer.name || 'Unnamed Client',
          institutionName: customer.institutionName || 'Hospital/Clinic',
          phone: customer.phone || customer.whatsappNumber || '',
          lastOrderDate: lastOrderDate ? lastOrderDate.toISOString().split('T')[0] : 'N/A',
          lastOrderId: lastOrderId || 'N/A',
          daysSinceLastOrder: daysSinceLastOrder !== null ? daysSinceLastOrder : 'Never',
          status
        });
      }
    }

    return res.json(reminders);
  } catch (error) {
    console.error('Error getting reorder reminders:', error);
    return res.status(500).json({ error: 'Failed to build reorder reminders', details: error.message });
  }
});

// POST /staff/quotations - Create/Submit direct quotation
router.post('/quotations', async (req, res) => {
  try {
    const { customerId, customerName, items, totalAmount, validUntil } = req.body;

    if (!customerId || !customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing customer or products for quotation' });
    }

    const randomId = `GMX-QUO-${Math.floor(1000 + Math.random() * 9000)}`;
    const quoteData = {
      quotationId: randomId,
      customerId,
      customerName,
      items,
      totalAmount: Number(totalAmount || 0),
      validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 days standard
      status: 'sent',
      createdBy: req.user.name || 'Salesman',
      salesmanId: req.uid,
      createdAt: new Date().toISOString()
    };

    await db.collection('quotations').doc(randomId).set(quoteData);

    return res.status(201).json({
      success: true,
      message: 'Quotation generated and saved successfully',
      quotationId: randomId,
      quotation: quoteData
    });
  } catch (error) {
    console.error('Error generating quotation:', error);
    return res.status(500).json({ error: 'Failed to generate quotation', details: error.message });
  }
});

// ==========================================
// DELIVERY COORDINATOR ENDPOINTS (DASHBOARD 4)
// ==========================================

// GET /staff/deliveries - Get all delivery schedules
router.get('/deliveries', async (req, res) => {
  try {
    const snapshot = await db.collection('deliveries').get();
    const deliveries = [];
    
    for (const doc of snapshot) {
      const deliveryData = doc.data();
      
      // Look up corresponding order details for customer info
      let customerName = 'B2B Client';
      let institutionName = 'Ganga Maxx Partner';
      let deliveryAddress = {};
      let orderTotal = 0;
      let customerPhone = '+919999999999';

      if (deliveryData.orderId) {
        const orderDoc = await db.collection('orders').doc(deliveryData.orderId).get();
        if (orderDoc.exists) {
          const order = orderDoc.data();
          customerName = order.customerName || customerName;
          institutionName = order.institutionName || institutionName;
          deliveryAddress = order.deliveryAddress || deliveryAddress;
          orderTotal = order.orderTotal || order.total || orderTotal;

          if (order.customerId) {
            const userDoc = await db.collection('users').doc(order.customerId).get();
            if (userDoc.exists) {
              customerPhone = userDoc.data().phone || userDoc.data().whatsappNumber || customerPhone;
            }
          }
        }
      }

      deliveries.push({
        id: doc.id,
        ...deliveryData,
        customerName,
        institutionName,
        deliveryAddress,
        orderTotal,
        customerPhone: customerPhone.replace(/[^0-9+]/g, '')
      });
    }

    return res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});

// GET /staff/fleet - Get all fleet members
router.get('/fleet', async (req, res) => {
  try {
    const snapshot = await db.collection('fleet').get();
    const fleet = [];
    snapshot.forEach(doc => {
      fleet.push({ id: doc.id, ...doc.data() });
    });
    return res.json(fleet);
  } catch (error) {
    console.error('Error fetching fleet:', error);
    return res.status(500).json({ error: 'Failed to fetch fleet', details: error.message });
  }
});

// POST /staff/fleet - Add new fleet member (Logistics Provider)
router.post('/fleet', async (req, res) => {
  try {
    const { driverName, vehicleNumber, route, capacity } = req.body;
    
    if (!driverName || !vehicleNumber) {
      return res.status(400).json({ error: 'Driver name and vehicle number are required' });
    }
    
    const fleetId = `fleet_${Date.now()}`;
    const fleetData = {
      driverName,
      vehicleNumber,
      route: route || 'General Distribution',
      capacity: capacity || '100%',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    await db.collection('fleet').doc(fleetId).set(fleetData);
    
    return res.status(201).json({ success: true, message: 'Fleet member added successfully', id: fleetId, fleet: fleetData });
  } catch (error) {
    console.error('Error adding fleet member:', error);
    return res.status(500).json({ error: 'Failed to add fleet member', details: error.message });
  }
});

// POST /staff/deliveries - Dispatch/schedule a packed order
router.post('/deliveries', async (req, res) => {
  try {
    const { orderId, driverName, vehicleNumber, estimatedDate } = req.body;

    if (!orderId || !driverName || !vehicleNumber || !estimatedDate) {
      return res.status(400).json({ error: 'Missing driver, vehicle or estimated date' });
    }

    // Check if delivery already scheduled
    const existingSnap = await db.collection('deliveries')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return res.status(400).json({ error: `Delivery is already scheduled for order ${orderId}` });
    }

    // Verify order is packed
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Create delivery entry
    const randomId = `GMX-DEL-${Math.floor(1000 + Math.random() * 9000)}`;
    const deliveryData = {
      deliveryId: randomId,
      orderId,
      assignedCoordinator: req.user.name || 'Rahul Dravid',
      vehicleNumber,
      driverName,
      estimatedDate,
      actualDate: null,
      status: 'scheduled',
      trackingNotes: [
        'Logistics dispatch order created.',
        `Assigned driver ${driverName} with vehicle ${vehicleNumber}.`
      ],
      createdAt: new Date().toISOString()
    };

    await db.collection('deliveries').doc(randomId).set(deliveryData);

    // Update order status to dispatched
    const historyEntry = {
      status: 'dispatched',
      updatedBy: req.user.name || 'Logistics Coordinator',
      timestamp: new Date().toISOString(),
      note: `Scheduled for dispatch on ${estimatedDate} via ${driverName} (${vehicleNumber}).`
    };

    const updatedHistory = orderData.statusHistory || [];
    updatedHistory.push(historyEntry);

    await orderRef.update({
      status: 'dispatched',
      updatedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    });

    // Notify Customer
    if (orderData.customerId) {
      await createNotification(orderData.customerId, 'Order Dispatched', `Your order ${orderId} has been dispatched via ${driverName}.`, 'info');
    }

    return res.status(201).json({
      success: true,
      message: 'Delivery scheduled and order dispatched successfully',
      deliveryId: randomId,
      delivery: deliveryData
    });
  } catch (error) {
    console.error('Error scheduling delivery:', error);
    return res.status(500).json({ error: 'Failed to schedule delivery', details: error.message });
  }
});

// PUT /staff/deliveries/:deliveryId/status - Update delivery status
router.put('/deliveries/:deliveryId/status', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status, note } = req.body; // status: 'in_transit' | 'delivered' | 'failed'

    if (!status) {
      return res.status(400).json({ error: 'Delivery status is required' });
    }

    const delRef = db.collection('deliveries').doc(deliveryId);
    const delDoc = await delRef.get();

    if (!delDoc.exists) {
      return res.status(404).json({ error: 'Delivery record not found' });
    }

    const delData = delDoc.data();
    const orderId = delData.orderId;

    const trackingNotes = delData.trackingNotes || [];
    const timestampStr = new Date().toISOString();
    trackingNotes.push(`Status updated to ${status}. Note: ${note || 'N/A'} at ${timestampStr}`);

    const updateFields = {
      status,
      trackingNotes,
      updatedAt: timestampStr
    };

    if (status === 'delivered') {
      updateFields.actualDate = timestampStr;
    }

    await delRef.update(updateFields);

    // Also update order status
    if (orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        let mappedOrderStatus = 'dispatched';
        
        if (status === 'delivered') mappedOrderStatus = 'delivered';
        if (status === 'failed') mappedOrderStatus = 'failed';

        const historyEntry = {
          status: mappedOrderStatus,
          updatedBy: req.user.name || 'Logistics Staff',
          timestamp: timestampStr,
          note: `Delivery status: ${status}. Comment: ${note || 'None'}`
        };

        const updatedHistory = orderData.statusHistory || [];
        updatedHistory.push(historyEntry);

        const orderUpdates = {
          status: mappedOrderStatus,
          updatedAt: timestampStr,
          statusHistory: updatedHistory
        };

        if (status === 'delivered') {
          orderUpdates.paymentStatus = 'paid'; // simplify B2B fulfillment
        }

        await orderRef.update(orderUpdates);
      }
    }

    // Notify Customer of delivery status
    try {
      const targetUid = delData.customerId || (orderId && await db.collection('orders').doc(orderId).get().then(d => d.data()?.customerId));
      if (targetUid) {
        await createNotification(targetUid, `Delivery ${status === 'delivered' ? 'Completed' : 'Update'}`, `Your delivery status for order ${orderId} is now: ${status.toUpperCase()}.`, status === 'delivered' ? 'success' : 'info');
      }
    } catch (nErr) {
      console.warn("Could not send delivery notification:", nErr.message);
    }

    return res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      deliveryId
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    return res.status(500).json({ error: 'Failed to update delivery status', details: error.message });
  }
});

// ==========================================
// ACCOUNTS MANAGER ENDPOINTS (DASHBOARD 5)
// ==========================================

// GET /staff/credit-accounts - Get all credit/aging information
router.get('/credit-accounts', async (req, res) => {
  try {
    const snapshot = await db.collection('creditAccounts').get();
    const accounts = [];
    snapshot.forEach(doc => {
      accounts.push({ id: doc.id, ...doc.data() });
    });
    return res.json(accounts);
  } catch (error) {
    console.error('Error fetching credit accounts:', error);
    return res.status(500).json({ error: 'Failed to fetch credit accounts', details: error.message });
  }
});

// PUT /staff/credit-accounts/:creditId - Edit credit terms
router.put('/credit-accounts/:creditId', async (req, res) => {
  try {
    const { creditId } = req.params;
    const { creditLimit, paymentTermDays, status } = req.body;

    const credRef = db.collection('creditAccounts').doc(creditId);
    const credDoc = await credRef.get();

    if (!credDoc.exists) {
      return res.status(404).json({ error: 'Credit account not found' });
    }

    const currentData = credDoc.data();
    const updatePayload = {};

    if (creditLimit !== undefined) {
      updatePayload.creditLimit = Number(creditLimit);
      // recalculate balance
      const usedCredit = Number(currentData.usedCredit || 0);
      updatePayload.balance = Math.max(0, Number(creditLimit) - usedCredit);
    }

    if (paymentTermDays !== undefined) {
      updatePayload.paymentTermDays = Number(paymentTermDays);
    }

    if (status !== undefined) {
      updatePayload.status = status;
    }

    await credRef.update(updatePayload);

    return res.json({
      success: true,
      message: 'Credit parameters updated successfully',
      creditId
    });
  } catch (error) {
    console.error('Error editing credit account:', error);
    return res.status(500).json({ error: 'Failed to edit credit account', details: error.message });
  }
});

// POST /staff/payments - Record a payment from customer
router.post('/payments', async (req, res) => {
  try {
    const { creditId, customerId, amount, date, referenceNumber } = req.body;

    if (!creditId || !amount || !referenceNumber) {
      return res.status(400).json({ error: 'Missing credit ID, amount or payment reference' });
    }

    const credRef = db.collection('creditAccounts').doc(creditId);
    const credDoc = await credRef.get();

    if (!credDoc.exists) {
      return res.status(404).json({ error: 'Credit account not found' });
    }

    const currentData = credDoc.data();
    const currentUsed = Number(currentData.usedCredit || 0);
    const limit = Number(currentData.creditLimit || 0);
    const payAmt = Number(amount);

    // Deduct used credit, increment balance
    const newUsedCredit = Math.max(0, currentUsed - payAmt);
    const newBalance = Math.max(0, limit - newUsedCredit);

    // Update aging bucket roughly
    const buckets = currentData.agingBuckets || { current: 0, days30: 0, days60: 0, days90plus: 0 };
    let remainingPaid = payAmt;

    // Apply payment to oldest first
    const updatedBuckets = { ...buckets };
    const keys = ['days90plus', 'days60', 'days30', 'current'];
    for (const key of keys) {
      if (remainingPaid <= 0) break;
      const currentVal = Number(updatedBuckets[key] || 0);
      if (currentVal > 0) {
        const deduct = Math.min(currentVal, remainingPaid);
        updatedBuckets[key] = Math.max(0, currentVal - deduct);
        remainingPaid -= deduct;
      }
    }

    await credRef.update({
      usedCredit: newUsedCredit,
      balance: newBalance,
      agingBuckets: updatedBuckets,
      lastPaymentDate: date || new Date().toISOString().split('T')[0]
    });

    // Record transaction
    const payId = `pay_${Date.now()}`;
    await db.collection('payments').doc(payId).set({
      paymentId: payId,
      creditId,
      customerId: customerId || currentData.customerId || '',
      customerName: currentData.customerName || 'B2B Client',
      amount: payAmt,
      date: date || new Date().toISOString().split('T')[0],
      referenceNumber,
      recordedBy: req.user.name || 'Accounts Staff',
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded and credit lines updated successfully.',
      newUsedCredit,
      newBalance
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ error: 'Failed to record payment', details: error.message });
  }
});

// GET /staff/payments - Retrieve payment log
router.get('/payments', async (req, res) => {
  try {
    const snapshot = await db.collection('payments').get();
    const payments = [];
    snapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(payments);
  } catch (error) {
    console.error('Error retrieving payment ledger:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment records', details: error.message });
  }
});

// ==========================================
// COMPLIANCE ADMIN ENDPOINTS (DASHBOARD 6)
// ==========================================

// GET /staff/compliance - Get all compliance records
router.get('/compliance', async (req, res) => {
  try {
    const snapshot = await db.collection('complianceRecords').get();
    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    return res.json(records);
  } catch (error) {
    console.error('Error fetching compliance records:', error);
    return res.status(500).json({ error: 'Failed to fetch compliance list', details: error.message });
  }
});

// POST /staff/compliance - Upload/Review/Edit compliance guidelines
router.post('/compliance', async (req, res) => {
  try {
    const { complianceId, productId, productName, msdsDocumentUrl, chemicalHandlingNotes, status } = req.body;

    if (!productId || !productName) {
      return res.status(400).json({ error: 'Product ID and name are required' });
    }

    const docId = complianceId || `comp_${productId}`;
    const payload = {
      complianceId: docId,
      productId,
      productName,
      msdsDocumentUrl: msdsDocumentUrl || '',
      chemicalHandlingNotes: chemicalHandlingNotes || 'No special handling rules outlined.',
      lastReviewDate: new Date().toISOString().split('T')[0],
      reviewedBy: req.user.name || 'Compliance Officer',
      status: status || 'compliant',
      acknowledgements: []
    };

    // Keep existing acknowledgements if editing
    const existingDoc = await db.collection('complianceRecords').doc(docId).get();
    if (existingDoc.exists) {
      payload.acknowledgements = existingDoc.data().acknowledgements || [];
    }

    await db.collection('complianceRecords').doc(docId).set(payload, { merge: true });

    return res.json({
      success: true,
      message: 'Compliance record published/reviewed successfully',
      id: docId,
      compliance: payload
    });
  } catch (error) {
    console.error('Error updating compliance record:', error);
    return res.status(500).json({ error: 'Failed to save compliance updates', details: error.message });
  }
});

// GET /staff/compliance/staff-list - Get list of staff who must acknowledge MSDS
router.get('/compliance/staff-list', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'staff')
      .get();

    const staff = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      staff.push({
        uid: doc.id,
        name: data.name,
        subRole: data.subRole,
        phone: data.phone || data.whatsappNumber || ''
      });
    });

    return res.json(staff);
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return res.status(500).json({ error: 'Failed to retrieve staff ledger' });
  }
});

export default router;
