# 🔗 API Endpoints Guide - Freelancing Platform

## 🎯 **Production API Base URLs**

### **Primary Production Backend**
- **Base URL**: `https://freelancer-backend-jv21.onrender.com`
- **API Base**: `https://freelancer-backend-jv21.onrender.com/api`
- **Manual Verification**: `https://freelancer-backend-jv21.onrender.com/verification`

### **Development Backend**
- **Local Development**: `http://localhost:3001`
- **API Base**: `http://localhost:3001/api`
- **Manual Verification**: `http://localhost:3001/verification`

## 🔧 **Environment Configuration**

### **Production Environment**
```bash
NODE_ENV=production
PORT=10000
API_BASE_URL=https://freelancer-backend-jv21.onrender.com
MONGODB_URI=mongodb+srv://rohanjaiswar2467:N8iwsBEfkbF2Dd2S@cluster1.sg9pmcf.mongodb.net/freelancing-platform
FIREBASE_PROJECT_ID=freelancing-platform-v2
CLOUDINARY_CLOUD_NAME=dzpqrejsi
```

### **Development Environment**
```bash
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/freelancing-platform
FIREBASE_PROJECT_ID=freelancing-platform-v2
CLOUDINARY_CLOUD_NAME=dzpqrejsi
```

## 📱 **Frontend Integration**

### **React Native (Expo)**
```bash
# .env.production
API_URL=https://freelancer-backend-jv21.onrender.com

# .env.development
API_URL=http://localhost:3001
```

### **Next.js Admin Panel**
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://freelancer-backend-jv21.onrender.com
API_URL=https://freelancer-backend-jv21.onrender.com

# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3001
API_URL=http://localhost:3001
```

### **Mobile App Fallback URLs**
The mobile app uses these URLs in priority order:
1. `https://freelancer-backend-jv21.onrender.com` (Primary - Production)
2. `http://192.168.1.49:5000` (Local network)
3. `http://10.0.2.2:5000` (Android emulator)
4. `http://localhost:5000` (Localhost)

## 🔗 **Complete API Endpoints**

### **Authentication Endpoints**
```bash
# Send OTP
POST https://freelancer-backend-jv21.onrender.com/api/auth/send-otp
POST https://freelancer-backend-jv21.onrender.com/api/hybrid-auth/send-otp

# Verify OTP
POST https://freelancer-backend-jv21.onrender.com/api/auth/verify-otp
POST https://freelancer-backend-jv21.onrender.com/api/hybrid-auth/login

# Firebase Authentication
POST https://freelancer-backend-jv21.onrender.com/api/firebase-auth/login

# Admin Login
POST https://freelancer-backend-jv21.onrender.com/api/auth/admin/login
```

### **Freelancer Endpoints**
```bash
# Profile Management
GET    https://freelancer-backend-jv21.onrender.com/api/freelancer/profile
POST   https://freelancer-backend-jv21.onrender.com/api/freelancer/profile
PUT    https://freelancer-backend-jv21.onrender.com/api/freelancer/profile

# Job Management
GET    https://freelancer-backend-jv21.onrender.com/api/freelancer/jobs/available
GET    https://freelancer-backend-jv21.onrender.com/api/freelancer/jobs/assigned
POST   https://freelancer-backend-jv21.onrender.com/api/freelancer/jobs/:jobId/apply
POST   https://freelancer-backend-jv21.onrender.com/api/freelancer/jobs/:jobId/work-done

# Wallet & Transactions
GET    https://freelancer-backend-jv21.onrender.com/api/freelancer/wallet
GET    https://freelancer-backend-jv21.onrender.com/api/freelancer/transactions
POST   https://freelancer-backend-jv21.onrender.com/api/freelancer/withdraw
```

### **Client Endpoints**
```bash
# Profile Management
GET    https://freelancer-backend-jv21.onrender.com/api/client/profile
POST   https://freelancer-backend-jv21.onrender.com/api/client/profile

# Job Management
POST   https://freelancer-backend-jv21.onrender.com/api/client/jobs
GET    https://freelancer-backend-jv21.onrender.com/api/client/jobs
GET    https://freelancer-backend-jv21.onrender.com/api/client/jobs/:jobId/offers
POST   https://freelancer-backend-jv21.onrender.com/api/client/offers/:offerId/respond

# Freelancer Search
GET    https://freelancer-backend-jv21.onrender.com/api/client/search/freelancers

# Payment
POST   https://freelancer-backend-jv21.onrender.com/api/client/jobs/:jobId/pay
```

### **Job Management Endpoints**
```bash
# Job Operations
GET    https://freelancer-backend-jv21.onrender.com/api/jobs
GET    https://freelancer-backend-jv21.onrender.com/api/jobs/:jobId
POST   https://freelancer-backend-jv21.onrender.com/api/jobs
PUT    https://freelancer-backend-jv21.onrender.com/api/jobs/:jobId
DELETE https://freelancer-backend-jv21.onrender.com/api/jobs/:jobId
```

### **Messaging Endpoints**
```bash
# Message Operations
GET    https://freelancer-backend-jv21.onrender.com/api/messages/job/:jobId
POST   https://freelancer-backend-jv21.onrender.com/api/messages/job/:jobId
PUT    https://freelancer-backend-jv21.onrender.com/api/messages/job/:jobId/read
GET    https://freelancer-backend-jv21.onrender.com/api/messages/unread-count
GET    https://freelancer-backend-jv21.onrender.com/api/messages/conversations
```

