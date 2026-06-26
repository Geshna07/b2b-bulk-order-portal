import express from 'express';
import { db } from '../utils/firebaseAdmin.js';
import { verifyCustomer } from '../middleware/verifyCustomer.js';
import { createNotification, notifyAdmins } from '../utils/notifications.js';

const router = express.Router();

// Apply customer protection middleware to all customer endpoints
router.use(verifyCustomer);

// GET /customer/products - Get all active products
router.get('/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products')
      .where('isActive', '==', true)
      .get();

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

// GET /customer/orders/:customerId - Get all orders for a specific customer
router.get('/orders/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Security check: Only allow the customer to fetch their own orders (unless override check is needed)
    if (req.uid !== customerId) {
      return res.status(403).json({ error: 'Forbidden: You cannot access other customer orders' });
    }

    const snapshot = await db.collection('orders')
      .where('customerId', '==', customerId)
      .get();

    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt descending
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    return res.json(orders);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return res.status(500).json({ error: 'Failed to fetch customer orders', details: error.message });
  }
});

// GET /customer/order/:orderId - Get detailed view of an order
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    // Security check: Ensure this order belongs to the requester
    if (orderData.customerId !== req.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this order' });
    }

    return res.json({ id: orderDoc.id, ...orderData });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({ error: 'Failed to fetch order details', details: error.message });
  }
});

// POST /customer/order - Submit a new bulk order
router.post('/order', async (req, res) => {
  try {
    const { items, deliveryAddress, notes, requestedDeliveryDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Bad Request: No items specified in order' });
    }

    // 1. Validate each product and its minimum quantity limit
    const orderItems = [];
    let orderSubtotal = 0;

    for (const item of items) {
      const { productId, qty } = item;
      if (!productId || !qty || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity or product for item: ${JSON.stringify(item)}` });
      }

      // Fetch product detail from Firestore
      const productDoc = await db.collection('products').doc(productId).get();
      if (!productDoc.exists) {
        return res.status(404).json({ error: `Product not found: ${productId}` });
      }

      const prodData = productDoc.data();
      const minQty = prodData.minOrderQty || 1;
      if (qty < minQty) {
        return res.status(400).json({
          error: `Minimum quantity validation failed for ${prodData.name}. Required: ${minQty}, Ordered: ${qty}`
        });
      }

      const itemTotal = Number(prodData.pricePerUnit || 0) * qty;
      orderSubtotal += itemTotal;

      orderItems.push({
        productId,
        productName: prodData.name,
        qty: Number(qty),
        unit: prodData.unit || 'Units',
        pricePerUnit: Number(prodData.pricePerUnit || 0),
        totalPrice: itemTotal
      });
    }

    // Calculate totals (including 18% GST standard)
    const gstRate = 0.18;
    const gstAmount = Math.round(orderSubtotal * gstRate);
    const orderTotal = orderSubtotal + gstAmount;

    // Generate Unique Order ID
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderId = `GMX-ORD-${randomSuffix}`;

    // Create order document
    const newOrder = {
      orderId,
      customerId: req.uid,
      customerName: req.user.name || 'B2B Client',
      institutionName: req.user.institutionName || 'Ganga Maxx Partner',
      items: orderItems,
      subtotal: orderSubtotal,
      gstAmount: gstAmount,
      orderTotal: orderTotal,
      total: orderTotal, // duplicate as expected by some layouts
      status: 'pending',
      paymentStatus: 'pending',
      assignedSalesman: req.user.assignedSalesman || 'Admin Master',
      deliveryAddress: deliveryAddress || req.user.address || {
        street: 'Ganga Maxx HQ',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301'
      },
      notes: notes || '',
      requestedDeliveryDate: requestedDeliveryDate || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [
        {
          status: 'pending',
          updatedBy: req.user.name || 'B2B Client',
          timestamp: new Date().toISOString(),
          note: 'Bulk order submitted online via portal.'
        }
      ]
    };

    // Save order in Firestore
    await db.collection('orders').doc(orderId).set(newOrder);

    // Notify Customer & Admin
    await createNotification(req.uid, 'Order Placed', `Your order ${orderId} has been successfully placed and is pending approval.`, 'success');
    await notifyAdmins('New Order Received', `A new order ${orderId} has been placed by ${req.user.name || 'a customer'}.`, 'info');

    // Retrieve Admin Phone Number (fallback if not specified)
    const adminPhone = '9999999999';

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId,
      orderTotal,
      adminPhone,
      order: newOrder
    });
  } catch (error) {
    console.error('Error placing bulk order:', error);
    return res.status(500).json({ error: 'Failed to submit order', details: error.message });
  }
});

// POST /customer/quotation - Submit a new quotation request
router.post('/quotation', async (req, res) => {
  try {
    const { items, deliveryAddress, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Bad Request: No items specified for quotation' });
    }

    const qtnItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { productId, qty } = item;
      if (!productId || !qty || qty <= 0) {
        continue;
      }

      const productDoc = await db.collection('products').doc(productId).get();
      if (!productDoc.exists) {
        continue;
      }

      const prodData = productDoc.data();
      const itemTotal = Number(prodData.pricePerUnit || 0) * qty;
      subtotal += itemTotal;

      qtnItems.push({
        productId,
        productName: prodData.name,
        qty: Number(qty),
        unit: prodData.unit || 'Units',
        pricePerUnit: Number(prodData.pricePerUnit || 0),
        totalPrice: itemTotal
      });
    }

    if (qtnItems.length === 0) {
      return res.status(400).json({ error: 'No valid products or quantities added' });
    }

    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const quotationId = `GMX-QTN-${randomSuffix}`;

    const newQuotation = {
      quotationId,
      customerId: req.uid,
      customerName: req.user.name || 'B2B Client',
      institutionName: req.user.institutionName || 'Ganga Maxx Partner',
      items: qtnItems,
      subtotal: subtotal,
      total: subtotal,
      status: 'sent', // draft/sent/accepted/rejected
      notes: notes || '',
      deliveryAddress: deliveryAddress || req.user.address || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('quotations').doc(quotationId).set(newQuotation);

    // Notify Customer & Admin
    await createNotification(req.uid, 'Quotation Request Sent', `Your quotation request ${quotationId} has been sent to our sales team.`, 'info');
    await notifyAdmins('New Quotation Request', `A new quotation request ${quotationId} has been received from ${req.user.name || 'a customer'}.`, 'info');

    return res.status(201).json({
      success: true,
      message: 'Quotation request submitted successfully',
      quotationId,
      quotation: newQuotation
    });
  } catch (error) {
    console.error('Error placing quotation request:', error);
    return res.status(500).json({ error: 'Failed to submit quotation request', details: error.message });
  }
});

// PUT /customer/update-profile
router.put('/update-profile', async (req, res) => {
  try {
    const uid = req.uid;
    const { name, whatsappNumber, phone, email, password } = req.body;
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const updatePayload = {
      updatedAt: new Date().toISOString()
    };
    
    if (name) updatePayload.name = name;
    if (whatsappNumber) updatePayload.whatsappNumber = whatsappNumber;
    if (phone) updatePayload.phone = phone;
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    
    await userRef.update(updatePayload);
    
    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

export default router;
