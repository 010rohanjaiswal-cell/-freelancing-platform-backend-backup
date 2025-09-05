# 🚀 Production Setup Guide - Freelancing Platform Backend

## 🎯 **Overview**

This guide will help you deploy the Freelancing Platform Backend to production with proper environment variable management and configuration.

## 📋 **Prerequisites**

- ✅ Node.js 16+ installed
- ✅ MongoDB Atlas account (or MongoDB instance)
- ✅ Domain name for your API
- ✅ SSL certificate (for HTTPS)
- ✅ Environment variables configured

## 🔧 **Environment Variables Setup**

### **1. Create Environment Files**

The project includes three environment files:

- **`.env.example`** - Template with all available variables
- **`.env.development`** - Development configuration
- **`.env.production`** - Production configuration

### **2. Configure Production Environment**

Copy and customize the production environment file:

```bash
cp .env.example .env.production
```

**Required Variables for Production:**

```bash
# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=production
PORT=10000
HOST=0.0.0.0

# ===========================================
# DATABASE CONFIGURATION
# ===========================================
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/freelancing-platform?retryWrites=true&w=majority

# ===========================================
# JWT CONFIGURATION
# ===========================================
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# ===========================================
# FIREBASE CONFIGURATION
# ===========================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase Private Key Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# ===========================================
# TWILIO CONFIGURATION (SMS/OTP)
# ===========================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ===========================================
# PAYMENT GATEWAY CONFIGURATION
# ===========================================
PAYMENT_CLIENT_ID=your-payment-client-id
PAYMENT_CLIENT_SECRET=your-payment-client-secret
PAYMENT_MERCHANT_ID=your-merchant-id
PAYMENT_BASE_URL=https://api.phonepe.com/apis/hermes
PAYMENT_REDIRECT_URL=https://your-frontend-domain.com/payment/callback
PAYMENT_CALLBACK_URL=https://your-backend-domain.com/api/payments/callback

# ===========================================
# CORS CONFIGURATION
# ===========================================
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true

# ===========================================
# ADMIN CONFIGURATION
# ===========================================
ADMIN_EMAIL=admin@freelancingplatform.com
ADMIN_PASSWORD=your-secure-admin-password
```

## 🚀 **Deployment Options**

### **Option 1: Render.com (Recommended)**

**1. Connect GitHub Repository:**
- Push your code to GitHub
- Connect repository to Render.com
- Use the existing `render.yaml` configuration

**2. Environment Variables:**
Set these in Render dashboard:
```bash
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
# ... other variables
```

**3. Deploy:**
```bash
git push origin main
# Render will automatically deploy
```

### **Option 2: VPS/Cloud Server**

**1. Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (optional, for reverse proxy)
sudo apt install nginx -y
```

**2. Deploy Application:**
```bash
# Clone repository
git clone https://github.com/your-username/freelancing-platform-backend.git
cd freelancing-platform-backend

# Install dependencies
npm install --production

# Set environment variables
cp .env.production .env

# Run deployment script
node scripts/deploy.js deploy

# Start with PM2
pm2 start server.js --name "freelancing-backend"
pm2 save
pm2 startup
```

### **Option 3: Docker Deployment**

**1. Create Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 10000

CMD ["npm", "start"]
```

**2. Build and Run:**
```bash
# Build image
docker build -t freelancing-backend .

# Run container
docker run -d \
  --name freelancing-backend \
  -p 10000:10000 \
  --env-file .env.production \
  freelancing-backend
```

## 🔧 **Configuration Management**

### **Environment-Specific Configuration**

The application uses a centralized configuration system:

```javascript
// config/environment.js
const config = require('./config/environment');

// Access configuration
console.log(config.server.port);        // 10000
console.log(config.database.uri);       // MongoDB URI
console.log(config.jwt.secret);         // JWT Secret
console.log(config.payment.isEnabled);  // Payment gateway status
```

### **Available Configuration Sections:**

- **`config.server`** - Server settings (port, host, environment)
- **`config.database`** - Database connection settings
- **`config.jwt`** - JWT authentication settings
- **`config.firebase`** - Firebase configuration
- **`config.twilio`** - Twilio SMS settings
- **`config.payment`** - Payment gateway settings
- **`config.cors`** - CORS configuration
- **`config.upload`** - File upload settings
- **`config.admin`** - Admin user settings

