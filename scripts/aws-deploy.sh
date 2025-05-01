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
echo "This script will prepare and deploy the application to AWS Elastic Beanstalk"
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

# Clean up and prepare deploy directory
echo -e "${YELLOW}Cleaning up previous deployment files...${NC}"
rm -rf deploy/server.js deploy/database.js deploy/schema.js deploy/email-service.js deploy/next.js-frontend deploy/.elasticbeanstalk deploy/.ebextensions deploy/node_modules

# Copy necessary files to deploy directory
echo -e "${YELLOW}Copying files to deploy directory...${NC}"
cp -r server.js database.js schema.js email-service.js deploy/
cp -r next.js-frontend deploy/
cp -r .elasticbeanstalk .ebextensions Procfile deploy/

# Install production dependencies in deploy directory
echo -e "${GREEN}Installing production dependencies...${NC}"
cd deploy
npm ci --production
cd ..

# Create deployment package
echo -e "${GREEN}Creating zip archive...${NC}"
cd deploy
zip -r ../visitor-app-deploy.zip .
cd ..

echo -e "${GREEN}Deployment package created: visitor-app-deploy.zip${NC}"

# Ask if the user wants to deploy now
read -p "Do you want to deploy to AWS Elastic Beanstalk now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    # Initialize EB if not already done
    cd deploy
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
    cd ..
else
    echo -e "${YELLOW}Deployment skipped. You can deploy manually using:${NC}"
    echo "  cd deploy && eb deploy"
fi

echo -e "${GREEN}===== Deployment process completed =====${NC}"