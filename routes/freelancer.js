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
        address,
        pincode
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
      existingProfile.pincode = pincode;
      
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
        address,
        pincode
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
          pincode,
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
          pincode,
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
    const { page = 1, limit = 10, gender, jobType, sort } = req.query;
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

    // Filter by job type
    if (jobType && jobType !== 'all') {
      query.jobType = jobType;
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // default New to old
    if (sort === 'price_desc') sortOption = { amount: -1 };
    if (sort === 'price_asc') sortOption = { amount: 1 };
    if (sort === 'date_asc') sortOption = { createdAt: 1 }; // old to new

    const jobs = await Job.find(query)
      .populate('clientId', 'phone')
      .sort(sortOption)
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

// Check if freelancer has active jobs
router.get('/jobs/active-status', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const activeJob = await Job.findOne({
      freelancerId: req.user._id,
      status: { $in: ['assigned', 'work_done', 'waiting_for_payment'] }
    });

    res.json({
      success: true,
      data: {
        hasActiveJob: !!activeJob,
        activeJob: activeJob ? {
          id: activeJob._id,
          title: activeJob.title,
          status: activeJob.status,
          assignedAt: activeJob.assignedAt,
          canApplyForNewJobs: false
        } : null,
        canApplyForNewJobs: !activeJob
      }
    });
  } catch (error) {
    console.error('Get active job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active job status'
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

      // Check if freelancer already has an active job
      const activeJob = await Job.findOne({
        freelancerId: req.user._id,
        status: { $in: ['assigned', 'work_done', 'waiting_for_payment'] }
      });

      if (activeJob) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active job. Please complete your current job before applying for new ones.',
          activeJob: {
            id: activeJob._id,
            title: activeJob.title,
            status: activeJob.status,
            assignedAt: activeJob.assignedAt
          }
        });
      }

      // Check commission threshold
      const CommissionLedger = require('../models/CommissionLedger');
      const canWork = await CommissionLedger.canFreelancerWork(req.user._id);
      
      if (!canWork) {
        const { totalDue } = await CommissionLedger.getTotalDue(req.user._id);
        return res.status(400).json({
          success: false,
          message: `You have ₹${totalDue} in commission dues. Please clear dues to continue working.`,
          commissionDue: totalDue,
          threshold: 700,
          canWork: false
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

      job.status = 'waiting_for_payment';
      job.workCompletedAt = new Date();
      await job.save();

      res.json({
        success: true,
        message: 'Work marked as completed. Waiting for payment.',
        data: { 
          job,
          nextAction: 'waiting_for_payment',
          buttonText: 'Waiting for Payment',
          showSpinner: true
        }
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

// Mark job as completed (after payment received)
router.post('/jobs/:jobId/complete',
  auth,
  roleAuth('freelancer'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        freelancerId: req.user._id,
        status: 'paid'
      });

      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found or payment not received yet'
        });
      }

      job.status = 'completed';
      job.completedAt = new Date();
      await job.save();

      // Update freelancer stats
      const profile = await FreelancerProfile.findOne({ userId: req.user._id });
      if (profile) {
        profile.completedJobs += 1;
        profile.totalEarnings += job.amount;
        await profile.save();
      }

      res.json({
        success: true,
        message: 'Job marked as completed successfully',
        data: { 
          job,
          nextAction: 'navigate_to_orders',
          message: 'Job completed! You can now apply for new jobs.'
        }
      });
    } catch (error) {
      console.error('Mark job complete error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark job as completed'
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

// Get commission ledger
router.get('/commission-ledger', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const CommissionLedger = require('../models/CommissionLedger');
    
    const ledgerEntries = await CommissionLedger.find({
      freelancerId: req.user._id
    })
    .populate('jobId', 'title amount')
    .sort({ createdAt: -1 });

    // Get total due amount
    const { totalDue, count } = await CommissionLedger.getTotalDue(req.user._id);
    
    // Check if freelancer can work (threshold check)
    const canWork = await CommissionLedger.canFreelancerWork(req.user._id);

    res.json({
      success: true,
      data: {
        ledgerEntries,
        totalDue,
        pendingCount: count,
        canWork,
        threshold: 700,
        isOverThreshold: totalDue >= 700
      }
    });
  } catch (error) {
    console.error('Get commission ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get commission ledger'
    });
  }
});

