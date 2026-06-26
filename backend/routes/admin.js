import express from 'express';
import { db } from '../utils/firebaseAdmin.js';
import { verifyAdmin } from '../middleware/verifyAdmin.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();

// All routes are protected by verifyAdmin
router.use(verifyAdmin);

// GET /admin/pending-staff
router.get('/pending-staff', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'staff')
      .where('status', '==', 'pending')
      .get();
    
    const pendingStaff = [];
    snapshot.forEach(doc => {
      pendingStaff.push({ id: doc.id, ...doc.data() });
    });
    
    return res.json(pendingStaff);
  } catch (error) {
    console.error('Error fetching pending staff:', error);
    return res.status(500).json({ error: 'Failed to fetch pending staff', details: error.message });
  }
});

// POST /admin/approve-staff/:uid
router.post('/approve-staff/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await userRef.update({
      status: 'active',
      updatedAt: new Date()
    });

    // Notify the staff member
    await createNotification(uid, 'Account Approved', 'Your staff account has been approved by the administrator. You can now access your workspace.', 'success');
    
    return res.json({ success: true, message: 'Staff member approved successfully' });
  } catch (error) {
    console.error('Error approving staff:', error);
    return res.status(500).json({ error: 'Failed to approve staff', details: error.message });
  }
});

// POST /admin/reject-staff/:uid
router.post('/reject-staff/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body;
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await userRef.update({
      status: 'rejected',
      rejectionReason: reason || 'Access request rejected by admin',
      updatedAt: new Date()
    });

    // Notify the staff member
    await createNotification(uid, 'Account Rejected', `Your staff account request was rejected. Reason: ${reason || 'Access request rejected by admin'}`, 'error');
    
    return res.json({ success: true, message: 'Staff member rejected successfully' });
  } catch (error) {
    console.error('Error rejecting staff:', error);
    return res.status(500).json({ error: 'Failed to reject staff', details: error.message });
  }
});

// PUT /admin/update-user/:uid
router.put('/update-user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, password, name, phone, whatsappNumber, institutionName, status } = req.body;
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updatePayload = {
      updatedAt: new Date()
    };
    
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    if (name) updatePayload.name = name;
    if (phone) updatePayload.phone = phone;
    if (whatsappNumber) updatePayload.whatsappNumber = whatsappNumber;
    if (institutionName) updatePayload.institutionName = institutionName;
    if (status) updatePayload.status = status;
    
    await userRef.update(updatePayload);
    
    return res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// GET /admin/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    // 1. Total Customers
    const customersSnapshot = await db.collection('users')
      .where('role', '==', 'customer')
      .get();
    const totalCustomers = customersSnapshot.size;
    
    // 2. Pending Staff Requests
    const pendingStaffSnapshot = await db.collection('users')
      .where('role', '==', 'staff')
      .where('status', '==', 'pending')
      .get();
    const pendingStaff = pendingStaffSnapshot.size;
    
    // 3. Active Orders (status is not delivered or cancelled)
    // Firestore in-query support is standard, but to prevent crash on empty/unsupported, let's fetch and filter locally,
    // or run a simple query. Let's do a robust simple query or local filter to avoid composite index requirements!
    const ordersSnapshot = await db.collection('orders').get();
    let activeOrders = 0;
    let totalRevenue = 0;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'pending';
      const is_active = ['pending', 'approved', 'packed', 'dispatched'].includes(status);
      if (is_active) {
        activeOrders++;
      }
      
      // Calculate revenue
      if (status !== 'cancelled') {
        const orderDate = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null;
        if (orderDate && orderDate >= startOfMonth) {
          totalRevenue += Number(data.total || 0);
        }
      }
    });
    
    // 4. Total Products
    const productsSnapshot = await db.collection('products').get();
    const totalProducts = productsSnapshot.size;
    
    // 5. Overdue Credit Accounts
    const overdueSnapshot = await db.collection('users')
      .where('role', '==', 'customer')
      .where('creditStatus', '==', 'overdue')
      .get();
    const overdueCreditAccounts = overdueSnapshot.size;
    
    return res.json({
      totalCustomers,
      pendingStaff,
      activeOrders,
      totalProducts,
      totalRevenue,
      overdueCreditAccounts
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
  }
});

export default router;
