const express = require('express');
const router = express.Router();
const FreelancerProfile = require('../models/FreelancerProfile');
const Job = require('../models/Job');
const Offer = require('../models/Offer');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { validationRules, handleValidationErrors } = require('../utils/validation');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { uploadProfilePhoto, uploadDocuments, handleUploadError } = require('../middleware/upload');

// Check verification status after authentication
router.get('/verification-status', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.json({
        success: true,
        data: {
          hasProfile: false,
          verificationStatus: 'not_found',
          message: 'No profile found. Please create your freelancer profile.',
          nextAction: 'create_profile',
          canNavigateToDashboard: false
        }
      });
    }

    // Determine status and next actions
    let statusMessage = '';
    let nextAction = '';
    let canNavigateToDashboard = false;
    let canResubmit = false;
    let canCheckStatus = false;

    switch (profile.verificationStatus) {
      case 'pending':
        statusMessage = 'Your profile is pending verification. Please wait for admin approval.';
        nextAction = 'wait_for_approval';
        canCheckStatus = true;
        break;
      
      case 'under_review':
        statusMessage = 'Your profile is currently under review by our admin team.';
        nextAction = 'wait_for_approval';
        canCheckStatus = true;
        break;
      
      case 'approved':
        statusMessage = `Your profile has been approved! Your Freelancer ID is: ${profile.freelancerId}`;
        nextAction = 'navigate_to_dashboard';
        canNavigateToDashboard = true;
        break;
      
      case 'rejected':
        statusMessage = `Your profile was rejected. Reason: ${profile.rejectionReason || 'Please check your documents and try again.'}`;
        nextAction = 'resubmit_verification';
        canResubmit = true;
        break;
      
      case 'resubmitted':
        statusMessage = 'Your profile has been resubmitted for verification. Please wait for admin approval.';
        nextAction = 'wait_for_approval';
        canCheckStatus = true;
        break;
      
      default:
        statusMessage = 'Unknown verification status. Please contact support.';
        nextAction = 'contact_support';
    }

    res.json({
      success: true,
      data: {
        hasProfile: true,
        verificationStatus: profile.verificationStatus,
        freelancerId: profile.freelancerId,
        statusMessage,
        nextAction,
        canNavigateToDashboard,
        canResubmit,
        canCheckStatus,
        rejectionReason: profile.rejectionReason,
        profile: {
          fullName: profile.fullName,
          isProfileComplete: profile.isProfileComplete,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status'
    });
  }
});

