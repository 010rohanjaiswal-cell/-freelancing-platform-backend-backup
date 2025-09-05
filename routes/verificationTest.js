const express = require('express');
const router = express.Router();
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Test endpoint to create freelancer profile with different verification statuses
router.post('/create-test-profile', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { verificationStatus = 'pending', fullName = 'Test Freelancer' } = req.body;

    // Check if profile already exists
    let profile = await FreelancerProfile.findOne({ userId: req.user._id });
    
    if (profile) {
      // Update existing profile
      profile.verificationStatus = verificationStatus;
      profile.fullName = fullName;
      profile.isProfileComplete = true;
      
      // Set rejection reason if status is rejected
      if (verificationStatus === 'rejected') {
        profile.rejectionReason = 'Test rejection reason: Please check your document quality and try again.';
      } else {
        profile.rejectionReason = null;
      }
      
      // Generate freelancer ID if approved
      if (verificationStatus === 'approved' && !profile.freelancerId) {
        profile.freelancerId = Math.floor(10000 + Math.random() * 900000).toString();
      }
      
      await profile.save();
    } else {
      // Create new profile
      profile = new FreelancerProfile({
        userId: req.user._id,
        fullName,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          country: 'India'
        },
        profilePhoto: 'test-photo.jpg',
        documents: {
          aadhaarFront: 'test-aadhaar-front.jpg',
          aadhaarBack: 'test-aadhaar-back.jpg',
          panFront: 'test-pan.jpg'
        },
        verificationStatus,
        isProfileComplete: true
      });
      
      // Set rejection reason if status is rejected
      if (verificationStatus === 'rejected') {
        profile.rejectionReason = 'Test rejection reason: Please check your document quality and try again.';
      }
      
      // Generate freelancer ID if approved
      if (verificationStatus === 'approved') {
        profile.freelancerId = Math.floor(10000 + Math.random() * 900000).toString();
      }
      
      await profile.save();
    }

    res.json({
      success: true,
      message: `Test profile created/updated with status: ${verificationStatus}`,
      data: {
        profile: {
          id: profile._id,
          fullName: profile.fullName,
          verificationStatus: profile.verificationStatus,
          freelancerId: profile.freelancerId,
          rejectionReason: profile.rejectionReason,
          isProfileComplete: profile.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Create test profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test profile',
      error: error.message
    });
  }
});

// Test endpoint to simulate admin approval
router.post('/simulate-approval', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No profile found'
      });
    }

    profile.verificationStatus = 'approved';
    profile.rejectionReason = null;
    
    // Generate freelancer ID if not exists
    if (!profile.freelancerId) {
      profile.freelancerId = Math.floor(10000 + Math.random() * 900000).toString();
    }
    
    await profile.save();

    res.json({
      success: true,
      message: 'Profile approved successfully',
      data: {
        profile: {
          id: profile._id,
          fullName: profile.fullName,
          verificationStatus: profile.verificationStatus,
          freelancerId: profile.freelancerId,
          isProfileComplete: profile.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Simulate approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate approval',
      error: error.message
    });
  }
});

// Test endpoint to simulate admin rejection
router.post('/simulate-rejection', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { rejectionReason = 'Test rejection: Please improve document quality' } = req.body;
    
    const profile = await FreelancerProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No profile found'
      });
    }

    profile.verificationStatus = 'rejected';
    profile.rejectionReason = rejectionReason;
    profile.freelancerId = null; // Remove freelancer ID
    
    await profile.save();

    res.json({
      success: true,
      message: 'Profile rejected successfully',
      data: {
        profile: {
          id: profile._id,
          fullName: profile.fullName,
          verificationStatus: profile.verificationStatus,
          rejectionReason: profile.rejectionReason,
          isProfileComplete: profile.isProfileComplete
        }
      }
    });
  } catch (error) {
    console.error('Simulate rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate rejection',
      error: error.message
    });
  }
});

// Test endpoint to delete test profile
router.delete('/test-profile', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const result = await FreelancerProfile.deleteOne({ userId: req.user._id });
    
    res.json({
      success: true,
      message: 'Test profile deleted successfully',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Delete test profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete test profile',
      error: error.message
    });
  }
});

// Test endpoint to get current verification status
router.get('/current-status', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.json({
        success: true,
        data: {
          hasProfile: false,
          verificationStatus: 'not_found',
          message: 'No profile found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        hasProfile: true,
        verificationStatus: profile.verificationStatus,
        freelancerId: profile.freelancerId,
        rejectionReason: profile.rejectionReason,
        fullName: profile.fullName,
        isProfileComplete: profile.isProfileComplete,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt
      }
    });
  } catch (error) {
    console.error('Get current status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current status',
      error: error.message
    });
  }
});

module.exports = router;
