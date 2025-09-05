const express = require('express');
const router = express.Router();
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');

// Manual approve freelancer (no auth required for simplicity)
router.post('/approve/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { freelancerId } = req.body;

    const profile = await FreelancerProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (profile.verificationStatus !== 'pending' && profile.verificationStatus !== 'resubmitted') {
      return res.status(400).json({
        success: false,
        message: 'Profile is not pending verification'
      });
    }

    // Check if freelancer ID is already taken
    if (freelancerId) {
      const existingProfile = await FreelancerProfile.findOne({ freelancerId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: 'Freelancer ID already exists'
        });
      }
      profile.freelancerId = freelancerId;
    }

    profile.verificationStatus = 'approved';
    await profile.save();

    // Update user verification status
    await User.findByIdAndUpdate(profile.userId, {
      isVerified: true
    });

    res.json({
      success: true,
      message: 'Freelancer verification approved',
      data: { 
        profile,
        freelancerId: profile.freelancerId
      }
    });
  } catch (error) {
    console.error('Manual approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve verification'
    });
  }
});

// Manual reject freelancer
router.post('/reject/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const profile = await FreelancerProfile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    if (profile.verificationStatus !== 'pending' && profile.verificationStatus !== 'resubmitted') {
      return res.status(400).json({
        success: false,
        message: 'Profile is not pending verification'
      });
    }

    profile.verificationStatus = 'rejected';
    profile.rejectionReason = rejectionReason;
    await profile.save();

    res.json({
      success: true,
      message: 'Freelancer verification rejected',
      data: { 
        profile,
        rejectionReason
      }
    });
  } catch (error) {
    console.error('Manual reject error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject verification'
    });
  }
});

// Get pending verifications
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const profiles = await FreelancerProfile.find({
      verificationStatus: { $in: ['pending', 'resubmitted'] }
    })
    .populate('userId', 'phone role createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await FreelancerProfile.countDocuments({
      verificationStatus: { $in: ['pending', 'resubmitted'] }
    });

    res.json({
      success: true,
      data: {
        profiles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending verifications'
    });
  }
});

// Get specific profile details
router.get('/profile/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await FreelancerProfile.findById(profileId)
      .populate('userId', 'phone role createdAt');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

module.exports = router;
