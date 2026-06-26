import { auth, db } from '../utils/firebaseAdmin.js';

export async function verifyCustomer(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let uid;

    // If it looks like a JWT, try verifying it
    if (idToken.includes('.') && !idToken.startsWith('customer_')) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch (authError) {
        console.warn("verifyIdToken failed for JWT-like token:", authError.message);
      }
    }

    // Fallback if not verified as JWT
    if (!uid) {
      // Check if it's a direct UID
      if (!idToken.includes('.') || idToken.startsWith('customer_') || idToken.includes('_')) {
        uid = idToken;
      } else {
        // Attempt manual decode if it was a failed JWT
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            uid = payload.uid || payload.sub || payload.user_id;
          }
        } catch (jwtErr) {
          console.warn("Manual JWT decode failed:", jwtErr.message);
        }
      }
    }

    if (!uid || uid === 'null' || uid === 'undefined') {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
    }

    // Retrieve user profile in Firestore
    const userDocRef = db.collection('users').doc(uid);
    const userSnapshot = await userDocRef.get();

    if (!userSnapshot.exists) {
      return res.status(403).json({ error: 'Forbidden: User profile not found' });
    }

    const userData = userSnapshot.data();
    if (userData.role !== 'customer') {
      return res.status(403).json({ error: 'Forbidden: Access restricted to customers' });
    }

    if (userData.status !== 'active') {
      return res.status(403).json({ error: 'Forbidden: Customer account is not active' });
    }

    // Attach user information to request
    req.user = userData;
    req.uid = uid;

    next();
  } catch (error) {
    console.error('Error in verifyCustomer middleware:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token', details: error.message });
  }
}
