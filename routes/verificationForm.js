const express = require('express');
const router = express.Router();
const FreelancerProfile = require('../models/FreelancerProfile');
const { validationRules, handleValidationErrors } = require('../utils/validation');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Validate verification form data
router.post('/validate-form', 
  auth, 
  roleAuth('freelancer'),
  validationRules.verificationForm,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fullName, dateOfBirth, gender, address, pincode } = req.body;
      
      // Additional business logic validations
      const errors = [];
      
      // Check if user already has a profile
      const existingProfile = await FreelancerProfile.findOne({ userId: req.user._id });
      if (existingProfile && existingProfile.verificationStatus === 'approved') {
        errors.push({
          field: 'general',
          message: 'You already have an approved profile'
        });
      }
      
      // If there are any errors, return them
      if (errors.length > 0) {
        return res.json({
          success: true,
          data: {
            canSubmit: false,
            errors: errors
          }
        });
      }
      
      // All validations passed
      res.json({
        success: true,
        data: {
          canSubmit: true,
          errors: []
        }
      });
    } catch (error) {
      console.error('Form validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate form'
      });
    }
  }
);

// Submit verification form
router.post('/submit-verification',
  auth,
  roleAuth('freelancer'),
  validationRules.verificationForm,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { fullName, dateOfBirth, gender, address, pincode } = req.body;
      
      // Check if user already has a profile
      const existingProfile = await FreelancerProfile.findOne({ userId: req.user._id });
      
      if (existingProfile) {
        if (existingProfile.verificationStatus === 'approved') {
          return res.status(400).json({
            success: false,
            message: 'You already have an approved profile'
          });
        }
        
        if (existingProfile.verificationStatus === 'pending' || existingProfile.verificationStatus === 'under_review') {
          return res.status(400).json({
            success: false,
            message: 'Your profile is already under review. Please wait for admin approval.'
          });
        }
        
        if (existingProfile.verificationStatus === 'resubmitted') {
          return res.status(400).json({
            success: false,
            message: 'Your profile has been resubmitted. Please wait for admin approval.'
          });
        }
      }
      
      // Create or update profile
      let profile;
      if (existingProfile && existingProfile.verificationStatus === 'rejected') {
        // Update existing rejected profile
        profile = existingProfile;
        profile.fullName = fullName;
        profile.dateOfBirth = dateOfBirth;
        profile.gender = gender;
        profile.address = address;
        profile.pincode = pincode;
        profile.verificationStatus = 'resubmitted';
        profile.rejectionReason = null; // Clear previous rejection reason
        profile.isProfileComplete = true;
        profile.updatedAt = new Date();
      } else {
        // Create new profile
        profile = new FreelancerProfile({
          userId: req.user._id,
          fullName,
          dateOfBirth,
          gender,
          address,
          pincode,
          verificationStatus: 'pending',
          isProfileComplete: true
        });
      }
      
      await profile.save();
      
      res.json({
        success: true,
        message: 'Verification form submitted successfully. Your profile is now pending approval.',
        data: {
          profile: {
            id: profile._id,
            fullName: profile.fullName,
            verificationStatus: profile.verificationStatus,
            isProfileComplete: profile.isProfileComplete,
            submittedAt: profile.updatedAt || profile.createdAt
          },
          nextAction: profile.verificationStatus === 'pending' ? 'show_pending_modal' : 'show_resubmitted_modal',
          modalMessage: profile.verificationStatus === 'pending' 
            ? 'Your verification is pending. Please wait for approval.'
            : 'Your profile has been resubmitted for verification. Please wait for admin approval.'
        }
      });
    } catch (error) {
      console.error('Submit verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit verification form'
      });
    }
  }
);

// Get form validation status (for real-time validation)
router.get('/validation-status',
  auth,
  roleAuth('freelancer'),
  async (req, res) => {
    try {
      const { fullName, dateOfBirth, gender, address, pincode } = req.query;
      
      const errors = [];
      let canSubmit = true;
      
      // Validate full name
      if (!fullName || fullName.trim().length < 2) {
        errors.push({
          field: 'fullName',
          message: 'Full name must be between 2 and 50 characters'
        });
        canSubmit = false;
      } else {
        const words = fullName.trim().split(/\s+/);
        if (words.length < 2) {
          errors.push({
            field: 'fullName',
            message: 'Please enter your full name (first and last name)'
          });
          canSubmit = false;
        } else {
          const nameRegex = /^[a-zA-Z\s]+$/;
          if (!nameRegex.test(fullName)) {
            errors.push({
              field: 'fullName',
              message: 'Full name should contain only letters'
            });
            canSubmit = false;
          }
        }
      }
      
      // Validate date of birth
      if (!dateOfBirth) {
        errors.push({
          field: 'dateOfBirth',
          message: 'Please enter a valid date of birth'
        });
        canSubmit = false;
      } else {
        const birthDate = new Date(dateOfBirth);
        if (isNaN(birthDate.getTime())) {
          errors.push({
            field: 'dateOfBirth',
            message: 'Please enter a valid date of birth'
          });
          canSubmit = false;
        } else {
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            errors.push({
              field: 'dateOfBirth',
              message: 'You must be at least 18 years old'
            });
            canSubmit = false;
          }
          if (age > 100) {
            errors.push({
              field: 'dateOfBirth',
              message: 'Please enter a valid date of birth'
            });
            canSubmit = false;
          }
        }
      }
      
      // Validate gender
      if (!gender || !['male', 'female'].includes(gender)) {
        errors.push({
          field: 'gender',
          message: 'Please select your gender (Male or Female)'
        });
        canSubmit = false;
      }
      
      // Validate address
      if (!address || address.trim().length < 10) {
        errors.push({
          field: 'address',
          message: 'Address must be between 10 and 200 characters'
        });
        canSubmit = false;
      }
      
      // Validate pincode
      if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
        errors.push({
          field: 'pincode',
          message: 'Please enter a valid 6-digit pincode'
        });
        canSubmit = false;
      }
      
      res.json({
        success: true,
        data: {
          canSubmit,
          errors
        }
      });
    } catch (error) {
      console.error('Validation status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get validation status'
      });
    }
  }
);

module.exports = router;
