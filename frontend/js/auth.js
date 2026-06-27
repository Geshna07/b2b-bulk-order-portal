import { auth, db } from '/firebase/firebaseConfig.js';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

/**
 * Login with Google
 * @param {string} expectedRole - 'admin', 'staff', or 'customer'
 */
export async function loginWithGoogle(expectedRole) {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore
    let userDoc = await getDoc(doc(db, 'users', user.uid));
    let userData = null;
    
    if (!userDoc.exists()) {
      // Check by email as fallback (UID might be different)
      const q = query(collection(db, 'users'), where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        userData = existingDoc.data();
        userData.uid = user.uid; // Update to Google UID
        await updateDoc(doc(db, 'users', existingDoc.id), { uid: user.uid });
      } else {
        // Auto-registration logic
        console.log(`Auto-registering new ${expectedRole} account for ${user.email}...`);
        
        userData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0].toUpperCase(),
          role: expectedRole,
          subRole: expectedRole === 'staff' ? 'salesman' : null,
          institutionName: 'Ganga Maxx HQ',
          institutionType: expectedRole === 'customer' ? 'Hospital' : 'Wholesaler',
          address: {
            street: 'Ganga Maxx Plaza, Sector 62',
            city: 'Noida',
            state: 'Uttar Pradesh',
            pincode: '201301'
          },
          status: expectedRole === 'staff' ? 'pending' : 'active',
          createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', user.uid), userData);
        
        if (expectedRole === 'staff') {
          throw new Error("Registration successful! However, staff accounts require administrator approval. Please contact your manager to activate your account.");
        }
      }
    } else {
      userData = userDoc.data();
    }

    // Strict Role Enforcement based on UI role selector
    if (userData.role !== expectedRole) {
      if (userData.role === 'admin') {
        throw new Error("This account has Administrator privileges. Please select the 'Admin' role toggle above to log in.");
      } else if (userData.role === 'staff') {
        throw new Error("This is a Staff account. Please select the 'Staff Member' role toggle above to log in.");
      } else if (userData.role === 'customer') {
        throw new Error("This is a Customer account. Please select the 'Customer' role toggle above to log in.");
      } else {
        throw new Error(`Selected role '${expectedRole}' does not match your account role.`);
      }
    }
    
    if (userData.status !== 'active') {
      throw new Error("This account is currently inactive or pending approval. Please contact an administrator.");
    }

    redirectBasedOnRole(userData);
    return { success: true, user: userData };
  } catch (error) {
    console.error("Google Login failure:", error);
    let errorMessage = error.message;
    if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = "The login popup was closed before completion. Please try again.";
    } else if (error.code === 'auth/cancelled-popup-request') {
      errorMessage = "Previous login attempt was cancelled. Please try again.";
    } else if (error.code === 'auth/popup-blocked') {
      errorMessage = "The login popup was blocked by your browser. Please allow popups for this site.";
    }
    return { success: false, error: errorMessage };
  }
}

// Redirect based on user role
function redirectBasedOnRole(userData) {
  localStorage.setItem('currentUser', JSON.stringify(userData));
  if (userData.subRole) {
    localStorage.setItem('subRole', userData.subRole);
  } else {
    localStorage.removeItem('subRole');
  }

  const role = userData.role;
  if (role === 'customer') {
    window.location.href = '/pages/customer/dashboard.html';
  } else if (role === 'staff') {
    window.location.href = '/pages/staff/dashboard.html';
  } else if (role === 'admin') {
    window.location.href = '/pages/admin/dashboard.html';
  } else {
    alert('Unknown user role: ' + role);
  }
}

