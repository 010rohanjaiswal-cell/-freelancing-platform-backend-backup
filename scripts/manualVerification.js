const mongoose = require('mongoose');
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelancing-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

class ManualVerification {
  // Get all pending verifications
  static async getPendingVerifications() {
    try {
      const profiles = await FreelancerProfile.find({
        verificationStatus: { $in: ['pending', 'resubmitted'] }
      })
      .populate('userId', 'phone role createdAt')
      .sort({ createdAt: -1 });

      console.log('\n📋 PENDING VERIFICATIONS:');
      console.log('========================');
      
      if (profiles.length === 0) {
        console.log('No pending verifications found.');
        return [];
      }

      profiles.forEach((profile, index) => {
        console.log(`\n${index + 1}. Profile ID: ${profile._id}`);
        console.log(`   Name: ${profile.fullName}`);
        console.log(`   Phone: ${profile.userId.phone}`);
        console.log(`   Status: ${profile.verificationStatus}`);
        console.log(`   Submitted: ${profile.createdAt.toLocaleDateString()}`);
        console.log(`   Documents: ${Object.keys(profile.documents).filter(key => profile.documents[key]).length}/5 uploaded`);
      });

      return profiles;
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      return [];
    }
  }

  // Approve a freelancer
  static async approveFreelancer(profileId, freelancerId = null) {
    try {
      const profile = await FreelancerProfile.findById(profileId);
      if (!profile) {
        console.log('❌ Profile not found');
        return false;
      }

      if (profile.verificationStatus !== 'pending' && profile.verificationStatus !== 'resubmitted') {
        console.log('❌ Profile is not pending verification');
        return false;
      }

      // Check if freelancer ID is already taken
      if (freelancerId) {
        const existingProfile = await FreelancerProfile.findOne({ freelancerId });
        if (existingProfile) {
          console.log('❌ Freelancer ID already exists');
          return false;
        }
        profile.freelancerId = freelancerId;
      }

      profile.verificationStatus = 'approved';
      await profile.save();

      // Update user verification status
      await User.findByIdAndUpdate(profile.userId, {
        isVerified: true
      });

      console.log(`✅ Freelancer approved successfully!`);
      console.log(`   Name: ${profile.fullName}`);
      console.log(`   Freelancer ID: ${profile.freelancerId}`);
      return true;
    } catch (error) {
      console.error('Error approving freelancer:', error);
      return false;
    }
  }

  // Reject a freelancer
  static async rejectFreelancer(profileId, rejectionReason) {
    try {
      const profile = await FreelancerProfile.findById(profileId);
      if (!profile) {
        console.log('❌ Profile not found');
        return false;
      }

      if (profile.verificationStatus !== 'pending' && profile.verificationStatus !== 'resubmitted') {
        console.log('❌ Profile is not pending verification');
        return false;
      }

      profile.verificationStatus = 'rejected';
      profile.rejectionReason = rejectionReason;
      await profile.save();

      console.log(`❌ Freelancer rejected successfully!`);
      console.log(`   Name: ${profile.fullName}`);
      console.log(`   Reason: ${rejectionReason}`);
      return true;
    } catch (error) {
      console.error('Error rejecting freelancer:', error);
      return false;
    }
  }

  // Get profile details
  static async getProfileDetails(profileId) {
    try {
      const profile = await FreelancerProfile.findById(profileId)
        .populate('userId', 'phone role createdAt');

      if (!profile) {
        console.log('❌ Profile not found');
        return null;
      }

      console.log('\n📄 PROFILE DETAILS:');
      console.log('==================');
      console.log(`Profile ID: ${profile._id}`);
      console.log(`Name: ${profile.fullName}`);
      console.log(`Phone: ${profile.userId.phone}`);
      console.log(`Date of Birth: ${profile.dateOfBirth.toLocaleDateString()}`);
      console.log(`Gender: ${profile.gender}`);
      console.log(`Address: ${profile.address.street}, ${profile.address.city}, ${profile.address.state} - ${profile.address.pincode}`);
      console.log(`Status: ${profile.verificationStatus}`);
      console.log(`Freelancer ID: ${profile.freelancerId || 'Not assigned'}`);
      console.log(`Rejection Reason: ${profile.rejectionReason || 'N/A'}`);
      
      console.log('\n📎 DOCUMENTS:');
      console.log('=============');
      Object.entries(profile.documents).forEach(([key, value]) => {
        console.log(`${key}: ${value ? '✅ Uploaded' : '❌ Missing'}`);
      });

      return profile;
    } catch (error) {
      console.error('Error getting profile details:', error);
      return null;
    }
  }

  // Interactive menu
  static async showMenu() {
    console.log('\n🔧 MANUAL VERIFICATION TOOL');
    console.log('===========================');
    console.log('1. View pending verifications');
    console.log('2. View profile details');
    console.log('3. Approve freelancer');
    console.log('4. Reject freelancer');
    console.log('5. Exit');
    console.log('===========================');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    while (true) {
      await ManualVerification.showMenu();
      const choice = await question('\nEnter your choice (1-5): ');

      switch (choice) {
        case '1':
          await ManualVerification.getPendingVerifications();
          break;
        case '2':
          const profileId = await question('Enter Profile ID: ');
          await ManualVerification.getProfileDetails(profileId);
          break;
        case '3':
          const approveId = await question('Enter Profile ID to approve: ');
          const freelancerId = await question('Enter Freelancer ID (optional, press Enter for auto-generate): ');
          await ManualVerification.approveFreelancer(approveId, freelancerId || null);
          break;
        case '4':
          const rejectId = await question('Enter Profile ID to reject: ');
          const reason = await question('Enter rejection reason: ');
          await ManualVerification.rejectFreelancer(rejectId, reason);
          break;
        case '5':
          console.log('👋 Goodbye!');
          rl.close();
          process.exit(0);
        default:
          console.log('❌ Invalid choice. Please try again.');
      }
    }
  } else {
    // Command line mode
    const command = args[0];
    
    switch (command) {
      case 'list':
        await ManualVerification.getPendingVerifications();
        break;
      case 'details':
        if (args[1]) {
          await ManualVerification.getProfileDetails(args[1]);
        } else {
          console.log('❌ Please provide Profile ID');
        }
        break;
      case 'approve':
        if (args[1]) {
          await ManualVerification.approveFreelancer(args[1], args[2]);
        } else {
          console.log('❌ Please provide Profile ID');
        }
        break;
      case 'reject':
        if (args[1] && args[2]) {
          await ManualVerification.rejectFreelancer(args[1], args.slice(2).join(' '));
        } else {
          console.log('❌ Please provide Profile ID and rejection reason');
        }
        break;
      default:
        console.log('❌ Invalid command. Available commands:');
        console.log('  node scripts/manualVerification.js list');
        console.log('  node scripts/manualVerification.js details <profileId>');
        console.log('  node scripts/manualVerification.js approve <profileId> [freelancerId]');
        console.log('  node scripts/manualVerification.js reject <profileId> <reason>');
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  mongoose.connection.close();
  process.exit(0);
});

// Run the script
main().catch(console.error);
