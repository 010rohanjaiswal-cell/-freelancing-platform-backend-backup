#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const config = require('./config/environment');

// Import models
const User = require('./models/User');
const FreelancerProfile = require('./models/FreelancerProfile');
const Job = require('./models/Job');
const Transaction = require('./models/Transaction');
const Wallet = require('./models/Wallet');

class AdminCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async connectDB() {
    try {
      await mongoose.connect(config.database.uri, config.database.options);
      console.log(chalk.green('✅ Connected to MongoDB'));
    } catch (error) {
      console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
      process.exit(1);
    }
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log(chalk.yellow('👋 Disconnected from MongoDB'));
  }

  showWelcome() {
    console.clear();
    console.log(chalk.cyan(figlet.textSync('Admin CLI', { horizontalLayout: 'full' })));
    console.log(chalk.gray('Freelancing Platform - Admin Management Tool'));
    console.log(chalk.gray('==========================================\n'));
  }

  async showMainMenu() {
    const choices = [
      { name: '📋 View Pending Verifications', value: 'pending' },
      { name: '✅ Approve Verification', value: 'approve' },
      { name: '❌ Reject Verification', value: 'reject' },
      { name: '📊 View All Verifications', value: 'all' },
      { name: '🔄 Bulk Operations', value: 'bulk' },
      { name: '💰 Withdrawal Management', value: 'withdrawals' },
      { name: '📈 Platform Statistics', value: 'stats' },
      { name: '👥 User Management', value: 'users' },
      { name: '💼 Job Management', value: 'jobs' },
      { name: '🚪 Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: choices
    }]);

    return action;
  }

  async viewPendingVerifications() {
    console.log(chalk.blue('\n📋 Pending Verifications\n'));
    
    try {
      const profiles = await FreelancerProfile.find({
        verificationStatus: { $in: ['pending', 'resubmitted'] }
      })
      .populate('userId', 'phone createdAt')
      .sort({ createdAt: -1 });

      if (profiles.length === 0) {
        console.log(chalk.green('🎉 No pending verifications!'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Phone', 'Status', 'Submitted', 'Actions'],
        colWidths: [12, 20, 15, 12, 12, 15]
      });

      profiles.forEach(profile => {
        table.push([
          profile._id.toString().substring(0, 8) + '...',
          profile.fullName,
          profile.userId.phone,
          profile.verificationStatus,
          new Date(profile.createdAt).toLocaleDateString(),
          'View Details'
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\nTotal: ${profiles.length} pending verifications`));

    } catch (error) {
      console.error(chalk.red('Error fetching verifications:'), error.message);
    }
  }

  async viewVerificationDetails(profileId) {
    try {
      const profile = await FreelancerProfile.findById(profileId)
        .populate('userId', 'phone createdAt');

      if (!profile) {
        console.log(chalk.red('❌ Profile not found'));
        return null;
      }

      console.log(chalk.blue('\n📄 Verification Details\n'));
      console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.cyan('👤 Personal Information:'));
      console.log(`   Name: ${profile.fullName}`);
      console.log(`   Phone: ${profile.userId.phone}`);
      console.log(`   DOB: ${new Date(profile.dateOfBirth).toLocaleDateString()}`);
      console.log(`   Gender: ${profile.gender}`);
      console.log(`   Status: ${profile.verificationStatus}`);
      
      console.log(chalk.cyan('\n🏠 Address:'));
      console.log(`   Street: ${profile.address.street}`);
      console.log(`   Pincode: ${profile.address.pincode}`);
      console.log(`   Country: ${profile.address.country}`);
      
      console.log(chalk.cyan('\n📄 Documents:'));
      Object.entries(profile.documents).forEach(([key, value]) => {
        if (value) {
          console.log(`   ${key}: ${value}`);
        }
      });
      
      console.log(chalk.cyan('\n📅 Timeline:'));
      console.log(`   Created: ${new Date(profile.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(profile.updatedAt).toLocaleString()}`);
      
      if (profile.rejectionReason) {
        console.log(chalk.red(`\n❌ Rejection Reason: ${profile.rejectionReason}`));
      }
      
      console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      return profile;
    } catch (error) {
      console.error(chalk.red('Error fetching profile details:'), error.message);
      return null;
    }
  }

  async approveVerification() {
    console.log(chalk.blue('\n✅ Approve Verification\n'));
    
    const { profileId } = await inquirer.prompt([{
      type: 'input',
      name: 'profileId',
      message: 'Enter Profile ID to approve:',
      validate: input => input.length > 0 || 'Profile ID is required'
    }]);

    const profile = await this.viewVerificationDetails(profileId);
    if (!profile) return;

    if (profile.verificationStatus === 'approved') {
      console.log(chalk.yellow('⚠️  This verification is already approved'));
      return;
    }

    const { freelancerId } = await inquirer.prompt([{
      type: 'input',
      name: 'freelancerId',
      message: 'Enter Freelancer ID (e.g., FL2025001001):',
      validate: input => {
        if (input.length < 8) return 'Freelancer ID must be at least 8 characters long';
        if (!/^FL\d{8,}$/.test(input)) return 'Freelancer ID must start with FL followed by at least 8 digits';
        return true;
      }
    }]);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Approve verification for ${profile.fullName} with ID ${freelancerId}?`,
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Approval cancelled'));
      return;
    }

    try {
      // Check if freelancer ID already exists
      const existingProfile = await FreelancerProfile.findOne({ freelancerId });
      if (existingProfile) {
        console.log(chalk.red(`❌ Freelancer ID ${freelancerId} already exists`));
        return;
      }

      // Update profile
      profile.freelancerId = freelancerId;
      profile.verificationStatus = 'approved';
      await profile.save();

      // Update user verification status
      await User.findByIdAndUpdate(profile.userId._id, {
        isVerified: true
      });

      console.log(chalk.green(`✅ Verification approved! Freelancer ID: ${freelancerId}`));
      
    } catch (error) {
      console.error(chalk.red('Error approving verification:'), error.message);
    }
  }

  async rejectVerification() {
    console.log(chalk.blue('\n❌ Reject Verification\n'));
    
    const { profileId } = await inquirer.prompt([{
      type: 'input',
      name: 'profileId',
      message: 'Enter Profile ID to reject:',
      validate: input => input.length > 0 || 'Profile ID is required'
    }]);

    const profile = await this.viewVerificationDetails(profileId);
    if (!profile) return;

    if (profile.verificationStatus === 'rejected') {
      console.log(chalk.yellow('⚠️  This verification is already rejected'));
      return;
    }

    const { rejectionReason } = await inquirer.prompt([{
      type: 'input',
      name: 'rejectionReason',
      message: 'Enter rejection reason:',
      validate: input => input.length > 0 || 'Rejection reason is required'
    }]);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Reject verification for ${profile.fullName}?`,
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Rejection cancelled'));
      return;
    }

    try {
      profile.verificationStatus = 'rejected';
      profile.rejectionReason = rejectionReason;
      profile.freelancerId = null; // Remove freelancer ID if it exists
      await profile.save();

      console.log(chalk.red(`❌ Verification rejected: ${rejectionReason}`));
      
    } catch (error) {
      console.error(chalk.red('Error rejecting verification:'), error.message);
    }
  }

  async bulkOperations() {
    console.log(chalk.blue('\n🔄 Bulk Operations\n'));
    
    const { operation } = await inquirer.prompt([{
      type: 'list',
      name: 'operation',
      message: 'Select bulk operation:',
      choices: [
        { name: '✅ Bulk Approve', value: 'bulk_approve' },
        { name: '❌ Bulk Reject', value: 'bulk_reject' },
        { name: '📊 View Statistics', value: 'stats' }
      ]
    }]);

    switch (operation) {
      case 'bulk_approve':
        await this.bulkApprove();
        break;
      case 'bulk_reject':
        await this.bulkReject();
        break;
      case 'stats':
        await this.showVerificationStats();
        break;
    }
  }

  async bulkApprove() {
    try {
      const profiles = await FreelancerProfile.find({
        verificationStatus: { $in: ['pending', 'resubmitted'] }
      }).populate('userId', 'phone');

      if (profiles.length === 0) {
        console.log(chalk.green('🎉 No pending verifications to approve!'));
        return;
      }

      console.log(chalk.yellow(`Found ${profiles.length} pending verifications`));
      
      const { startId } = await inquirer.prompt([{
        type: 'input',
        name: 'startId',
        message: 'Enter starting freelancer ID (e.g., FL2025001001):',
        default: 'FL2025001001',
        validate: input => {
          if (input.length < 8) return 'Freelancer ID must be at least 8 characters long';
          if (!/^FL\d{8,}$/.test(input)) return 'Freelancer ID must start with FL followed by at least 8 digits';
          return true;
        }
      }]);

      const startNumber = parseInt(startId.replace('FL', ''));
      const endId = `FL${startNumber + profiles.length - 1}`;

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Approve ${profiles.length} verifications with IDs ${startId} to ${endId}?`,
        default: false
      }]);

      if (!confirm) {
        console.log(chalk.yellow('❌ Bulk approval cancelled'));
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < profiles.length; i++) {
        try {
          const profile = profiles[i];
          const freelancerId = `FL${startNumber + i}`;
          
          profile.freelancerId = freelancerId;
          profile.verificationStatus = 'approved';
          await profile.save();

          await User.findByIdAndUpdate(profile.userId._id, {
            isVerified: true
          });

          successCount++;
          console.log(chalk.green(`✅ Approved ${profile.fullName} - ${freelancerId}`));
          
        } catch (error) {
          errorCount++;
          console.log(chalk.red(`❌ Failed to approve ${profiles[i].fullName}: ${error.message}`));
        }
      }

      console.log(chalk.blue(`\n📊 Bulk Approval Complete:`));
      console.log(chalk.green(`✅ Successfully approved: ${successCount}`));
      console.log(chalk.red(`❌ Failed: ${errorCount}`));

    } catch (error) {
      console.error(chalk.red('Error in bulk approval:'), error.message);
    }
  }

  async bulkReject() {
    try {
      const profiles = await FreelancerProfile.find({
        verificationStatus: { $in: ['pending', 'resubmitted'] }
      }).populate('userId', 'phone');

      if (profiles.length === 0) {
        console.log(chalk.green('🎉 No pending verifications to reject!'));
        return;
      }

      console.log(chalk.yellow(`Found ${profiles.length} pending verifications`));
      
      const { rejectionReason } = await inquirer.prompt([{
        type: 'input',
        name: 'rejectionReason',
        message: 'Enter rejection reason for all:',
        validate: input => input.length > 0 || 'Rejection reason is required'
      }]);

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Reject ${profiles.length} verifications with reason: "${rejectionReason}"?`,
        default: false
      }]);

      if (!confirm) {
        console.log(chalk.yellow('❌ Bulk rejection cancelled'));
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const profile of profiles) {
        try {
          profile.verificationStatus = 'rejected';
          profile.rejectionReason = rejectionReason;
          profile.freelancerId = null;
          await profile.save();

          successCount++;
          console.log(chalk.red(`❌ Rejected ${profile.fullName}`));
          
        } catch (error) {
          errorCount++;
          console.log(chalk.red(`❌ Failed to reject ${profile.fullName}: ${error.message}`));
        }
      }

      console.log(chalk.blue(`\n📊 Bulk Rejection Complete:`));
      console.log(chalk.red(`❌ Successfully rejected: ${successCount}`));
      console.log(chalk.red(`❌ Failed: ${errorCount}`));

    } catch (error) {
      console.error(chalk.red('Error in bulk rejection:'), error.message);
    }
  }

  async showVerificationStats() {
    try {
      const stats = await FreelancerProfile.aggregate([
        {
          $group: {
            _id: '$verificationStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      console.log(chalk.blue('\n📊 Verification Statistics\n'));
      
      const table = new Table({
        head: ['Status', 'Count'],
        colWidths: [20, 10]
      });

      const statusMap = {
        'pending': '⏳ Pending',
        'approved': '✅ Approved',
        'rejected': '❌ Rejected',
        'resubmitted': '🔄 Resubmitted',
        'under_review': '👀 Under Review'
      };

      stats.forEach(stat => {
        const status = statusMap[stat._id] || stat._id;
        table.push([status, stat.count]);
      });

      console.log(table.toString());

      const total = stats.reduce((sum, stat) => sum + stat.count, 0);
      console.log(chalk.gray(`\nTotal Verifications: ${total}`));

    } catch (error) {
      console.error(chalk.red('Error fetching statistics:'), error.message);
    }
  }

  async withdrawalManagement() {
    console.log(chalk.blue('\n💰 Withdrawal Management\n'));
    
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Select withdrawal action:',
      choices: [
        { name: '📋 View Pending Withdrawals', value: 'pending' },
        { name: '✅ Approve Withdrawal', value: 'approve' },
        { name: '❌ Reject Withdrawal', value: 'reject' },
        { name: '📊 View All Withdrawals', value: 'all' },
        { name: '📈 Withdrawal Statistics', value: 'stats' }
      ]
    }]);

    switch (action) {
      case 'pending':
        await this.viewPendingWithdrawals();
        break;
      case 'approve':
        await this.approveWithdrawal();
        break;
      case 'reject':
        await this.rejectWithdrawal();
        break;
      case 'all':
        await this.viewAllWithdrawals();
        break;
      case 'stats':
        await this.showWithdrawalStats();
        break;
    }
  }

  async viewPendingWithdrawals() {
    console.log(chalk.blue('\n📋 Pending Withdrawals\n'));
    
    try {
      const withdrawals = await Transaction.find({
        type: 'withdrawal',
        status: 'pending'
      })
      .populate('freelancerId', 'phone')
      .sort({ createdAt: -1 });

      if (withdrawals.length === 0) {
        console.log(chalk.green('🎉 No pending withdrawals!'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Freelancer', 'Amount', 'Bank Details', 'Requested', 'Actions'],
        colWidths: [12, 15, 10, 25, 12, 15]
      });

      withdrawals.forEach(withdrawal => {
        const bankInfo = `${withdrawal.bankDetails.accountNumber}\n${withdrawal.bankDetails.ifscCode}\n${withdrawal.bankDetails.accountHolderName}`;
        table.push([
          withdrawal._id.toString().substring(0, 8) + '...',
          withdrawal.freelancerId.phone,
          `₹${withdrawal.amount}`,
          bankInfo,
          new Date(withdrawal.createdAt).toLocaleDateString(),
          'Process'
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\nTotal: ${withdrawals.length} pending withdrawals`));

    } catch (error) {
      console.error(chalk.red('Error fetching withdrawals:'), error.message);
    }
  }

  async viewWithdrawalDetails(transactionId) {
    try {
      const withdrawal = await Transaction.findById(transactionId)
        .populate('freelancerId', 'phone')
        .populate('jobId', 'title');

      if (!withdrawal || withdrawal.type !== 'withdrawal') {
        console.log(chalk.red('❌ Withdrawal not found'));
        return null;
      }

      console.log(chalk.blue('\n💰 Withdrawal Details\n'));
      console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.cyan('💳 Transaction Information:'));
      console.log(`   ID: ${withdrawal._id}`);
      console.log(`   Amount: ₹${withdrawal.amount}`);
      console.log(`   Status: ${withdrawal.status}`);
      console.log(`   Reference ID: ${withdrawal.referenceId}`);
      
      console.log(chalk.cyan('\n👤 Freelancer Information:'));
      console.log(`   Phone: ${withdrawal.freelancerId.phone}`);
      
      console.log(chalk.cyan('\n🏦 Bank Details:'));
      console.log(`   Account Number: ${withdrawal.bankDetails.accountNumber}`);
      console.log(`   IFSC Code: ${withdrawal.bankDetails.ifscCode}`);
      console.log(`   Account Holder: ${withdrawal.bankDetails.accountHolderName}`);
      
      console.log(chalk.cyan('\n📅 Timeline:'));
      console.log(`   Requested: ${new Date(withdrawal.createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(withdrawal.updatedAt).toLocaleString()}`);
      
      if (withdrawal.failureReason) {
        console.log(chalk.red(`\n❌ Failure Reason: ${withdrawal.failureReason}`));
      }
      
      if (withdrawal.completedAt) {
        console.log(chalk.green(`\n✅ Completed: ${new Date(withdrawal.completedAt).toLocaleString()}`));
      }
      
      console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

      return withdrawal;
    } catch (error) {
      console.error(chalk.red('Error fetching withdrawal details:'), error.message);
      return null;
    }
  }

  async approveWithdrawal() {
    console.log(chalk.blue('\n✅ Approve Withdrawal\n'));
    
    const { transactionId } = await inquirer.prompt([{
      type: 'input',
      name: 'transactionId',
      message: 'Enter Transaction ID to approve:',
      validate: input => input.length > 0 || 'Transaction ID is required'
    }]);

    const withdrawal = await this.viewWithdrawalDetails(transactionId);
    if (!withdrawal) return;

    if (withdrawal.status === 'completed') {
      console.log(chalk.yellow('⚠️  This withdrawal is already approved'));
      return;
    }

    if (withdrawal.status !== 'pending') {
      console.log(chalk.yellow('⚠️  This withdrawal is not pending'));
      return;
    }

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Approve withdrawal of ₹${withdrawal.amount} for ${withdrawal.freelancerId.phone}?`,
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Approval cancelled'));
      return;
    }

    try {
      withdrawal.status = 'completed';
      withdrawal.completedAt = new Date();
      await withdrawal.save();

      console.log(chalk.green(`✅ Withdrawal approved! Amount: ₹${withdrawal.amount}`));
      console.log(chalk.yellow('💡 Remember to transfer the money to the freelancer\'s bank account manually.'));
      
    } catch (error) {
      console.error(chalk.red('Error approving withdrawal:'), error.message);
    }
  }

  async rejectWithdrawal() {
    console.log(chalk.blue('\n❌ Reject Withdrawal\n'));
    
    const { transactionId } = await inquirer.prompt([{
      type: 'input',
      name: 'transactionId',
      message: 'Enter Transaction ID to reject:',
      validate: input => input.length > 0 || 'Transaction ID is required'
    }]);

    const withdrawal = await this.viewWithdrawalDetails(transactionId);
    if (!withdrawal) return;

    if (withdrawal.status === 'failed') {
      console.log(chalk.yellow('⚠️  This withdrawal is already rejected'));
      return;
    }

    if (withdrawal.status !== 'pending') {
      console.log(chalk.yellow('⚠️  This withdrawal is not pending'));
      return;
    }

    const { failureReason } = await inquirer.prompt([{
      type: 'input',
      name: 'failureReason',
      message: 'Enter rejection reason:',
      validate: input => input.length > 0 || 'Rejection reason is required'
    }]);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Reject withdrawal of ₹${withdrawal.amount} for ${withdrawal.freelancerId.phone}?`,
      default: false
    }]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Rejection cancelled'));
      return;
    }

    try {
      withdrawal.status = 'failed';
      withdrawal.failureReason = failureReason;
      await withdrawal.save();

      // Refund the amount back to freelancer's wallet
      const wallet = await Wallet.findOne({ userId: withdrawal.freelancerId._id });
      if (wallet) {
        wallet.balance += withdrawal.amount;
        await wallet.save();
        console.log(chalk.green(`💰 Amount ₹${withdrawal.amount} refunded to freelancer's wallet`));
      }

      console.log(chalk.red(`❌ Withdrawal rejected: ${failureReason}`));
      
    } catch (error) {
      console.error(chalk.red('Error rejecting withdrawal:'), error.message);
    }
  }

  async viewAllWithdrawals() {
    console.log(chalk.blue('\n📊 All Withdrawals\n'));
    
    try {
      const withdrawals = await Transaction.find({
        type: 'withdrawal'
      })
      .populate('freelancerId', 'phone')
      .sort({ createdAt: -1 })
      .limit(50);

      if (withdrawals.length === 0) {
        console.log(chalk.green('🎉 No withdrawals found!'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Freelancer', 'Amount', 'Status', 'Requested', 'Completed'],
        colWidths: [12, 15, 10, 12, 12, 12]
      });

      withdrawals.forEach(withdrawal => {
        const statusColor = withdrawal.status === 'completed' ? '✅' : 
                           withdrawal.status === 'failed' ? '❌' : '⏳';
        table.push([
          withdrawal._id.toString().substring(0, 8) + '...',
          withdrawal.freelancerId.phone,
          `₹${withdrawal.amount}`,
          `${statusColor} ${withdrawal.status}`,
          new Date(withdrawal.createdAt).toLocaleDateString(),
          withdrawal.completedAt ? new Date(withdrawal.completedAt).toLocaleDateString() : '-'
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\nShowing ${withdrawals.length} recent withdrawals`));

    } catch (error) {
      console.error(chalk.red('Error fetching withdrawals:'), error.message);
    }
  }

  async showWithdrawalStats() {
    try {
      const stats = await Transaction.aggregate([
        {
          $match: { type: 'withdrawal' }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      console.log(chalk.blue('\n📈 Withdrawal Statistics\n'));
      
      const table = new Table({
        head: ['Status', 'Count', 'Total Amount'],
        colWidths: [15, 10, 15]
      });

      const statusMap = {
        'pending': '⏳ Pending',
        'completed': '✅ Completed',
        'failed': '❌ Failed',
        'cancelled': '🚫 Cancelled'
      };

      let totalCount = 0;
      let totalAmount = 0;

      stats.forEach(stat => {
        const status = statusMap[stat._id] || stat._id;
        table.push([status, stat.count, `₹${stat.totalAmount}`]);
        totalCount += stat.count;
        totalAmount += stat.totalAmount;
      });

      table.push(['', '', '']);
      table.push(['📊 Total', totalCount, `₹${totalAmount}`]);

      console.log(table.toString());

    } catch (error) {
      console.error(chalk.red('Error fetching withdrawal statistics:'), error.message);
    }
  }

  async showPlatformStats() {
    try {
      console.log(chalk.blue('\n📈 Platform Statistics\n'));
      
      // User stats
      const totalUsers = await User.countDocuments();
      const totalClients = await User.countDocuments({ role: 'client' });
      const totalFreelancers = await User.countDocuments({ role: 'freelancer' });
      const verifiedFreelancers = await FreelancerProfile.countDocuments({ verificationStatus: 'approved' });

      // Job stats
      const totalJobs = await Job.countDocuments();
      const openJobs = await Job.countDocuments({ status: 'open', isActive: true });
      const completedJobs = await Job.countDocuments({ status: 'completed' });

      // Transaction stats
      const totalTransactions = await Transaction.countDocuments();
      const pendingWithdrawals = await Transaction.countDocuments({ 
        type: 'withdrawal', 
        status: 'pending' 
      });

      const table = new Table({
        head: ['Category', 'Metric', 'Count'],
        colWidths: [15, 25, 10]
      });

      table.push(
        ['👥 Users', 'Total Users', totalUsers],
        ['👥 Users', 'Clients', totalClients],
        ['👥 Users', 'Freelancers', totalFreelancers],
        ['👥 Users', 'Verified Freelancers', verifiedFreelancers],
        ['', '', ''],
        ['💼 Jobs', 'Total Jobs', totalJobs],
        ['💼 Jobs', 'Open Jobs', openJobs],
        ['💼 Jobs', 'Completed Jobs', completedJobs],
        ['', '', ''],
        ['💰 Transactions', 'Total Transactions', totalTransactions],
        ['💰 Transactions', 'Pending Withdrawals', pendingWithdrawals]
      );

      console.log(table.toString());

    } catch (error) {
      console.error(chalk.red('Error fetching platform statistics:'), error.message);
    }
  }

  async run() {
    try {
      this.showWelcome();
      await this.connectDB();

      while (true) {
        const action = await this.showMainMenu();
        
        if (action === 'exit') {
          break;
        }

        switch (action) {
          case 'pending':
            await this.viewPendingVerifications();
            break;
          case 'approve':
            await this.approveVerification();
            break;
          case 'reject':
            await this.rejectVerification();
            break;
          case 'all':
            await this.viewPendingVerifications();
            break;
          case 'bulk':
            await this.bulkOperations();
            break;
          case 'withdrawals':
            await this.withdrawalManagement();
            break;
          case 'stats':
            await this.showPlatformStats();
            break;
          case 'users':
            console.log(chalk.yellow('👥 User management coming soon...'));
            break;
          case 'jobs':
            console.log(chalk.yellow('💼 Job management coming soon...'));
            break;
        }

        console.log(chalk.gray('\nPress Enter to continue...'));
        await new Promise(resolve => this.rl.once('line', resolve));
      }

    } catch (error) {
      console.error(chalk.red('Fatal error:'), error.message);
    } finally {
      await this.disconnectDB();
      this.rl.close();
      console.log(chalk.green('\n👋 Goodbye!'));
    }
  }
}

// Run the CLI
if (require.main === module) {
  const cli = new AdminCLI();
  cli.run().catch(console.error);
}

module.exports = AdminCLI;