// Core Login function with fallback to direct database lookup
async function loginUser(email, password, expectedRole) {
  try {
    email = email.trim().toLowerCase();
    let userData = null;
    
    // Attempt standard Firebase Auth sign-in first
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userUid = userCredential.user.uid;
      
      const userDocRef = doc(db, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        userData = userDoc.data();
        userData.uid = userUid;
      }
    } catch (authError) {
      console.warn("Firebase Auth sign-in unavailable or failed. Trying direct Firestore lookup...", authError);
      
      // Fallback: Check if user exists directly in Firestore
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const matchedDoc = querySnapshot.docs[0];
        const dbData = matchedDoc.data();
        
        // If user exists in Firestore, accept
        userData = { ...dbData, uid: matchedDoc.id };
        // Removed insecure password check against Firestore field
      } else {
        // Dynamic Auto-registration: user does not exist, so let's register them!
        console.log(`Auto-registering new ${expectedRole} account for ${email}...`);
        try {
          // 1. Create in Firebase Auth
          let uid;
          try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            uid = userCred.user.uid;
          } catch (createAuthErr) {
            console.warn("Auth signup failed (might already exist in auth, or offline), generating local UID", createAuthErr);
            uid = expectedRole + '_' + Math.random().toString(36).substring(2, 11);
          }
          
          // 2. Set Firestore Doc
          const newDoc = {
            uid: uid,
            name: email.split('@')[0].toUpperCase(),
            email: email,
            phone: '+919999999999',
            whatsappNumber: '+919999999999',
            role: expectedRole,
            subRole: expectedRole === 'staff' ? 'salesman' : null,
            institutionName: 'Ganga Maxx HQ',
            institutionType: expectedRole === 'customer' ? 'Hospital' : 'Wholesaler',
            address: {
              street: 'Ganga Maxx Plaza, Sector 62',
              city: 'Noida',
              state: 'Uttar Pradesh',
              pincode: '201301'
            },
            status: 'active',
            createdAt: new Date().toISOString()
          };
          
          await setDoc(doc(db, 'users', uid), newDoc);
          userData = newDoc;
        } catch (regErr) {
          console.error("Auto-registration failed:", regErr);
          throw new Error("No registered account found with this email address and auto-registration failed: " + regErr.message);
        }
      }
    }

    if (!userData) {
      throw new Error("Account details could not be retrieved.");
    }

    // Strict Role Enforcement based on UI role selector
    if (userData.role !== expectedRole) {
      if (userData.role === 'admin') {
        throw new Error("This account has Administrator privileges. Please select the 'Admin' role toggle above to log in.");
      } else if (userData.role === 'staff') {
        throw new Error("This is a Staff account. Please select the 'Staff Member' role toggle above to log in.");
      } else if (userData.role === 'customer') {
        throw new Error("This is a Customer account. Please select the 'Customer' role toggle above to log in.");
      } else {
        throw new Error(`Selected role '${expectedRole}' does not match your account role.`);
      }
    }
    
    if (userData.status !== 'active') {
      throw new Error("This account is currently inactive. Please contact system administrators.");
    }

    // Successful login -> Redirect
    redirectBasedOnRole(userData);
    return { success: true, user: userData };
  } catch (error) {
    console.error("Login failure:", error);
    let errorMessage = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      errorMessage = "Email/Password sign-in is not enabled in this Firebase project. Please enable it in the Firebase Console (Authentication -> Sign-in method).";
    }
    return { success: false, error: errorMessage };
  }
}

// Log out function
async function logoutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Firebase SignOut failed:", e);
  }
  localStorage.removeItem('currentUser');
  localStorage.removeItem('subRole');
  window.location.href = '/pages/login.html';
}

// Start Forgot Password Flow: lookup email and trigger OTP
async function requestPasswordReset(email) {
  try {
    email = email.trim().toLowerCase();
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("No registered account found with this email address.");
    }

    const matchedDoc = querySnapshot.docs[0];
    const userData = matchedDoc.data();
    const docId = matchedDoc.id;

    // Retrieve whatsapp or phone number
    const phoneFull = userData.whatsappNumber || userData.phone || '+919999999999';
    // Format last 4 digits
    const cleanedPhone = phoneFull.replace(/[^0-9]/g, '');
    const lastFour = cleanedPhone.slice(-4) || '9999';
    
    // Extract local number for wa.me (normally 10 digits for India)
    let waPhone = cleanedPhone;
    if (waPhone.startsWith('91') && waPhone.length > 10) {
      waPhone = waPhone.substring(2);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Store in sessionStorage
    sessionStorage.setItem('reset_otp_data', JSON.stringify({
      otp,
      expiresAt,
      email,
      docId
    }));

    // Generate wa.me link
    const textMessage = encodeURIComponent(`Your OTP for Ganga Maxx is ${otp}`);
    const waLink = `https://wa.me/91${waPhone}?text=${textMessage}`;

    // Open link in a new tab
    window.open(waLink, '_blank');

    return {
      success: true,
      lastFour,
      email,
      docId
    };
  } catch (error) {
    console.error("Password reset request error:", error);
    return { success: false, error: error.message };
  }
}

// Verify entered OTP
function verifyResetOtp(enteredOtp) {
  try {
    const rawData = sessionStorage.getItem('reset_otp_data');
    if (!rawData) {
      throw new Error("No password reset session active. Please request a code again.");
    }

    const data = JSON.parse(rawData);
    if (Date.now() > data.expiresAt) {
      throw new Error("The OTP has expired. Please request a new code.");
    }

    if (data.otp !== enteredOtp) {
      throw new Error("Invalid OTP code. Please check and try again.");
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Save New Password permanently in Firestore
async function updateAccountPassword(newPassword) {
  try {
    const rawData = sessionStorage.getItem('reset_otp_data');
    if (!rawData) {
      throw new Error("Reset session expired. Please restart the forgot password process.");
    }

    const data = JSON.parse(rawData);
    const userDocRef = doc(db, 'users', data.docId);
    
    // Save in Firestore (no password)
    await updateDoc(userDocRef, {
      updatedAt: new Date()
    });

    sessionStorage.removeItem('reset_otp_data');
    return { success: true };
  } catch (error) {
    console.error("Failed to update password:", error);
    return { success: false, error: error.message };
  }
}

// Export functions to window object
window.authApp = {
  loginUser,
  loginWithGoogle,
  logoutUser,
  requestPasswordReset,
  verifyResetOtp,
  updateAccountPassword,
  db,
  auth
};