// Resubmit verification
router.post('/profile/resubmit',
  auth,
  roleAuth('freelancer'),
  uploadDocuments,
  handleUploadError,
  validationRules.freelancerProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        address
      } = req.body;

      // Check if profile exists and is rejected
      const existingProfile = await FreelancerProfile.findOne({ userId: req.user._id });
      if (!existingProfile || existingProfile.verificationStatus !== 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'No rejected profile found to resubmit'
        });
      }

      // Handle file uploads
      const documents = {};
      if (req.files) {
        if (req.files.profilePhoto) documents.profilePhoto = req.files.profilePhoto[0].filename;
        if (req.files.aadhaarFront) documents.aadhaarFront = req.files.aadhaarFront[0].filename;
        if (req.files.aadhaarBack) documents.aadhaarBack = req.files.aadhaarBack[0].filename;
        if (req.files.drivingLicenseFront) documents.drivingLicenseFront = req.files.drivingLicenseFront[0].filename;
        if (req.files.drivingLicenseBack) documents.drivingLicenseBack = req.files.drivingLicenseBack[0].filename;
        if (req.files.panFront) documents.panFront = req.files.panFront[0].filename;
      }

      // Validate required documents
      const requiredDocuments = ['aadhaarFront', 'aadhaarBack', 'panFront'];
      const missingDocuments = requiredDocuments.filter(doc => !documents[doc] && !req.files?.[doc]);

      if (missingDocuments.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required documents: ${missingDocuments.join(', ')}`,
          missingDocuments
        });
      }

      // Update profile with new details (replace previous details completely)
      existingProfile.fullName = fullName;
      existingProfile.dateOfBirth = dateOfBirth;
      existingProfile.gender = gender;
      existingProfile.address = address;
      
      // Replace profile photo if new one is uploaded
      if (documents.profilePhoto) {
        existingProfile.profilePhoto = documents.profilePhoto;
      }
      
      // Replace all documents with new ones (complete replacement)
      existingProfile.documents = {
        aadhaarFront: documents.aadhaarFront || null,
        aadhaarBack: documents.aadhaarBack || null,
        drivingLicenseFront: documents.drivingLicenseFront || null,
        drivingLicenseBack: documents.drivingLicenseBack || null,
        panFront: documents.panFront || null
      };
      
      existingProfile.verificationStatus = 'resubmitted';
      existingProfile.rejectionReason = null; // Clear previous rejection reason
      existingProfile.isProfileComplete = true;
      existingProfile.updatedAt = new Date(); // Update timestamp

      await existingProfile.save();

      res.json({
        success: true,
        message: 'Profile resubmitted for verification. Please wait for admin approval.',
        data: { 
          profile: existingProfile,
          verificationStatus: 'resubmitted',
          message: 'Your profile has been resubmitted for verification. You will receive a Freelancer ID once approved by admin.'
        }
      });
    } catch (error) {
      console.error('Resubmit profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resubmit profile'
      });
    }
  }
);

// Get freelancer profile
router.get('/profile', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({ userId: req.user._id })
      .populate('userId', 'phone role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Add verification status message
    let statusMessage = '';
    let canResubmit = false;
    
    if (profile.verificationStatus === 'pending') {
      statusMessage = 'Your profile is pending verification. Please wait for admin approval.';
    } else if (profile.verificationStatus === 'approved') {
      statusMessage = `Your profile has been approved! Your Freelancer ID is: ${profile.freelancerId}`;
    } else if (profile.verificationStatus === 'rejected') {
      statusMessage = `Your profile was rejected. Reason: ${profile.rejectionReason}`;
      canResubmit = true;
    } else if (profile.verificationStatus === 'resubmitted') {
      statusMessage = 'Your profile has been resubmitted for verification. Please wait for admin approval.';
    }

    res.json({
      success: true,
      data: { 
        profile,
        statusMessage,
        canApplyJobs: profile.verificationStatus === 'approved',
        canResubmit
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Create/Update freelancer profile with verification
router.post('/profile',
  auth,
  roleAuth('freelancer'),
  uploadDocuments,
  handleUploadError,
  validationRules.freelancerProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        address
      } = req.body;

      // Handle file uploads
      const documents = {};
      if (req.files) {
        if (req.files.profilePhoto) documents.profilePhoto = req.files.profilePhoto[0].filename;
        if (req.files.aadhaarFront) documents.aadhaarFront = req.files.aadhaarFront[0].filename;
        if (req.files.aadhaarBack) documents.aadhaarBack = req.files.aadhaarBack[0].filename;
        if (req.files.drivingLicenseFront) documents.drivingLicenseFront = req.files.drivingLicenseFront[0].filename;
        if (req.files.drivingLicenseBack) documents.drivingLicenseBack = req.files.drivingLicenseBack[0].filename;
        if (req.files.panFront) documents.panFront = req.files.panFront[0].filename;
      }

      // Validate required documents
      const requiredDocuments = ['aadhaarFront', 'aadhaarBack', 'panFront'];
      const missingDocuments = requiredDocuments.filter(doc => !documents[doc] && !req.files?.[doc]);

      if (missingDocuments.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required documents: ${missingDocuments.join(', ')}`,
          missingDocuments
        });
      }

      let profile = await FreelancerProfile.findOne({ userId: req.user._id });

      if (profile) {
        // Update existing profile
        Object.assign(profile, {
          fullName,
          dateOfBirth,
          gender,
          address,
          profilePhoto: documents.profilePhoto || profile.profilePhoto,
          documents: { ...profile.documents, ...documents },
          isProfileComplete: true,
          verificationStatus: 'pending' // Set to pending for admin review
        });
      } else {
        // Create new profile
        profile = new FreelancerProfile({
          userId: req.user._id,
          fullName,
          dateOfBirth,
          gender,
          address,
          profilePhoto: documents.profilePhoto,
          documents,
          isProfileComplete: true,
          verificationStatus: 'pending' // Set to pending for admin review
        });
      }

      await profile.save();

      res.json({
        success: true,
        message: 'Profile submitted for verification. Please wait for admin approval.',
        data: { 
          profile,
          verificationStatus: 'pending',
          message: 'Your profile has been submitted for verification. You will receive a Freelancer ID once approved by admin.'
        }
      });
    } catch (error) {
      console.error('Save profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save profile'
      });
    }
  }
);