// Clear commission due
router.post('/commission-ledger/clear-due', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const CommissionLedger = require('../models/CommissionLedger');
    
    // Get total due amount
    const { totalDue } = await CommissionLedger.getTotalDue(req.user._id);
    
    if (amount > totalDue) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot exceed total due amount'
      });
    }

    // Check freelancer wallet balance
    let wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }

    // Get pending ledger entries
    const pendingEntries = await CommissionLedger.find({
      freelancerId: req.user._id,
      status: 'pending'
    }).sort({ createdAt: 1 });

    let remainingAmount = amount;
    const processedEntries = [];

    // Process entries in chronological order
    for (const entry of pendingEntries) {
      if (remainingAmount <= 0) break;
      
      const entryAmount = Math.min(entry.amount, remainingAmount);
      
      if (entryAmount === entry.amount) {
        // Full payment for this entry
        await entry.markAsPaid(paymentMethod, `CLEAR_DUE_${Date.now()}`);
        processedEntries.push({
          id: entry._id,
          amount: entry.amount,
          status: 'fully_paid'
        });
      } else {
        // Partial payment - create new entry for remaining amount
        const remainingEntry = new CommissionLedger({
          freelancerId: entry.freelancerId,
          jobId: entry.jobId,
          amount: entry.amount - entryAmount,
          type: entry.type,
          description: entry.description,
          status: 'pending'
        });
        await remainingEntry.save();
        
        // Update original entry
        entry.amount = entryAmount;
        await entry.markAsPaid(paymentMethod, `CLEAR_DUE_${Date.now()}`);
        processedEntries.push({
          id: entry._id,
          amount: entryAmount,
          status: 'partially_paid'
        });
      }
      
      remainingAmount -= entryAmount;
    }

    // Deduct amount from freelancer wallet
    wallet.balance -= amount;
    await wallet.save();

    // Create transaction record
    const Transaction = require('../models/Transaction');
    const transaction = new Transaction({
      freelancerId: req.user._id,
      amount: amount,
      type: 'commission_payment',
      status: 'completed',
      description: `Commission payment - ₹${amount}`,
      paymentMethod: paymentMethod,
      referenceId: `COMM_PAY_${Date.now()}`,
      completedAt: new Date()
    });
    await transaction.save();

    // Get updated ledger
    const updatedLedger = await CommissionLedger.find({
      freelancerId: req.user._id
    })
    .populate('jobId', 'title amount')
    .sort({ createdAt: -1 });

    const { totalDue: newTotalDue } = await CommissionLedger.getTotalDue(req.user._id);
    const canWork = await CommissionLedger.canFreelancerWork(req.user._id);

    res.json({
      success: true,
      message: `Successfully paid ₹${amount} towards commission`,
      data: {
        amountPaid: amount,
        processedEntries,
        updatedLedger,
        totalDue: newTotalDue,
        canWork,
        transaction
      }
    });

  } catch (error) {
    console.error('Clear commission due error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear commission due'
    });
  }
});

// Check if freelancer can work (threshold check)
router.get('/can-work', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const CommissionLedger = require('../models/CommissionLedger');
    
    const canWork = await CommissionLedger.canFreelancerWork(req.user._id);
    const { totalDue } = await CommissionLedger.getTotalDue(req.user._id);

    res.json({
      success: true,
      data: {
        canWork,
        totalDue,
        threshold: 700,
        isOverThreshold: totalDue >= 700,
        message: canWork ? 
          'You can continue working' : 
          `You have ₹${totalDue} in commission dues. Please clear dues to continue working.`
      }
    });
  } catch (error) {
    console.error('Check can work error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check work eligibility'
    });
  }
});

// Test endpoint to create freelancer profile without documents (for testing only)
router.post('/profile/test',
  auth,
  roleAuth('freelancer'),
  validationRules.freelancerProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        address,
        pincode
      } = req.body;

      let profile = await FreelancerProfile.findOne({ userId: req.user._id });

      if (profile) {
        // Update existing profile
        Object.assign(profile, {
          fullName,
          dateOfBirth,
          gender,
          address,
          pincode,
          isProfileComplete: true,
          verificationStatus: 'approved' // Auto-approve for testing
        });
      } else {
        // Create new profile
        profile = new FreelancerProfile({
          userId: req.user._id,
          freelancerId: 'TEST' + Date.now().toString().slice(-6),
          fullName,
          dateOfBirth,
          gender,
          address,
          pincode,
          isProfileComplete: true,
          verificationStatus: 'approved' // Auto-approve for testing
        });
      }

      await profile.save();

      res.json({
        success: true,
        message: 'Test profile created successfully',
        data: { 
          profile,
          verificationStatus: 'approved',
          message: 'Test profile created and auto-approved for testing purposes.'
        }
      });
    } catch (error) {
      console.error('Test profile creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test profile'
      });
    }
  }
);

module.exports = router;
