#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display header
echo -e "${BLUE}===== Visitor Sign-In App - AWS Deployment Script =====${NC}"
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

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not found or expired.${NC}"
    echo -e "Would you like to run the AWS SSO login script? (y/n): "
    read run_sso_login
    
    if [[ $run_sso_login == "y" || $run_sso_login == "Y" ]]; then
        source ./scripts/aws-sso-login.sh
    else
        echo -e "${YELLOW}Please configure your AWS credentials and try again.${NC}"
        exit 1
    fi
fi

# Create a deployment package
echo -e "${GREEN}Creating deployment package...${NC}"

# Clean up previous builds
rm -rf deploy.zip dist

# Create distribution directory
mkdir -p dist

# Copy all necessary files
echo -e "${YELLOW}Copying application files...${NC}"
cp -r server.js database.js schema.js email-service.js scheduled-events-api.js package.json package-lock.json next.js-frontend .elasticbeanstalk .ebextensions dist/

# Additional files needed for the application
if [ -d "scripts" ]; then
    mkdir -p dist/scripts
    cp scripts/README.md dist/scripts/
fi

# Copy configuration files
if [ -f "Procfile" ]; then
    cp Procfile dist/
fi

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

# Ask for environment
read -p "Enter the environment to deploy to (production, staging, development) [production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

# Ask if the user wants to deploy now
read -p "Do you want to deploy to AWS Elastic Beanstalk now? (y/n): " DEPLOY_NOW

if [[ $DEPLOY_NOW == "y" || $DEPLOY_NOW == "Y" ]]; then
    # Initialize EB if not already done
    if [ ! -d ".elasticbeanstalk" ]; then
        echo -e "${YELLOW}Initializing Elastic Beanstalk...${NC}"
        eb init
    fi
    
    # Deploy to EB
    echo -e "${GREEN}Deploying to Elastic Beanstalk environment: $ENVIRONMENT...${NC}"
    eb deploy $ENVIRONMENT
    
    # Check deployment status
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Deployment successful!${NC}"
        # Get the EB environment URL
        ENV_URL=$(eb status $ENVIRONMENT | grep CNAME | awk '{print $2}')
        echo -e "${GREEN}Application URL: https://$ENV_URL${NC}"
        
        # Save deployment info
        DEPLOY_TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
        mkdir -p .deployment-history
        echo "Deployment to $ENVIRONMENT completed at $DEPLOY_TIMESTAMP" >> .deployment-history/deploy-log.txt
        echo "Environment URL: https://$ENV_URL" >> .deployment-history/deploy-log.txt
        echo "" >> .deployment-history/deploy-log.txt
        
        echo -e "${YELLOW}Deployment information saved to .deployment-history/deploy-log.txt${NC}"
    else
        echo -e "${RED}Deployment failed. Check the logs for more information.${NC}"
        echo -e "${YELLOW}Try running: ${NC}eb logs $ENVIRONMENT"
    fi
else
    echo -e "${YELLOW}Deployment skipped. You can deploy manually using:${NC}"
    echo "  eb deploy $ENVIRONMENT"
fi

echo -e "${BLUE}===== Deployment process completed =====${NC}"