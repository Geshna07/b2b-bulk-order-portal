/**
 * WhatsApp Notification Utility for Ganga Maxx
 */

async function logAndOpenWhatsApp(phone, message, trigger) {
  // Clean phone number (remove +, spaces, etc for wa.me link)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // If it doesn't start with a country code, you might want to default to something, 
  // but let's assume the user provided full numbers or we just pass it as is
  
  const text = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${text}`;
  
  // Try to find current user name for the log
  let openedBy = 'system';
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser && currentUser.name) {
      openedBy = currentUser.name;
    }
  } catch (e) {}

  // Log to backend
  try {
    await fetch('/whatsapp/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: phone,
        message,
        trigger,
        openedBy
      })
    });
  } catch (e) {
    console.error("Failed to log WhatsApp message:", e);
  }

  // Open WhatsApp in new tab
  window.open(url, '_blank');
}

window.whatsappUtils = {
  sendOTPWhatsApp: function(phone, otp) {
    const msg = `*Ganga Maxx Security*\n\nYour OTP for password reset is: *${otp}*\n\nPlease do not share this code with anyone.`;
    logAndOpenWhatsApp(phone, msg, 'OTP_RESET');
  },

  notifyOrderPlaced: function(adminPhone, orderId, institutionName, total) {
    const msg = `*New Order Alert - Ganga Maxx*\n\nOrder ID: ${orderId}\nInstitution: ${institutionName}\nTotal Value: AED ${total}\n\nPlease review this order in the Admin Dashboard.`;
    logAndOpenWhatsApp(adminPhone, msg, 'ORDER_PLACED');
  },

  notifyOrderApproved: function(customerPhone, orderId) {
    const msg = `*Ganga Maxx Order Update*\n\nGreat news! Your order *${orderId}* has been APPROVED by our team and is now being processed by the warehouse.\n\nThank you for choosing Ganga Maxx!`;
    logAndOpenWhatsApp(customerPhone, msg, 'ORDER_APPROVED');
  },

  notifyOrderPacked: function(customerPhone, orderId) {
    const msg = `*Ganga Maxx Order Update*\n\nYour order *${orderId}* has been PACKED and is ready for dispatch. We will notify you once it is on the way.`;
    logAndOpenWhatsApp(customerPhone, msg, 'ORDER_PACKED');
  },

  notifyOrderDispatched: function(customerPhone, orderId, driverName, vehicle) {
    const msg = `*Ganga Maxx Order Update*\n\nYour order *${orderId}* has been DISPATCHED!\n\nDriver: ${driverName}\nVehicle: ${vehicle}\n\nPlease be ready to receive your items.`;
    logAndOpenWhatsApp(customerPhone, msg, 'ORDER_DISPATCHED');
  },

  notifyOrderDelivered: function(customerPhone, orderId) {
    const msg = `*Ganga Maxx Order Update*\n\nYour order *${orderId}* has been successfully DELIVERED. \n\nThank you for your business!`;
    logAndOpenWhatsApp(customerPhone, msg, 'ORDER_DELIVERED');
  },

  notifyStaffApproved: function(staffPhone, name, loginUrl) {
    const msg = `*Welcome to Ganga Maxx*\n\nHello ${name},\nYour staff account has been APPROVED by the Admin. You can now log in to your dashboard here:\n${loginUrl}`;
    logAndOpenWhatsApp(staffPhone, msg, 'STAFF_APPROVED');
  },

  notifyStaffRejected: function(staffPhone, name, reason) {
    const msg = `*Ganga Maxx Update*\n\nHello ${name},\nUnfortunately, your staff account application was not approved. \nReason: ${reason}\n\nPlease contact administration for more details.`;
    logAndOpenWhatsApp(staffPhone, msg, 'STAFF_REJECTED');
  },

  sendReorderReminder: function(customerPhone, customerName, lastOrderDays) {
    const msg = `*Ganga Maxx Reminder*\n\nHello ${customerName},\nIt has been ${lastOrderDays} days since your last bulk order of cleaning supplies. \n\nWould you like to place a reorder or request a new quotation? We are happy to help!`;
    logAndOpenWhatsApp(customerPhone, msg, 'REORDER_REMINDER');
  },

  notifyPaymentDue: function(customerPhone, customerName, amount, dueDate) {
    const msg = `*Ganga Maxx Account Update*\n\nHello ${customerName},\nThis is a gentle reminder that a payment of *AED ${amount}* is due on *${dueDate}* for your credit account.\n\nPlease process the payment to maintain your credit standing.`;
    logAndOpenWhatsApp(customerPhone, msg, 'PAYMENT_DUE');
  },

  notifyComplianceAcknowledgement: function(staffPhone, productName) {
    const msg = `*Ganga Maxx Compliance Alert*\n\nUrgent: New safety documentation / MSDS has been updated for *${productName}*.\n\nPlease review and acknowledge the updated compliance documents in the portal.`;
    logAndOpenWhatsApp(staffPhone, msg, 'COMPLIANCE_REMINDER');
  }
};
