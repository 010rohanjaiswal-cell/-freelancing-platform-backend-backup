const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type !== 'withdrawal';
    }
  },
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['payment', 'withdrawal', 'refund', 'commission', 'commission_payment'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  referenceId: {
    type: String,
    unique: true
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'bank_transfer', 'upi', 'card', 'phonepe', 'gateway', 'cash'],
    default: 'wallet'
  },
  gatewayTransactionId: {
    type: String
  },
  gatewayOrderId: {
    type: String
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  failureReason: {
    type: String
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate reference ID
transactionSchema.pre('save', function(next) {
  if (!this.referenceId) {
    this.referenceId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Indexes for efficient queries
transactionSchema.index({ clientId: 1, createdAt: -1 });
transactionSchema.index({ freelancerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ referenceId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
