const express = require('express');
const router = express.Router();
const FirebaseAuthService = require('../utils/firebaseAuthService');
const User = require('../models/User');
const JWTService = require('../utils/jwtService');

// Test Firebase authentication with test number
router.post('/test-auth', async (req, res) => {
  try {
    const { phone, otp, role = 'client' } = req.body;

    // Validate test credentials
    const validCredentials = [
      { phone: '+919090909090', otp: '909090' },
      { phone: '+918080808080', otp: '808080' },
      { phone: '+916060606060', otp: '606060' }
    ];
    
    const isValidCredential = validCredentials.some(cred => 
      cred.phone === phone && cred.otp === otp
    );
    
    if (!isValidCredential) {
      return res.status(400).json({
        success: false,
        message: 'Invalid test credentials. Use phone: +919090909090 with otp: 909090 or phone: +918080808080 with otp: 808080'
      });
    }

    // Check if Firebase is available
    if (!FirebaseAuthService.isFirebaseAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Firebase authentication is not available'
      });
    }

    // Simulate Firebase authentication for test number
    const phoneNumber = phone;
    const uid = `test_${phoneNumber.replace('+', '')}`;

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { phone: phoneNumber },
        { firebaseUid: uid }
      ]
    });

    if (!user) {
      // Create new user
      user = new User({
        phone: phoneNumber,
        firebaseUid: uid,
        role,
        isVerified: true,
        authMethod: 'firebase'
      });
      await user.save();
      console.log('✅ New test user created:', user.phone);
    } else {
      // Update existing user
      user.firebaseUid = uid;
      user.lastLogin = new Date();
      user.isVerified = true;
      user.authMethod = 'firebase';
      user.role = role;
      await user.save();
      console.log('✅ Existing test user updated:', user.phone);
    }

    // Generate JWT token
    const token = JWTService.generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Firebase test authentication successful',
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          authMethod: user.authMethod,
          firebaseUid: user.firebaseUid
        },
        testInfo: {
          phone: phoneNumber,
          otp: otp,
          uid: uid
        }
      }
    });
  } catch (error) {
    console.error('Firebase test authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Firebase test authentication failed',
      error: error.message
    });
  }
});

// Get Firebase configuration for testing
router.get('/config', async (req, res) => {
  try {
    const config = FirebaseAuthService.getFirebaseConfig();
    const isAvailable = FirebaseAuthService.isFirebaseAvailable();
    
    res.json({
      success: true,
      data: {
        config,
        isAvailable,
        testCredentials: [
          { phone: '+919090909090', otp: '909090' },
          { phone: '+918080808080', otp: '808080' },
          { phone: '+916060606060', otp: '606060' }
        ]
      }
    });
  } catch (error) {
    console.error('Get Firebase config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Firebase configuration'
    });
  }
});

// Test user creation
router.post('/create-test-user', async (req, res) => {
  try {
    const { phone = '+919090909090', role = 'client' } = req.body;
    
    const uid = `test_${phone.replace('+', '')}`;
    
    // Check if user already exists
    let user = await User.findOne({ phone });
    if (user) {
      return res.json({
        success: true,
        message: 'Test user already exists',
        data: {
          user: {
            id: user._id,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            authMethod: user.authMethod,
            firebaseUid: user.firebaseUid
          }
        }
      });
    }

    // Create test user
    user = new User({
      phone,
      firebaseUid: uid,
      role,
      isVerified: true,
      authMethod: 'firebase'
    });
    
    await user.save();

    res.json({
      success: true,
      message: 'Test user created successfully',
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          authMethod: user.authMethod,
          firebaseUid: user.firebaseUid
        }
      }
    });
  } catch (error) {
    console.error('Create test user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test user',
      error: error.message
    });
  }
});

// List all test users
router.get('/test-users', async (req, res) => {
  try {
    const users = await User.find({ 
      $or: [
        { phone: '+919090909090' },
        { firebaseUid: { $regex: /^test_/ } }
      ]
    }).select('phone role isVerified authMethod firebaseUid createdAt');

    res.json({
      success: true,
      data: {
        users,
        count: users.length
      }
    });
  } catch (error) {
    console.error('Get test users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test users',
      error: error.message
    });
  }
});

// Delete test users
router.delete('/test-users', async (req, res) => {
  try {
    const result = await User.deleteMany({ 
      $or: [
        { phone: '+919090909090' },
        { firebaseUid: { $regex: /^test_/ } }
      ]
    });

    res.json({
      success: true,
      message: 'Test users deleted successfully',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Delete test users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test users',
      error: error.message
    });
  }
});

module.exports = router;
