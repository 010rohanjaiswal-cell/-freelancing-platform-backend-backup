const mongoose = require('mongoose');

const commissionLedgerSchema = new mongoose.Schema({
  freelancerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['commission_due', 'commission_paid', 'commission_waived'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'waived'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    default: function() {
      // Set due date to 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  paidAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'bank_transfer', 'upi', 'cash'],
    default: null
  },
  paymentTransactionId: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
commissionLedgerSchema.index({ freelancerId: 1, status: 1 });
commissionLedgerSchema.index({ jobId: 1 });
commissionLedgerSchema.index({ dueDate: 1 });

// Virtual for checking if overdue
commissionLedgerSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && new Date() > this.dueDate;
});

// Method to mark as paid
commissionLedgerSchema.methods.markAsPaid = function(paymentMethod, transactionId) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paymentMethod = paymentMethod;
  this.paymentTransactionId = transactionId;
  return this.save();
};

// Static method to get total due amount for freelancer
commissionLedgerSchema.statics.getTotalDue = async function(freelancerId) {
  const result = await this.aggregate([
    {
      $match: {
        freelancerId: new mongoose.Types.ObjectId(freelancerId),
        status: 'pending'
      }
    },
    {
      $group: {
        _id: null,
        totalDue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { totalDue: 0, count: 0 };
};

// Static method to check if freelancer can work (threshold check)
commissionLedgerSchema.statics.canFreelancerWork = async function(freelancerId, threshold = 500) {
  const { totalDue } = await this.getTotalDue(freelancerId);
  return totalDue < threshold;
};

module.exports = mongoose.model('CommissionLedger', commissionLedgerSchema);
