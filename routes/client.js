const express = require('express');
const router = express.Router();
const ClientProfile = require('../models/ClientProfile');
const Job = require('../models/Job');
const Offer = require('../models/Offer');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const FreelancerProfile = require('../models/FreelancerProfile');
const { validationRules, handleValidationErrors } = require('../utils/validation');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { uploadProfilePhoto, handleUploadError } = require('../middleware/upload');

// Get client profile
router.get('/profile', auth, roleAuth('client'), async (req, res) => {
  try {
    const profile = await ClientProfile.findOne({ userId: req.user._id })
      .populate('userId', 'phone role');

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

// Create/Update client profile
router.post('/profile',
  auth,
  roleAuth('client'),
  uploadProfilePhoto,
  handleUploadError,
  validationRules.clientProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        address
      } = req.body;

      let profile = await ClientProfile.findOne({ userId: req.user._id });

      if (profile) {
        // Update existing profile
        Object.assign(profile, {
          fullName,
          dateOfBirth,
          gender,
          address,
          isProfileComplete: true
        });
      } else {
        // Create new profile
        profile = new ClientProfile({
          userId: req.user._id,
          fullName,
          dateOfBirth,
          gender,
          address,
          isProfileComplete: true
        });
      }

      // Handle profile photo upload
      if (req.file) {
        profile.profilePhoto = req.file.filename;
      }

      await profile.save();

      res.json({
        success: true,
        message: 'Profile saved successfully',
        data: { profile }
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

// Post a new job
router.post('/jobs',
  auth,
  roleAuth('client'),
  validationRules.job,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if profile is complete
      const profile = await ClientProfile.findOne({ userId: req.user._id });
      if (!profile || !profile.isProfileComplete) {
        return res.status(400).json({
          success: false,
          message: 'Please complete your profile before posting jobs'
        });
      }

      const {
        title,
        description,
        amount,
        numberOfPeople,
        address,
        genderPreference = 'any'
      } = req.body;

      const job = new Job({
        clientId: req.user._id,
        title,
        description,
        amount,
        numberOfPeople,
        address,
        genderPreference
      });

      await job.save();

      // Update client stats
      profile.totalJobsPosted += 1;
      await profile.save();

      res.json({
        success: true,
        message: 'Job posted successfully',
        data: { job }
      });
    } catch (error) {
      console.error('Post job error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post job'
      });
    }
  }
);

// Get client's posted jobs
router.get('/jobs', auth, roleAuth('client'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      clientId: req.user._id
    };

    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate('freelancerId', 'phone')
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
    console.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs'
    });
  }
});

// Get offers for a specific job
router.get('/jobs/:jobId/offers', auth, roleAuth('client'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    // Verify job belongs to client
    const job = await Job.findOne({
      _id: jobId,
      clientId: req.user._id
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const query = { jobId };
    if (status) {
      query.status = status;
    }

    const offers = await Offer.find(query)
      .populate('freelancerId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Offer.countDocuments(query);

    res.json({
      success: true,
      data: {
        offers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get offers'
    });
  }
});

// Accept/Reject offer
router.post('/offers/:offerId/respond',
  auth,
  roleAuth('client'),
  async (req, res) => {
    try {
      const { offerId } = req.params;
      const { action, responseMessage } = req.body; // action: 'accept' or 'reject'

      const offer = await Offer.findById(offerId)
        .populate('jobId')
        .populate('freelancerId');

      if (!offer || offer.jobId.clientId.toString() !== req.user._id.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Offer not found'
        });
      }

      if (offer.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Offer has already been responded to'
        });
      }

      if (action === 'accept') {
        // Accept offer
        offer.status = 'accepted';
        offer.respondedAt = new Date();
        offer.responseMessage = responseMessage;

        // Update job
        const job = offer.jobId;
        job.freelancerId = offer.freelancerId._id;
        job.status = 'assigned';
        job.assignedAt = new Date();
        await job.save();

        // Reject all other offers for this job
        await Offer.updateMany(
          {
            jobId: offer.jobId._id,
            _id: { $ne: offerId },
            status: 'pending'
          },
          {
            status: 'rejected',
            respondedAt: new Date(),
            responseMessage: 'Another offer was accepted'
          }
        );
      } else if (action === 'reject') {
        // Reject offer
        offer.status = 'rejected';
        offer.respondedAt = new Date();
        offer.responseMessage = responseMessage;
      }

      await offer.save();

      res.json({
        success: true,
        message: `Offer ${action}ed successfully`,
        data: { offer }
      });
    } catch (error) {
      console.error('Respond to offer error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to respond to offer'
      });
    }
  }
);

