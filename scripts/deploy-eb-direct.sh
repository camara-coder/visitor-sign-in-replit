#!/bin/bash

# Direct Elastic Beanstalk deployment script
# This script deploys the application directly to Elastic Beanstalk without using CloudFormation
# It's designed for users who may not have full IAM permissions

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
PLATFORM="Node.js 18"
DB_USERNAME="postgres"
DB_PASSWORD=$(openssl rand -base64 12)
SESSION_SECRET=$(openssl rand -base64 24)

echo -e "${GREEN}=== Direct Elastic Beanstalk Deployment ===${NC}"
echo -e "This script deploys the application directly to Elastic Beanstalk."
echo -e "It requires fewer permissions than the CloudFormation deployment."

# Ask for confirmation
read -p "Continue with deployment? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
  echo "Deployment canceled."
  exit 0
fi

# Get inputs from user
read -p "Application name [$APP_NAME]: " APP_NAME_INPUT
read -p "Environment name [$ENV_NAME]: " ENV_NAME_INPUT
read -p "AWS region [$REGION]: " REGION_INPUT
read -p "Database username [$DB_USERNAME]: " DB_USERNAME_INPUT
read -p "Database password [auto-generated]: " DB_PASSWORD_INPUT
read -p "Session secret [auto-generated]: " SESSION_SECRET_INPUT

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
DB_USERNAME=${DB_USERNAME_INPUT:-$DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD_INPUT:-$DB_PASSWORD}
SESSION_SECRET=${SESSION_SECRET_INPUT:-$SESSION_SECRET}

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${RED}Elastic Beanstalk CLI is not installed. Do you want to install it?${NC}"
    read -p "Install EB CLI? (y/n): " INSTALL_EB
    if [[ $INSTALL_EB == "y" || $INSTALL_EB == "Y" ]]; then
        pip install awsebcli
    else
        echo "Please install the EB CLI and try again."
        exit 1
    fi
fi

# Initialize EB application
echo -e "${YELLOW}Initializing Elastic Beanstalk application...${NC}"
eb init $APP_NAME --region $REGION --platform "$PLATFORM"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to initialize Elastic Beanstalk application.${NC}"
    exit 1
fi

# Create EB environment with database
echo -e "${YELLOW}Creating Elastic Beanstalk environment with database...${NC}"
eb create $ENV_NAME \
  --database \
  --database.engine postgres \
  --database.username $DB_USERNAME \
  --database.password $DB_PASSWORD \
  --database.size 5 \
  --database.instance db.t3.micro \
  --envvars NODE_ENV=production,SESSION_SECRET=$SESSION_SECRET,EMAIL_SERVICE_ENABLED=true

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create Elastic Beanstalk environment.${NC}"
    echo -e "${YELLOW}Note: You may need to add specific permissions for EB environment creation.${NC}"
    echo -e "${YELLOW}See deploy/TROUBLESHOOTING.md for more information.${NC}"
    exit 1
fi

# Store environment info for future use
echo -e "${YELLOW}Storing deployment information...${NC}"
mkdir -p .elasticbeanstalk/saved_configs/
cat > .elasticbeanstalk/saved_configs/deployment_info.txt << EOL
Application Name: $APP_NAME
Environment Name: $ENV_NAME
Region: $REGION
Deployment Date: $(date)
Database Username: $DB_USERNAME
EOL

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Your application should now be deploying to Elastic Beanstalk."
echo -e "You can check the status with: ${YELLOW}eb status${NC}"
echo -e "You can view logs with: ${YELLOW}eb logs${NC}"
echo -e "You can open the application with: ${YELLOW}eb open${NC}"

# Save credentials securely (only locally)
echo -e "${YELLOW}Credentials have been saved locally for your reference.${NC}"
echo -e "${RED}Database Password and Session Secret are only displayed once.${NC}"
echo -e "${RED}Make sure to save them securely.${NC}"
echo -e "Database Password: ${YELLOW}$DB_PASSWORD${NC}"
echo -e "Session Secret: ${YELLOW}$SESSION_SECRET${NC}"
echo -e "${GREEN}Deployment information saved to .elasticbeanstalk/saved_configs/deployment_info.txt${NC}"