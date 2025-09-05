#!/bin/bash

echo "🚀 Deploying Verification Management System to Production..."
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if verification.html exists
if [ ! -f "public/verification.html" ]; then
    echo "❌ Error: verification.html not found in public/ directory"
    exit 1
fi

echo "✅ Files ready for deployment"
echo ""

# Add all changes
echo "📦 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Add production verification web interface and management system

- Add comprehensive verification web interface
- Add manual verification API endpoints
- Add verification form testing endpoints
- Add Firebase authentication testing
- Add production environment configuration
- Add deployment guides and documentation"

# Push to production
echo "🚀 Pushing to production..."
git push origin main

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "🌐 Production URLs:"
echo "   📱 Verification Interface: https://freelancer-backend-jv21.onrender.com/verification"
echo "   🔧 API Health Check: https://freelancer-backend-jv21.onrender.com/api/health"
echo "   📊 Pending Verifications: https://freelancer-backend-jv21.onrender.com/api/manual-verification/pending"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"
echo "🔄 You can monitor deployment at: https://dashboard.render.com"
echo ""
echo "🧪 Test the deployment:"
echo "   curl https://freelancer-backend-jv21.onrender.com/api/health"
echo "   curl -I https://freelancer-backend-jv21.onrender.com/verification"
echo ""
echo "🎉 Your verification management system is now live!"
