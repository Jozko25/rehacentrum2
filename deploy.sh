#!/bin/bash

# Rehacentrum Deployment Script
# This script deploys all changes to GitHub and triggers Railway deployment

echo "🚀 Starting Rehacentrum deployment..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 Found uncommitted changes, staging them..."
    git add .
    
    # Prompt for commit message
    read -p "📋 Enter commit message (or press Enter for default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Update Rehacentrum booking system - $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    echo "💾 Committing changes..."
    git commit -m "$commit_msg"
else
    echo "✅ No uncommitted changes found"
fi

# Get current branch
current_branch=$(git branch --show-current)
echo "📍 Current branch: $current_branch"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin $current_branch

if [ $? -eq 0 ]; then
    echo "✅ Successfully deployed to GitHub!"
    echo ""
    echo "🔗 Repository: https://github.com/Jozko25/rehacentrum2"
    echo "🚂 Railway will automatically deploy from the $current_branch branch"
    echo ""
    echo "📊 Deployment status:"
    echo "   - GitHub: ✅ Updated"
    echo "   - Railway: ⏳ Deploying (check Railway dashboard)"
    echo ""
    echo "🌐 Production URL: https://rehacentrum2-production.up.railway.app"
    echo "🔧 Webhook URL: https://rehacentrum2-production.up.railway.app/api/booking/webhook"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi

# Check deployment status
echo "🕐 Checking deployment status in 30 seconds..."
sleep 30

echo "🔍 Testing production endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" https://rehacentrum2-production.up.railway.app/health)

if [ "$response" -eq 200 ]; then
    echo "✅ Production server is responding (HTTP $response)"
    echo "🎉 Deployment completed successfully!"
else
    echo "⚠️  Production server response: HTTP $response"
    echo "💡 Railway deployment may still be in progress. Check Railway dashboard."
fi

echo ""
echo "📋 Next steps:"
echo "   1. Update ElevenLabs tool configuration if needed"
echo "   2. Test the AI agent with the updated system"
echo "   3. Verify sports exam times show 07:00-08:40"
echo "   4. Confirm prices are not shown in initial responses"
