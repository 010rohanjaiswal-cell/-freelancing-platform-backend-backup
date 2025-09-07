const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config/environment');

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const firebaseAuthRoutes = require('./routes/firebaseAuth');
const hybridAuthRoutes = require('./routes/hybridAuth');
const freelancerRoutes = require('./routes/freelancer');
const clientRoutes = require('./routes/client');
const jobRoutes = require('./routes/jobs');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const seedRoutes = require('./routes/seed');
const paymentRoutes = require('./routes/payments');
const manualVerificationRoutes = require('./routes/manualVerification');
const firebaseTestRoutes = require('./routes/firebaseTest');
const realFirebaseAuthRoutes = require('./routes/realFirebaseAuth');
const verificationFormRoutes = require('./routes/verificationForm');
// Test routes removed - using CLI admin app instead

// Security middleware
app.use(helmet());

// CORS configuration for frontend integration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (config.cors.origin.indexOf(origin) !== -1 || config.server.isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  optionsSuccessStatus: 200,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, config.upload.uploadPath)));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(config.database.uri, config.database.options)
.then(() => {
  console.log('✅ Connected to MongoDB');
  config.printSummary();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  if (config.server.isProduction) {
    process.exit(1);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/firebase-auth', firebaseAuthRoutes);
app.use('/api/hybrid-auth', hybridAuthRoutes);
app.use('/api/freelancer', freelancerRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/manual-verification', manualVerificationRoutes);
app.use('/api/firebase-test', firebaseTestRoutes);
app.use('/api/real-firebase-auth', realFirebaseAuthRoutes);
app.use('/api/verification-form', verificationFormRoutes);
// Test routes removed - using CLI admin app instead

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Freelancing Platform API is running' });
});

// Admin panel routes removed - using CLI admin app instead

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`🌍 Environment: ${config.server.env}`);
  console.log(`🔗 API Base URL: ${config.server.apiBaseUrl}`);
  console.log(`📱 Manual Verification: ${config.server.apiBaseUrl}/verification`);
  console.log(`🔧 API Health Check: ${config.server.apiBaseUrl}/api/health`);
  console.log(`📊 Firebase Project: ${config.firebase.projectId || 'Not configured'}`);
  console.log(`☁️  Cloudinary: ${config.cloudinary.isEnabled ? 'Enabled' : 'Disabled'}`);
});
// Updated Fri Sep  5 16:16:08 IST 2025
console.log("Deployment test: $(date)");