// Pay for completed job using PhonePe
router.post('/jobs/:jobId/pay-phonepe',
  auth,
  roleAuth('client'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        clientId: req.user._id,
        status: 'waiting_for_payment'
      }).populate('freelancerId');

      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found or not ready for payment'
        });
      }

      // Get client profile for payment details
      const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
      if (!clientProfile) {
        return res.status(400).json({
          success: false,
          message: 'Client profile not found'
        });
      }

      // Generate unique order ID
      const orderId = `ORDER_${jobId}_${Date.now()}`;

      // Create payment request
      const paymentData = {
        amount: job.amount,
        orderId: orderId,
        customerPhone: req.user.phone,
        customerName: clientProfile.fullName,
        description: `Payment for job: ${job.title}`,
        jobId: jobId
      };

      const PaymentGateway = require('../config/paymentGateway');
      const paymentResult = await PaymentGateway.createPaymentRequest(paymentData);

      if (paymentResult.success) {
        // Store payment details in job
        job.paymentOrderId = orderId;
        job.paymentStatus = 'initiated';
        await job.save();

        res.json({
          success: true,
          message: 'Payment initiated successfully',
          data: {
            paymentUrl: paymentResult.paymentUrl,
            orderId: orderId,
            amount: job.amount,
            jobId: jobId
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to initiate payment',
          error: paymentResult.error
        });
      }

    } catch (error) {
      console.error('PhonePe payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment'
      });
    }
  }
);

// Pay for completed job (Legacy wallet payment)
router.post('/jobs/:jobId/pay',
  auth,
  roleAuth('client'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        clientId: req.user._id,
        status: 'work_done'
      }).populate('freelancerId');

      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found or not ready for payment'
        });
      }

      // Get or create client wallet
      let clientWallet = await Wallet.findOne({ userId: req.user._id });
      if (!clientWallet) {
        clientWallet = new Wallet({ userId: req.user._id });
        await clientWallet.save();
      }

      // Get or create freelancer wallet
      let freelancerWallet = await Wallet.findOne({ userId: job.freelancerId._id });
      if (!freelancerWallet) {
        freelancerWallet = new Wallet({ userId: job.freelancerId._id });
        await freelancerWallet.save();
      }

      // Create payment transaction
      const transaction = new Transaction({
        jobId: job._id,
        clientId: req.user._id,
        freelancerId: job.freelancerId._id,
        amount: job.amount,
        type: 'payment',
        status: 'completed',
        description: `Payment for job: ${job.title}`,
        paymentMethod: 'wallet',
        completedAt: new Date()
      });

      await transaction.save();

      // Update job status
      job.status = 'completed';
      job.paymentCompletedAt = new Date();
      await job.save();

      // Process commission and update wallets
      const commissionService = require('../utils/commissionService');
      const commissionResult = await commissionService.processCommission({
        jobId: job._id,
        clientId: req.user._id,
        freelancerId: job.freelancerId._id,
        amount: job.amount,
        transactionId: transaction.referenceId,
        paymentMethod: 'wallet'
      });

      if (!commissionResult.success) {
        console.error('Commission processing failed:', commissionResult.error);
      }

      // Update freelancer stats with commission-adjusted amount
      const freelancerProfile = await FreelancerProfile.findOne({ userId: job.freelancerId._id });
      if (freelancerProfile) {
        freelancerProfile.totalJobs += 1;
        freelancerProfile.completedJobs += 1;
        freelancerProfile.totalEarnings += commissionResult.data.commissionDetails.freelancerAmount;
        await freelancerProfile.save();
      }

      // Update client stats
      const clientProfile = await ClientProfile.findOne({ userId: req.user._id });
      if (clientProfile) {
        clientProfile.totalSpent += job.amount;
        await clientProfile.save();
      }

      res.json({
        success: true,
        message: 'Payment completed successfully',
        data: { transaction, job }
      });
    } catch (error) {
      console.error('Payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process payment'
      });
    }
  }
);