## 🧪 **Testing Production Setup**

### **1. Health Check**
```bash
curl https://your-domain.com/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Freelancing Platform API is running"
}
```

### **2. Manual Verification Interface**
```bash
# Open in browser
https://your-domain.com/verification
```

### **3. API Endpoints Test**
```bash
# Test authentication
curl -X POST https://your-domain.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Test freelancer registration
curl -X POST https://your-domain.com/api/freelancer/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"fullName": "Test User", "dateOfBirth": "1990-01-01", "gender": "male"}'
```

## 📊 **Monitoring & Logging**

### **1. Application Logs**
```bash
# View logs
pm2 logs freelancing-backend

# Or with Docker
docker logs freelancing-backend
```

### **2. Health Monitoring**
```bash
# Check application status
pm2 status

# Monitor resources
pm2 monit
```

### **3. Database Monitoring**
- Monitor MongoDB Atlas dashboard
- Set up alerts for connection issues
- Monitor query performance

## 🔒 **Security Considerations**

### **1. Environment Variables**
- ✅ Never commit `.env` files to version control
- ✅ Use strong, unique secrets for production
- ✅ Rotate secrets regularly
- ✅ Use different secrets for different environments

### **2. Database Security**
- ✅ Use MongoDB Atlas with IP whitelisting
- ✅ Enable authentication
- ✅ Use SSL/TLS connections
- ✅ Regular backups

### **3. API Security**
- ✅ Enable HTTPS (SSL/TLS)
- ✅ Use CORS properly
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Use helmet.js for security headers

### **4. File Upload Security**
- ✅ Validate file types and sizes
- ✅ Scan uploaded files for malware
- ✅ Store files outside web root
- ✅ Use CDN for file delivery

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. Database Connection Failed:**
```bash
# Check MongoDB URI
echo $MONGODB_URI

# Test connection
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"
```

**2. Port Already in Use:**
```bash
# Find process using port
lsof -i :10000

# Kill process
kill -9 PID
```

**3. Environment Variables Not Loading:**
```bash
# Check if .env file exists
ls -la .env*

# Verify environment
echo $NODE_ENV
```

**4. CORS Issues:**
```bash
# Check CORS configuration
curl -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  https://your-api.com/api/auth/login
```

## 📱 **Frontend Integration**

### **Environment Variables for Frontend:**

**React Native (Expo):**
```bash
# .env.production
API_URL=https://your-api-domain.com
API_TIMEOUT=10000
```

**Next.js:**
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
API_URL=https://your-api-domain.com
```

**Usage in Frontend:**
```javascript
// React Native
import { API_URL } from "@env";
const apiClient = axios.create({
  baseURL: API_URL,
});

// Next.js
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
```

## 🎉 **Deployment Checklist**

### **Pre-Deployment:**
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] CORS origins set correctly
- [ ] Payment gateway configured
- [ ] SMS service configured
- [ ] File upload paths configured

### **Post-Deployment:**
- [ ] Health check endpoint working
- [ ] Manual verification interface accessible
- [ ] Authentication endpoints working
- [ ] File upload working
- [ ] Payment integration tested
- [ ] SMS/OTP working
- [ ] Database operations working
- [ ] Logs being generated
- [ ] Monitoring set up

## 📞 **Support**

### **Useful Commands:**
```bash
# Check deployment status
node scripts/deploy.js status

# Run health checks
node scripts/deploy.js check

# Manual verification
npm run verification

# View logs
pm2 logs freelancing-backend

# Restart application
pm2 restart freelancing-backend
```

### **Important URLs:**
- **API Base URL**: `https://your-domain.com/api`
- **Health Check**: `https://your-domain.com/api/health`
- **Manual Verification**: `https://your-domain.com/verification`
- **Documentation**: `https://your-domain.com/api/docs` (if implemented)

---

**Status: ✅ PRODUCTION SETUP GUIDE COMPLETE**

**Last Updated**: January 2025
**Compatibility**: Node.js 16+, MongoDB 4.4+
**Deployment**: Render.com, VPS, Docker, Cloud Platforms
