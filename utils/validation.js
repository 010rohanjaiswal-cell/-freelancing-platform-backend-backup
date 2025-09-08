const { body, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  phone: [
    body('phone')
      .isMobilePhone('en-IN')
      .withMessage('Please enter a valid Indian mobile number')
  ],
  
  otp: [
    body('otp')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('OTP must be 6 digits')
  ],
  
  freelancerProfile: [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .custom((value) => {
        // Check if full name contains at least 2 words (first and last name)
        const words = value.trim().split(/\s+/);
        if (words.length < 2) {
          throw new Error('Please enter your full name (first and last name)');
        }
        // Check if all words contain only letters
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(value)) {
          throw new Error('Full name should contain only letters');
        }
        return true;
      }),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Please enter a valid date of birth')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 18) {
          throw new Error('You must be at least 18 years old');
        }
        if (age > 100) {
          throw new Error('Please enter a valid date of birth');
        }
        return true;
      }),
    body('gender')
      .isIn(['male', 'female'])
      .withMessage('Please select your gender (Male or Female)'),
    body('address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Address must be between 10 and 200 characters'),
    body('pincode')
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Please enter a valid 6-digit pincode')
  ],
  
  clientProfile: [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please enter a valid date of birth'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other'])
      .withMessage('Please select a valid gender')
  ],
  
  job: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Job title must be between 5 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Job description must be between 10 and 1000 characters'),
    body('amount')
      .isFloat({ min: 1 })
      .withMessage('Amount must be a positive number'),
    body('numberOfPeople')
      .isInt({ min: 1, max: 10 })
      .withMessage('Number of people must be between 1 and 10'),
    body('jobType')
      .isIn(['delivery','plumbing','electrical','driver','mechanic','cleaning','laundry','cooking','courier','care_taker','tailoring','barber','painting','others'])
      .withMessage('Please select a valid job type'),
    body('genderPreference')
      .optional()
      .isIn(['male', 'female', 'any'])
      .withMessage('Please select a valid gender preference')
  ],
  
  offer: [
    body('offeredAmount')
      .isFloat({ min: 1 })
      .withMessage('Offered amount must be a positive number'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Message must not exceed 500 characters')
  ],
  
  withdrawal: [
    body('amount')
      .isFloat({ min: 100 })
      .withMessage('Minimum withdrawal amount is ₹100'),
    body('bankDetails.accountNumber')
      .isLength({ min: 9, max: 18 })
      .isNumeric()
      .withMessage('Please enter a valid account number'),
    body('bankDetails.ifscCode')
      .isLength({ min: 11, max: 11 })
      .isUppercase()
      .withMessage('Please enter a valid IFSC code'),
    body('bankDetails.accountHolderName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Account holder name must be between 2 and 50 characters')
  ],
  
  // Firebase authentication validation
  firebaseToken: [
    body('idToken')
      .notEmpty()
      .withMessage('Firebase ID token is required'),
    body('role')
      .optional()
      .isIn(['client', 'freelancer'])
      .withMessage('Role must be either client or freelancer')
  ],
  
  authMethod: [
    body('authMethod')
      .isIn(['otp', 'firebase', 'email'])
      .withMessage('Authentication method must be otp, firebase, or email')
  ],
  
  adminLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  
  refund: [
    body('reason')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Refund reason must be between 10 and 500 characters')
  ],
  
  // Verification form validation
  verificationForm: [
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
      .custom((value) => {
        // Check if full name contains at least 2 words (first and last name)
        const words = value.trim().split(/\s+/);
        if (words.length < 2) {
          throw new Error('Please enter your full name (first and last name)');
        }
        // Check if all words contain only letters
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(value)) {
          throw new Error('Full name should contain only letters');
        }
        return true;
      }),
    body('dateOfBirth')
      .isISO8601()
      .withMessage('Please enter a valid date of birth')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 18) {
          throw new Error('You must be at least 18 years old');
        }
        if (age > 100) {
          throw new Error('Please enter a valid date of birth');
        }
        return true;
      }),
    body('gender')
      .isIn(['male', 'female'])
      .withMessage('Please select your gender (Male or Female)'),
    body('address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Address must be between 10 and 200 characters'),
    body('pincode')
      .matches(/^[1-9][0-9]{5}$/)
      .withMessage('Please enter a valid 6-digit pincode')
  ]
};

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// Custom validators
const customValidators = {
  isValidPhone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  },
  
  isValidPincode: (pincode) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  },
  
  isValidIFSC: (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc);
  }
};

module.exports = {
  validationRules,
  handleValidationErrors,
  customValidators
};
