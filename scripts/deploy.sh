#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display header
echo -e "${GREEN}===== Visitor Sign-In App - AWS Deployment Script =====${NC}"
echo "This script will deploy the application to AWS Elastic Beanstalk"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${YELLOW}Elastic Beanstalk CLI is not installed. Installing now...${NC}"
    pip install awsebcli
fi

# Ensure we're at the root of the project
if [ ! -f "server.js" ]; then
    echo -e "${RED}Error: Run this script from the root of the project.${NC}"
    exit 1
fi

# Create a deployment package
echo -e "${GREEN}Creating deployment package...${NC}"

# Clean up previous builds
rm -rf deploy.zip dist

# Create distribution directory
mkdir -p dist

# Copy all necessary files
cp -r server.js database.js schema.js email-service.js package.json package-lock.json next.js-frontend .elasticbeanstalk .ebextensions dist/

# Install production dependencies
echo -e "${GREEN}Installing production dependencies...${NC}"
cd dist
npm ci --production
cd ..

# Create deployment package
echo -e "${GREEN}Creating zip archive...${NC}"
cd dist
zip -r ../deploy.zip .
cd ..

echo -e "${GREEN}Deployment package created: deploy.zip${NC}"

# Ask if the user wants to deploy now
read -p "Do you want to deploy to AWS Elastic Beanstalk now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    # Initialize EB if not already done
    if [ ! -d ".elasticbeanstalk" ]; then
        echo -e "${YELLOW}Initializing Elastic Beanstalk...${NC}"
        eb init
    fi
    
    # Deploy to EB
    echo -e "${GREEN}Deploying to Elastic Beanstalk...${NC}"
    eb deploy
    
    # Check deployment status
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Deployment successful!${NC}"
        # Get the EB environment URL
        ENV_URL=$(eb status | grep CNAME | awk '{print $2}')
        echo -e "${GREEN}Application URL: http://$ENV_URL${NC}"
    else
        echo -e "${RED}Deployment failed. Check the logs for more information.${NC}"
    fi
else
    echo -e "${YELLOW}Deployment skipped. You can deploy manually using:${NC}"
    echo "  eb deploy"
fi

echo -e "${GREEN}===== Deployment process completed =====${NC}"