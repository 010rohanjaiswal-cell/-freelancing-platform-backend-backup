const express = require('express');
const router = express.Router();
const FirebaseAuthService = require('../utils/firebaseAuthService');
const User = require('../models/User');
const JWTService = require('../utils/jwtService');

// Real Firebase authentication with ID token
router.post('/authenticate', async (req, res) => {
  try {
    const { idToken, role = 'client' } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required'
      });
    }

    console.log('🔥 Authenticating with real Firebase...');
    console.log(`   Role: ${role}`);
    console.log(`   Token: ${idToken.substring(0, 20)}...`);

    // Verify Firebase ID token
    const firebaseResult = await FirebaseAuthService.verifyFirebaseToken(idToken);
    
    if (!firebaseResult.success) {
      console.log('❌ Firebase token verification failed:', firebaseResult.error);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase ID token',
        error: firebaseResult.error
      });
    }

    console.log('✅ Firebase token verified successfully');
    console.log(`   UID: ${firebaseResult.uid}`);
    console.log(`   Phone: ${firebaseResult.phoneNumber || 'N/A'}`);

    // Find or create user
    let user = await User.findOne({ firebaseUid: firebaseResult.uid });
    
    if (!user) {
      // Create new user
      user = new User({
        firebaseUid: firebaseResult.uid,
        phone: firebaseResult.phoneNumber,
        role: role,
        isVerified: false,
        authMethod: 'firebase'
      });
      
      await user.save();
      console.log('✅ New user created:', user._id);
    } else {
      // Update existing user
      user.phone = firebaseResult.phoneNumber || user.phone;
      user.authMethod = 'firebase';
      await user.save();
      console.log('✅ Existing user updated:', user._id);
    }

    // Generate JWT token
    const jwtToken = JWTService.generateToken({
      userId: user._id,
      role: user.role,
      phone: user.phone
    });

    console.log('✅ JWT token generated successfully');

    res.json({
      success: true,
      message: 'Firebase authentication successful',
      data: {
        user: {
          _id: user._id,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          firebaseUid: user.firebaseUid,
          createdAt: user.createdAt
        },
        token: jwtToken,
        firebase: {
          uid: firebaseResult.uid,
          phoneNumber: firebaseResult.phoneNumber
        }
      }
    });

  } catch (error) {
    console.error('❌ Real Firebase authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Firebase authentication failed',
      error: error.message
    });
  }
});

// Test endpoint to check Firebase configuration
router.get('/test', async (req, res) => {
  try {
    const isAvailable = FirebaseAuthService.isFirebaseAvailable();
    
    res.json({
      success: true,
      message: 'Firebase configuration test',
      data: {
        firebaseAvailable: isAvailable,
        projectId: 'freelancing-platform-v2',
        storageBucket: 'freelancing-platform-v2.firebasestorage.app',
        endpoints: {
          authenticate: '/api/real-firebase-auth/authenticate',
          test: '/api/real-firebase-auth/test'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Firebase test failed',
      error: error.message
    });
  }
});

module.exports = router;
