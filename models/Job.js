const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  genderPreference: {
    type: String,
    enum: ['male', 'female', 'any'],
    default: 'any'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'work_done', 'waiting_for_payment', 'paid', 'completed', 'cancelled'],
    default: 'open'
  },
  assignedAt: {
    type: Date
  },
  workCompletedAt: {
    type: Date
  },
  paymentOrderId: {
    type: String
  },
  paymentStatus: {
    type: String,
    enum: ['initiated', 'completed', 'failed'],
    default: undefined
  },
  paymentTransactionId: {
    type: String
  },
  paidAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'cash', 'wallet', 'bank_transfer'],
    default: undefined
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, {
  timestamps: true
});

// Index for location-based queries
jobSchema.index({ location: '2dsphere' });

// Index for status-based queries
jobSchema.index({ status: 1, isActive: 1 });

module.exports = mongoose.model('Job', jobSchema);
