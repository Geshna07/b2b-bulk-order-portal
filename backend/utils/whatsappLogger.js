import { db } from './firebaseAdmin.js';

export async function logWhatsAppNotification(to, message, trigger, openedBy) {
  try {
    await db.collection('whatsappLogs').add({
      to,
      message,
      trigger,
      openedBy,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error logging WhatsApp notification:", error);
  }
}
