const mongoose = require('mongoose');

const freelancerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerId: {
    type: String,
    unique: true,
    sparse: true // Allows null/undefined values
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true,
    match: /^[1-9][0-9]{5}$/
  },
  profilePhoto: {
    type: String // URL to uploaded image
  },
  documents: {
    aadhaarFront: String,
    aadhaarBack: String,
    drivingLicenseFront: String,
    drivingLicenseBack: String,
    panFront: String
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'resubmitted'],
    default: 'pending'
  },
  rejectionReason: {
    type: String
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalJobs: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate freelancer ID when approved
freelancerProfileSchema.pre('save', async function(next) {
  if (this.verificationStatus === 'approved' && !this.freelancerId) {
    try {
      // Generate a long, unique freelancer ID
      // Format: FL + YYYY + MM + 6-digit sequential number
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      
      // Get the count of approved freelancers to generate sequential number
      const count = await this.constructor.countDocuments({ 
        verificationStatus: 'approved',
        freelancerId: { $exists: true }
      });
      
      // Generate 6-digit sequential number (000001 to 999999)
      const sequentialNumber = (count + 1).toString().padStart(6, '0');
      
      this.freelancerId = `FL${year}${month}${sequentialNumber}`;
    } catch (error) {
      // Fallback to timestamp-based ID if count fails
      const timestamp = Date.now().toString();
      this.freelancerId = `FL${timestamp}`;
    }
  }
  next();
});

module.exports = mongoose.model('FreelancerProfile', freelancerProfileSchema);