// Upload profile photo
router.post('/profile/photo',
  auth,
  roleAuth('freelancer'),
  uploadProfilePhoto,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const profile = await FreelancerProfile.findOne({ userId: req.user._id });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      profile.profilePhoto = req.file.filename;
      await profile.save();

      res.json({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: { profilePhoto: req.file.filename }
      });
    } catch (error) {
      console.error('Upload photo error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload photo'
      });
    }
  }
);

// Get available jobs
router.get('/jobs/available', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { page = 1, limit = 10, gender, location } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      status: 'open',
      isActive: true
    };

    // Filter by gender preference
    if (gender && gender !== 'any') {
      query.$or = [
        { genderPreference: 'any' },
        { genderPreference: gender }
      ];
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get available jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available jobs'
    });
  }
});

// Get assigned jobs
router.get('/jobs/assigned', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      freelancerId: req.user._id
    };

    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate('clientId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get assigned jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assigned jobs'
    });
  }
});

// Apply for job
router.post('/jobs/:jobId/apply',
  auth,
  roleAuth('freelancer'),
  validationRules.offer,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { offeredAmount, message, offerType = 'direct_apply' } = req.body;

      // Check freelancer verification status
      const profile = await FreelancerProfile.findOne({ userId: req.user._id });
      if (!profile || profile.verificationStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Your profile must be approved before you can apply for jobs',
          verificationStatus: profile?.verificationStatus || 'not_found'
        });
      }

      // Check if job exists and is open
      const job = await Job.findById(jobId);
      if (!job || job.status !== 'open') {
        return res.status(400).json({
          success: false,
          message: 'Job not available'
        });
      }

      // Check if already applied
      const existingOffer = await Offer.findOne({
        jobId,
        freelancerId: req.user._id,
        status: { $in: ['pending', 'accepted'] }
      });

      if (existingOffer) {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }

      // Create offer
      const offer = new Offer({
        jobId,
        freelancerId: req.user._id,
        clientId: job.clientId,
        originalAmount: job.amount,
        offeredAmount: offeredAmount || job.amount,
        message,
        offerType
      });

      await offer.save();

      // If direct apply, auto-assign job
      if (offerType === 'direct_apply') {
        job.freelancerId = req.user._id;
        job.status = 'assigned';
        job.assignedAt = new Date();
        await job.save();
      }

      res.json({
        success: true,
        message: 'Job application submitted successfully',
        data: { offer }
      });
    } catch (error) {
      console.error('Apply for job error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply for job'
      });
    }
  }
);

// Mark work as done
router.post('/jobs/:jobId/work-done',
  auth,
  roleAuth('freelancer'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        freelancerId: req.user._id,
        status: 'assigned'
      });

      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found or not assigned to you'
        });
      }

      job.status = 'work_done';
      job.workCompletedAt = new Date();
      await job.save();

      res.json({
        success: true,
        message: 'Work marked as completed',
        data: { job }
      });
    } catch (error) {
      console.error('Mark work done error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark work as done'
      });
    }
  }
);

// Get wallet balance
router.get('/wallet', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user._id });
    
    if (!wallet) {
      wallet = new Wallet({ userId: req.user._id });
      await wallet.save();
    }

    res.json({
      success: true,
      data: { wallet }
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wallet'
    });
  }
});

// Get transaction history
router.get('/transactions', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({
      freelancerId: req.user._id
    })
      .populate('jobId', 'title')
      .populate('clientId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({
      freelancerId: req.user._id
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions'
    });
  }
});

// Request withdrawal
router.post('/withdraw',
  auth,
  roleAuth('freelancer'),
  validationRules.withdrawal,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { amount, bankDetails } = req.body;

      // Check wallet balance
      let wallet = await Wallet.findOne({ userId: req.user._id });
      if (!wallet || wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }

      // Create withdrawal transaction
      const transaction = new Transaction({
        freelancerId: req.user._id,
        amount,
        type: 'withdrawal',
        status: 'pending',
        description: 'Withdrawal request',
        paymentMethod: 'bank_transfer',
        bankDetails
      });

      await transaction.save();

      // Deduct from wallet
      wallet.balance -= amount;
      await wallet.save();

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: { transaction }
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process withdrawal'
      });
    }
  }
);

module.exports = router;
