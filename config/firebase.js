const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production, you'll need to download your service account key from Firebase Console
// For now, we'll use environment variables or initialize without credentials for development

let firebaseApp;

try {
  // Check if Firebase is already initialized
  if (admin.apps.length === 0) {
    // Initialize Firebase Admin SDK with real project configuration
    firebaseApp = admin.initializeApp({
      // Use service account key if available, otherwise use project ID
      credential: admin.credential.applicationDefault(),
      projectId: 'freelancing-platform-v2',
      storageBucket: 'freelancing-platform-v2.firebasestorage.app'
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`   Project ID: freelancing-platform-v2`);
    console.log(`   Storage Bucket: freelancing-platform-v2.firebasestorage.app`);
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  console.log('⚠️  Firebase will run in limited mode');
  firebaseApp = null;
}

// Export Firebase Admin SDK
module.exports = {
  admin,
  firebaseApp,
  
  // Helper function to verify Firebase ID token
  async verifyIdToken(idToken) {
    try {
      if (!firebaseApp) {
        throw new Error('Firebase not initialized');
      }
      
      const decodedToken = await firebaseApp.auth().verifyIdToken(idToken);
      return {
        success: true,
        uid: decodedToken.uid,
        phoneNumber: decodedToken.phone_number,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        claims: decodedToken
      };
    } catch (error) {
      console.error('Firebase token verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Helper function to create custom token
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      if (!firebaseApp) {
        throw new Error('Firebase not initialized');
      }
      
      const customToken = await firebaseApp.auth().createCustomToken(uid, additionalClaims);
      return {
        success: true,
        customToken
      };
    } catch (error) {
      console.error('Firebase custom token creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};
