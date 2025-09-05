#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.env = process.env.NODE_ENV || 'production';
  }

  // Check if all required environment variables are set
  checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');
    
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT'
    ];

    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
      console.log('💡 Please set these variables in your .env.production file or environment');
      return false;
    }

    console.log('✅ All required environment variables are set');
    return true;
  }

  // Check if all required files exist
  checkRequiredFiles() {
    console.log('🔍 Checking required files...');
    
    const requiredFiles = [
      'server.js',
      'package.json',
      'config/environment.js',
      'models/User.js',
      'routes/auth.js'
    ];

    const missing = requiredFiles.filter(file => {
      const filePath = path.join(this.projectRoot, file);
      return !fs.existsSync(filePath);
    });

    if (missing.length > 0) {
      console.error(`❌ Missing required files: ${missing.join(', ')}`);
      return false;
    }

    console.log('✅ All required files exist');
    return true;
  }

  // Install dependencies
  installDependencies() {
    console.log('📦 Installing dependencies...');
    
    try {
      execSync('npm install --production', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('✅ Dependencies installed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error.message);
      return false;
    }
  }

  // Create necessary directories
  createDirectories() {
    console.log('📁 Creating necessary directories...');
    
    const directories = [
      'uploads',
      'logs',
      'public'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
  }

  // Test database connection
  async testDatabaseConnection() {
    console.log('🔗 Testing database connection...');
    
    try {
      const mongoose = require('mongoose');
      const config = require('../config/environment');
      
      await mongoose.connect(config.database.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      console.log('✅ Database connection successful');
      await mongoose.disconnect();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  // Run basic health checks
  async runHealthChecks() {
    console.log('🏥 Running health checks...');
    
    const checks = [
      { name: 'Environment Variables', fn: () => this.checkEnvironmentVariables() },
      { name: 'Required Files', fn: () => this.checkRequiredFiles() },
      { name: 'Database Connection', fn: () => this.testDatabaseConnection() }
    ];

    for (const check of checks) {
      const result = await check.fn();
      if (!result) {
        console.error(`❌ Health check failed: ${check.name}`);
        return false;
      }
    }

    console.log('✅ All health checks passed');
    return true;
  }

  // Deploy the application
  async deploy() {
    console.log('🚀 Starting deployment process...');
    console.log(`📋 Environment: ${this.env}`);
    console.log(`📂 Project Root: ${this.projectRoot}`);
    console.log('=====================================\n');

    // Run health checks
    const healthCheckPassed = await this.runHealthChecks();
    if (!healthCheckPassed) {
      console.error('❌ Deployment aborted due to failed health checks');
      process.exit(1);
    }

    // Create directories
    this.createDirectories();

    // Install dependencies
    const depsInstalled = this.installDependencies();
    if (!depsInstalled) {
      console.error('❌ Deployment aborted due to dependency installation failure');
      process.exit(1);
    }

    console.log('\n🎉 Deployment preparation completed successfully!');
    console.log('=====================================');
    console.log('✅ Environment variables configured');
    console.log('✅ Required files present');
    console.log('✅ Database connection verified');
    console.log('✅ Dependencies installed');
    console.log('✅ Directories created');
    console.log('=====================================');
    console.log('\n🚀 Ready to start the application!');
    console.log('💡 Run: npm start');
    console.log('🌐 Access: http://your-domain.com');
    console.log('📱 Manual Verification: http://your-domain.com/verification');
  }

  // Show deployment status
  showStatus() {
    console.log('📊 DEPLOYMENT STATUS');
    console.log('===================');
    console.log(`Environment: ${this.env}`);
    console.log(`Project Root: ${this.projectRoot}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}`);
    console.log('===================\n');

    // Check environment variables
    const envVars = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT',
      'FIREBASE_PROJECT_ID',
      'TWILIO_ACCOUNT_SID',
      'PAYMENT_CLIENT_ID'
    ];

    console.log('🔧 Environment Variables:');
    envVars.forEach(key => {
      const value = process.env[key];
      if (value) {
        const displayValue = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN') 
          ? '***' + value.slice(-4) 
          : value;
        console.log(`  ✅ ${key}: ${displayValue}`);
      } else {
        console.log(`  ❌ ${key}: Not set`);
      }
    });
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'deploy';
  
  const deployer = new DeploymentManager();

  switch (command) {
    case 'deploy':
      await deployer.deploy();
      break;
    case 'status':
      deployer.showStatus();
      break;
    case 'check':
      await deployer.runHealthChecks();
      break;
    default:
      console.log('❌ Invalid command. Available commands:');
      console.log('  node scripts/deploy.js deploy  - Deploy the application');
      console.log('  node scripts/deploy.js status  - Show deployment status');
      console.log('  node scripts/deploy.js check   - Run health checks');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Deployment process interrupted');
  process.exit(0);
});

// Run the deployment
main().catch(console.error);
