import { db } from './firebaseAdmin.js';

/**
 * Create a notification in Firestore
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} message - Detailed message
 * @param {string} type - 'info', 'success', 'warning', 'error'
 */
export async function createNotification(userId, title, message, type = 'info') {
  try {
    await db.collection('notifications').add({
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date()
    });
    console.log(`Notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Notify all admins
 */
export async function notifyAdmins(title, message, type = 'info') {
  try {
    const adminSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    const promises = [];
    adminSnapshot.forEach(doc => {
      promises.push(createNotification(doc.id, title, message, type));
    });
    await Promise.all(promises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}