### **Payment Endpoints**
```bash
# Payment Operations
POST   https://freelancer-backend-jv21.onrender.com/api/payments/initiate/:jobId
POST   https://freelancer-backend-jv21.onrender.com/api/payments/callback
GET    https://freelancer-backend-jv21.onrender.com/api/payments/status/:transactionId
```

### **Manual Verification Endpoints**
```bash
# Manual Verification (MongoDB-based)
GET    https://freelancer-backend-jv21.onrender.com/api/manual-verification/pending
GET    https://freelancer-backend-jv21.onrender.com/api/manual-verification/profile/:profileId
POST   https://freelancer-backend-jv21.onrender.com/api/manual-verification/approve/:profileId
POST   https://freelancer-backend-jv21.onrender.com/api/manual-verification/reject/:profileId

# Web Interface
GET    https://freelancer-backend-jv21.onrender.com/verification
```

### **System Endpoints**
```bash
# Health Check
GET    https://freelancer-backend-jv21.onrender.com/api/health

# File Uploads
GET    https://freelancer-backend-jv21.onrender.com/uploads/:filename
```

## 🔧 **External Service URLs**

### **Firebase Services**
- **Project ID**: `freelancing-platform-v2`
- **Auth Domain**: `freelancing-platform-v2.firebaseapp.com`
- **Storage Bucket**: `freelancing-platform-v2.firebasestorage.app`
- **API Key**: `AIzaSyDr_KGBQE7WiisZkhHZR8Yz9icfndxTkVE`

### **MongoDB Database**
- **Production**: `mongodb+srv://rohanjaiswar2467:N8iwsBEfkbF2Dd2S@cluster1.sg9pmcf.mongodb.net/freelancing-platform`
- **Local**: `mongodb://localhost:27017/freelancing-platform`

### **Cloudinary (Image Storage)**
- **Cloud Name**: `dzpqrejsi`
- **Base URL**: `https://res.cloudinary.com/dzpqrejsi`
- **Upload URL**: `https://api.cloudinary.com/v1_1/dzpqrejsi`

### **Render Deployment**
- **Service**: `freelancer-backend-jv21`
- **URL**: `https://freelancer-backend-jv21.onrender.com`
- **Environment**: Production

## 📱 **Mobile App Configuration**

### **API Client Setup**
```javascript
// React Native
import { API_URL } from "@env";

const apiClient = axios.create({
  baseURL: API_URL, // Automatically switches between dev/prod
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fallback URLs for mobile app
const fallbackUrls = [
  'https://freelancer-backend-jv21.onrender.com', // Production
  'http://192.168.1.49:5000', // Local network
  'http://10.0.2.2:5000', // Android emulator
  'http://localhost:5000' // Localhost
];
```

### **Environment Variables for Mobile**
```bash
# .env.production
API_URL=https://freelancer-backend-jv21.onrender.com
API_TIMEOUT=10000

# .env.development
API_URL=http://localhost:3001
API_TIMEOUT=5000
```

## 🔒 **CORS Configuration**

### **Production CORS Origins**
```bash
CORS_ORIGIN=https://freelancer-backend-jv21.onrender.com
```

### **Development CORS Origins**
```bash
CORS_ORIGIN=http://localhost:3000,http://localhost:19006,http://localhost:8081,http://192.168.1.49:5000,http://10.0.2.2:5000
```

## 🧪 **Testing Endpoints**

### **Health Check**
```bash
curl https://freelancer-backend-jv21.onrender.com/api/health
```

### **Authentication Test**
```bash
curl -X POST https://freelancer-backend-jv21.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'
```

### **Manual Verification Test**
```bash
curl https://freelancer-backend-jv21.onrender.com/verification
```

## 🚀 **Deployment URLs**

### **Production Deployment**
- **Render Service**: `https://freelancer-backend-jv21.onrender.com`
- **GitHub Repository**: `https://github.com/010rohanjaiswal-cell/people.git`
- **Environment**: Production (Node.js)

### **Development Setup**
- **Local Server**: `http://localhost:3001`
- **API Base**: `http://localhost:3001/api`
- **Database**: Local MongoDB

## 📊 **Service Status**

### **Production Services**
- ✅ **Backend API**: `https://freelancer-backend-jv21.onrender.com`
- ✅ **MongoDB**: Connected to Atlas cluster
- ✅ **Firebase**: `freelancing-platform-v2` project
- ✅ **Cloudinary**: `dzpqrejsi` cloud
- ✅ **Manual Verification**: Web interface available

### **Development Services**
- ✅ **Local Backend**: `http://localhost:3001`
- ✅ **Local MongoDB**: `mongodb://localhost:27017/freelancing-platform`
- ✅ **Firebase**: Same project as production
- ✅ **Cloudinary**: Same cloud as production

## 🔧 **Configuration Management**

### **Environment Switching**
```bash
# Production
NODE_ENV=production npm start

# Development
NODE_ENV=development npm run dev
```

### **API URL Management**
```javascript
// Automatic environment-based URL selection
const config = require('./config/environment');
const apiUrl = config.server.apiBaseUrl; // Automatically selects correct URL
```

---

**Status: ✅ API ENDPOINTS CONFIGURED**

**Last Updated**: January 2025
**Production URL**: `https://freelancer-backend-jv21.onrender.com`
**Development URL**: `http://localhost:3001`
**Environment**: Production-ready with proper URL management
