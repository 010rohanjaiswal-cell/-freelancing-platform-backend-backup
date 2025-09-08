const OTP = require('../models/OTP');

class OTPService {
  // Generate OTP
  static generateOTP(phone) {
    // For Firebase authentication, we don't need to generate OTPs
    // Firebase handles OTP generation and verification
    // This method is kept for backward compatibility
    console.log(`📱 OTP generation requested for ${phone} - Firebase will handle this`);
    
    // Return a random OTP for logging purposes only
    // The actual OTP verification should be done through Firebase
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create OTP record
  static async createOTP(phone, purpose = 'login') {
    try {
      // Delete existing OTP for this phone and purpose
      await OTP.deleteMany({ phone, purpose });

      const otp = this.generateOTP(phone);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const otpRecord = new OTP({
        phone,
        otp,
        purpose,
        expiresAt
      });

      await otpRecord.save();
      return otp;
    } catch (error) {
      throw new Error('Failed to create OTP');
    }
  }

  // Verify OTP
  static async verifyOTP(phone, otp, purpose = 'login') {
    try {
      console.log(`📱 OTP verification requested for ${phone} - Firebase should handle this`);
      
      // For Firebase authentication, OTP verification should be done on the frontend
      // This method is kept for backward compatibility but should not be used
      // with Firebase authentication flow
      
      const otpRecord = await OTP.findOne({
        phone,
        otp,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        return { isValid: false, message: 'Invalid or expired OTP. For Firebase auth, use /api/real-firebase-auth/authenticate' };
      }

      // Mark OTP as used
      otpRecord.isUsed = true;
      await otpRecord.save();

      return { isValid: true, message: 'OTP verified successfully' };
    } catch (error) {
      throw new Error('Failed to verify OTP');
    }
  }

  // Mock SMS service (in production, integrate with Twilio or similar)
  static async sendSMS(phone, message) {
    // Mock implementation - in production, use Twilio
    console.log(`Mock SMS sent to ${phone}: ${message}`);
    return { success: true, messageId: 'mock-message-id' };
  }

  // Send OTP via SMS
  static async sendOTP(phone, purpose = 'login') {
    try {
      const otp = await this.createOTP(phone, purpose);
      const message = `Your OTP for ${purpose} is: ${otp}. Valid for 10 minutes.`;
      
      await this.sendSMS(phone, message);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      throw new Error('Failed to send OTP');
    }
  }
}

module.exports = OTPService;
