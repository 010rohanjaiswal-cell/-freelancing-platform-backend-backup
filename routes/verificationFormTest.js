const express = require('express');
const router = express.Router();
const FreelancerProfile = require('../models/FreelancerProfile');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');

// Validation helper functions
const validateFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, message: 'Please enter a valid full name.' };
  }
  
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) {
    return { valid: false, message: 'Please enter a valid full name.' };
  }
  
  const isValid = words.every(word => /^[a-zA-Z]+$/.test(word));
  if (!isValid) {
    return { valid: false, message: 'Please enter a valid full name.' };
  }
  
  return { valid: true };
};

const validateDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) {
    return { valid: false, message: 'Please select your date of birth.' };
  }
  
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  
  if (age < 18 || age > 100) {
    return { valid: false, message: 'You must be between 18 and 100 years old.' };
  }
  
  return { valid: true };
};

const validateGender = (gender) => {
  if (!gender || !['male', 'female', 'other'].includes(gender)) {
    return { valid: false, message: 'Please select your gender.' };
  }
  return { valid: true };
};

const validateAddress = (address) => {
  if (!address || address.trim().length < 10) {
    return { valid: false, message: 'Please enter a valid address.' };
  }
  return { valid: true };
};

const validatePincode = (pincode) => {
  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return { valid: false, message: 'Please enter a valid 6-digit pincode.' };
  }
  return { valid: true };
};

const validateDocuments = (documents) => {
  const requiredDocs = ['aadhaarFront', 'aadhaarBack', 'panFront'];
  const missingDocs = requiredDocs.filter(doc => !documents[doc]);
  
  if (missingDocs.length > 0) {
    return { 
      valid: false, 
      message: 'Please upload required document.',
      missingDocuments: missingDocs
    };
  }
  return { valid: true };
};

// Test verification form submission
router.post('/submit-verification', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      address,
      pincode,
      documents = {}
    } = req.body;

    // Validate all fields
    const validations = {
      fullName: validateFullName(fullName),
      dateOfBirth: validateDateOfBirth(dateOfBirth),
      gender: validateGender(gender),
      address: validateAddress(address),
      pincode: validatePincode(pincode),
      documents: validateDocuments(documents)
    };

    // Check if any validation failed
    const failedValidations = Object.entries(validations)
      .filter(([field, result]) => !result.valid)
      .map(([field, result]) => ({ field, message: result.message }));

    if (failedValidations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: failedValidations
      });
    }

    // Check if profile already exists
    let profile = await FreelancerProfile.findOne({ userId: req.user._id });

    if (profile) {
      // Update existing profile
      profile.fullName = fullName;
      profile.dateOfBirth = new Date(dateOfBirth);
      profile.gender = gender;
      profile.address = {
        street: address,
        pincode: pincode,
        country: 'India'
      };
      profile.documents = {
        aadhaarFront: documents.aadhaarFront || profile.documents?.aadhaarFront,
        aadhaarBack: documents.aadhaarBack || profile.documents?.aadhaarBack,
        panFront: documents.panFront || profile.documents?.panFront,
        drivingLicenseFront: documents.drivingLicenseFront || profile.documents?.drivingLicenseFront,
        drivingLicenseBack: documents.drivingLicenseBack || profile.documents?.drivingLicenseBack
      };
      profile.verificationStatus = 'pending';
      profile.rejectionReason = null;
      profile.isProfileComplete = true;
      profile.updatedAt = new Date();
    } else {
      // Create new profile
      profile = new FreelancerProfile({
        userId: req.user._id,
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        address: {
          street: address,
          pincode: pincode,
          country: 'India'
        },
        documents: {
          aadhaarFront: documents.aadhaarFront,
          aadhaarBack: documents.aadhaarBack,
          panFront: documents.panFront,
          drivingLicenseFront: documents.drivingLicenseFront,
          drivingLicenseBack: documents.drivingLicenseBack
        },
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
          submittedAt: profile.updatedAt
        },
        nextAction: 'show_pending_modal',
        modalMessage: 'Your verification is pending. Please wait for approval.'
      }
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit verification form',
      error: error.message
    });
  }
});

// Test form validation only
router.post('/validate-form', auth, roleAuth('freelancer'), async (req, res) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      address,
      pincode,
      documents = {}
    } = req.body;

    // Validate all fields
    const validations = {
      fullName: validateFullName(fullName),
      dateOfBirth: validateDateOfBirth(dateOfBirth),
      gender: validateGender(gender),
      address: validateAddress(address),
      pincode: validatePincode(pincode),
      documents: validateDocuments(documents)
    };

    // Check if any validation failed
    const failedValidations = Object.entries(validations)
      .filter(([field, result]) => !result.valid)
      .map(([field, result]) => ({ field, message: result.message }));

    const isValid = failedValidations.length === 0;

    res.json({
      success: true,
      data: {
        isValid,
        validations,
        errors: failedValidations,
        canSubmit: isValid
      }
    });
  } catch (error) {
    console.error('Validate form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate form',
      error: error.message
    });
  }
});

// Get form validation rules for frontend
router.get('/validation-rules', async (req, res) => {
  try {
    const rules = {
      fullName: {
        required: true,
        type: 'text',
        validation: 'Must be full name (letters only, min 2 words)',
        errorMessage: 'Please enter a valid full name.'
      },
      dateOfBirth: {
        required: true,
        type: 'date',
        validation: 'Must be selected and user must be 18-100 years old',
        errorMessage: 'Please select your date of birth.'
      },
      gender: {
        required: true,
        type: 'dropdown',
        options: ['male', 'female', 'other'],
        validation: 'Must be selected',
        errorMessage: 'Please select your gender.'
      },
      address: {
        required: true,
        type: 'textarea',
        validation: 'Must be at least 10 characters',
        errorMessage: 'Please enter a valid address.'
      },
      pincode: {
        required: true,
        type: 'number',
        validation: 'Must be exactly 6 digits',
        errorMessage: 'Please enter a valid 6-digit pincode.'
      },
      documents: {
        required: ['aadhaarFront', 'aadhaarBack', 'panFront'],
        optional: ['drivingLicenseFront', 'drivingLicenseBack'],
        validation: 'Required documents must be uploaded',
        errorMessage: 'Please upload required document.'
      }
    };

    res.json({
      success: true,
      data: { rules }
    });
  } catch (error) {
    console.error('Get validation rules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get validation rules',
      error: error.message
    });
  }
});

module.exports = router;