// Search freelancers by ID
router.get('/search/freelancers', auth, roleAuth('client'), async (req, res) => {
  try {
    const { freelancerId, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (freelancerId) {
      query.freelancerId = freelancerId;
    }

    const freelancers = await FreelancerProfile.find(query)
      .populate('userId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FreelancerProfile.countDocuments(query);

    res.json({
      success: true,
      data: {
        freelancers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search freelancers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search freelancers'
    });
  }
});

// Get client's transaction history
router.get('/transactions', auth, roleAuth('client'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({
      clientId: req.user._id
    })
      .populate('jobId', 'title')
      .populate('freelancerId', 'phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({
      clientId: req.user._id
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

// Pay for completed job using Cash
router.post('/jobs/:jobId/pay-cash',
  auth,
  roleAuth('client'),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const job = await Job.findOne({
        _id: jobId,
        clientId: req.user._id,
        status: 'waiting_for_payment'
      }).populate('freelancerId');

      if (!job) {
        return res.status(400).json({
          success: false,
          message: 'Job not found or not ready for payment'
        });
      }

      // Update job status to paid (cash payment)
      job.status = 'paid';
      job.paymentStatus = 'completed';
      job.paymentMethod = 'cash';
      job.paidAt = new Date();
      await job.save();

      // Create transaction record for cash payment
      const Transaction = require('../models/Transaction');
      const transaction = new Transaction({
        jobId: job._id,
        freelancerId: job.freelancerId._id,
        clientId: job.clientId,
        amount: job.amount,
        type: 'payment',
        status: 'completed',
        description: `Cash payment for job: ${job.title}`,
        paymentMethod: 'cash',
        transactionId: `CASH_${job._id}_${Date.now()}`,
        completedAt: new Date()
      });
      await transaction.save();

      // Calculate commission (10% of job amount)
      const commissionAmount = Math.round(job.amount * 0.1);
      const freelancerAmount = job.amount - commissionAmount;

      // Create commission ledger entry for freelancer
      const CommissionLedger = require('../models/CommissionLedger');
      const ledgerEntry = new CommissionLedger({
        freelancerId: job.freelancerId._id,
        jobId: job._id,
        amount: commissionAmount,
        type: 'commission_due',
        description: `Commission due for cash payment - Job: ${job.title}`,
        status: 'pending'
      });
      await ledgerEntry.save();

      // Update freelancer wallet with net amount (after commission)
      let freelancerWallet = await Wallet.findOne({ userId: job.freelancerId._id });
      if (!freelancerWallet) {
        freelancerWallet = new Wallet({ userId: job.freelancerId._id });
      }
      freelancerWallet.balance += freelancerAmount;
      await freelancerWallet.save();

      // Update freelancer stats
      const FreelancerProfile = require('../models/FreelancerProfile');
      const profile = await FreelancerProfile.findOne({ userId: job.freelancerId._id });
      if (profile) {
        profile.completedJobs += 1;
        profile.totalEarnings += freelancerAmount;
        await profile.save();
      }

      res.json({
        success: true,
        message: 'Cash payment processed successfully',
        data: {
          job: job,
          transaction: transaction,
          commissionAmount: commissionAmount,
          freelancerAmount: freelancerAmount,
          ledgerEntry: ledgerEntry
        }
      });

    } catch (error) {
      console.error('Cash payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process cash payment'
      });
    }
  }
);

// PhonePe payment callback
router.post('/payment/callback',
  async (req, res) => {
    try {
      const callbackData = req.body;
      
      const PaymentGateway = require('../config/paymentGateway');
      const callbackResult = PaymentGateway.processCallback(callbackData);

      if (callbackResult.success) {
        const { transactionId, orderId, amount, status } = callbackResult.data;
        
        // Find job by order ID
        const job = await Job.findOne({ paymentOrderId: orderId });
        
        if (job && status === 'success') {
          // Update job status to paid
          job.status = 'paid';
          job.paymentStatus = 'completed';
          job.paymentTransactionId = transactionId;
          job.paidAt = new Date();
          await job.save();

          // Create transaction record
          const Transaction = require('../models/Transaction');
          const transaction = new Transaction({
            jobId: job._id,
            freelancerId: job.freelancerId,
            clientId: job.clientId,
            amount: amount,
            type: 'payment',
            status: 'completed',
            description: `Payment for job: ${job.title}`,
            paymentMethod: 'phonepe',
            transactionId: transactionId
          });
          await transaction.save();

          // Update freelancer wallet
          let freelancerWallet = await Wallet.findOne({ userId: job.freelancerId });
          if (!freelancerWallet) {
            freelancerWallet = new Wallet({ userId: job.freelancerId });
          }
          freelancerWallet.balance += amount;
          await freelancerWallet.save();

          console.log(`Payment successful for job ${job._id}, amount: ${amount}`);
        }
      }

      // Always respond with success to PhonePe
      res.json({ success: true });

    } catch (error) {
      console.error('Payment callback error:', error);
      res.status(500).json({ success: false });
    }
  }
);

// Test endpoint to create client profile (for testing only)
router.post('/profile/test',
  auth,
  roleAuth('client'),
  validationRules.clientProfile,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        dateOfBirth,
        gender,
        address
      } = req.body;

      let profile = await ClientProfile.findOne({ userId: req.user._id });

      if (profile) {
        // Update existing profile
        Object.assign(profile, {
          fullName,
          dateOfBirth,
          gender,
          address,
          isProfileComplete: true
        });
      } else {
        // Create new profile
        profile = new ClientProfile({
          userId: req.user._id,
          fullName,
          dateOfBirth,
          gender,
          address,
          isProfileComplete: true
        });
      }

      await profile.save();

      res.json({
        success: true,
        message: 'Test client profile created successfully',
        data: { profile }
      });
    } catch (error) {
      console.error('Test client profile creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test client profile'
      });
    }
  }
);

module.exports = router;
