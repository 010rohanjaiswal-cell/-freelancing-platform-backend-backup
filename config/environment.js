const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = path.resolve(__dirname, `../.env.${env}`);
require('dotenv').config({ path: envFile });

class EnvironmentConfig {
  constructor() {
    this.env = env;
    this.validateRequiredEnvVars();
  }

  // Validate required environment variables
  validateRequiredEnvVars() {
    const required = [
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      if (this.env === 'production') {
        process.exit(1);
      } else {
        console.warn('⚠️  Running in development mode with missing variables');
      }
    }
  }

  // Server Configuration
  get server() {
    return {
      env: this.env,
      port: parseInt(process.env.PORT) || 10000,
      host: process.env.HOST || '0.0.0.0',
      apiBaseUrl: process.env.API_BASE_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 10000}`,
      isDevelopment: this.env === 'development',
      isProduction: this.env === 'production',
      isTest: this.env === 'test'
    };
  }

  // Database Configuration
  get database() {
    return {
      uri: process.env.MONGODB_URI,
      options: {
        maxPoolSize: this.env === 'production' ? 10 : 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      }
    };
  }

  // JWT Configuration
  get jwt() {
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'freelancing-platform',
      audience: process.env.JWT_AUDIENCE || 'freelancing-platform-users'
    };
  }

  // Firebase Configuration
  get firebase() {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      isEnabled: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_API_KEY)
    };
  }

  // Twilio Configuration
  get twilio() {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      isEnabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
    };
  }

  // Payment Gateway Configuration
  get payment() {
    return {
      clientId: process.env.PAYMENT_CLIENT_ID,
      clientSecret: process.env.PAYMENT_CLIENT_SECRET,
      merchantId: process.env.PAYMENT_MERCHANT_ID,
      baseUrl: process.env.PAYMENT_BASE_URL,
      redirectUrl: process.env.PAYMENT_REDIRECT_URL,
      callbackUrl: process.env.PAYMENT_CALLBACK_URL,
      isEnabled: !!(process.env.PAYMENT_CLIENT_ID && process.env.PAYMENT_CLIENT_SECRET)
    };
  }

  // File Upload Configuration
  get upload() {
    return {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
      ]
    };
  }

  // Cloudinary Configuration
  get cloudinary() {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      baseUrl: process.env.CLOUDINARY_BASE_URL,
      uploadUrl: process.env.CLOUDINARY_UPLOAD_URL,
      isEnabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
    };
  }

  // Admin Configuration
  get admin() {
    return {
      email: process.env.ADMIN_EMAIL || 'admin@freelancingplatform.com',
      password: process.env.ADMIN_PASSWORD || 'admin123456'
    };
  }

  // CORS Configuration
  get cors() {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000', // Next.js dev
      'http://localhost:19006', // Expo dev
      'http://localhost:8081',   // React Native Metro
      'http://192.168.1.49:5000', // Local network
      'http://10.0.2.2:5000'     // Android emulator
    ];

    if (this.env === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:19006',
        'http://localhost:8081',
        'http://192.168.1.49:5000',
        'http://10.0.2.2:5000'
      );
    }

    return {
      origin: allowedOrigins,
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }

  // Rate Limiting Configuration
  get rateLimit() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (this.env === 'production' ? 100 : 1000)
    };
  }

  // Commission Configuration
  get commission() {
    return {
      rate: parseFloat(process.env.COMMISSION_RATE) || 10,
      minAmount: parseFloat(process.env.COMMISSION_MIN_AMOUNT) || 0,
      maxAmount: parseFloat(process.env.COMMISSION_MAX_AMOUNT) || 1000
    };
  }

  // Security Configuration
  get security() {
    return {
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
      sessionSecret: process.env.SESSION_SECRET || 'default-session-secret'
    };
  }

  // Logging Configuration
  get logging() {
    return {
      level: process.env.LOG_LEVEL || (this.env === 'production' ? 'info' : 'debug'),
      file: process.env.LOG_FILE || `./logs/app-${this.env}.log`
    };
  }

  // Analytics Configuration
  get analytics() {
    return {
      enabled: process.env.ENABLE_ANALYTICS === 'true',
      apiKey: process.env.ANALYTICS_API_KEY
    };
  }

  // Email Configuration
  get email() {
    return {
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      from: process.env.FROM_EMAIL || 'noreply@freelancingplatform.com',
      isEnabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
    };
  }

  // Redis Configuration
  get redis() {
    return {
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD,
      isEnabled: !!process.env.REDIS_URL
    };
  }

  // Webhook Configuration
  get webhook() {
    return {
      secret: process.env.WEBHOOK_SECRET,
      enabled: process.env.ENABLE_WEBHOOKS === 'true'
    };
  }

  // Backup Configuration
  get backup() {
    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
    };
  }

  // Get all configuration
  get all() {
    return {
      server: this.server,
      database: this.database,
      jwt: this.jwt,
      firebase: this.firebase,
      twilio: this.twilio,
      payment: this.payment,
      upload: this.upload,
      cloudinary: this.cloudinary,
      admin: this.admin,
      cors: this.cors,
      rateLimit: this.rateLimit,
      commission: this.commission,
      security: this.security,
      logging: this.logging,
      analytics: this.analytics,
      email: this.email,
      redis: this.redis,
      webhook: this.webhook,
      backup: this.backup
    };
  }

  // Print configuration summary (without sensitive data)
  printSummary() {
    console.log('\n🔧 ENVIRONMENT CONFIGURATION');
    console.log('============================');
    console.log(`Environment: ${this.server.env}`);
    console.log(`Port: ${this.server.port}`);
    console.log(`Host: ${this.server.host}`);
    console.log(`API Base URL: ${this.server.apiBaseUrl}`);
    console.log(`Database: ${this.database.uri ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`JWT: ${this.jwt.secret ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`Firebase: ${this.firebase.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Twilio: ${this.twilio.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Payment: ${this.payment.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Cloudinary: ${this.cloudinary.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Email: ${this.email.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Redis: ${this.redis.isEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Analytics: ${this.analytics.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log('============================\n');
  }
}

module.exports = new EnvironmentConfig();
