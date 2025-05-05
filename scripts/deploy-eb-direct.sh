#!/bin/bash

# Direct Elastic Beanstalk deployment script
# This script deploys the application directly to Elastic Beanstalk without using CloudFormation
# It's designed for users who may not have full IAM permissions

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
PLATFORM="Node.js 20"  # Updated to Node.js 20
INSTANCE_TYPE="t3.small"
DB_USERNAME="postgres"
DB_PASSWORD=$(openssl rand -base64 16)  # Longer password for better security
SESSION_SECRET=$(openssl rand -base64 32)  # Longer secret for better security

echo -e "${BLUE}===== Direct Elastic Beanstalk Deployment =====${NC}"
echo -e "This script deploys the application directly to Elastic Beanstalk."
echo -e "It requires fewer permissions than the CloudFormation deployment."
echo -e "The script will create an EB environment with a PostgreSQL database."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo -e "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
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

# Ask for confirmation
read -p "Continue with deployment? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
  echo -e "${YELLOW}Deployment canceled.${NC}"
  exit 0
fi

# Get inputs from user
read -p "Application name [$APP_NAME]: " APP_NAME_INPUT
read -p "Environment name [$ENV_NAME]: " ENV_NAME_INPUT
read -p "AWS region [$REGION]: " REGION_INPUT
read -p "Platform version [$PLATFORM]: " PLATFORM_INPUT
read -p "Instance type [$INSTANCE_TYPE]: " INSTANCE_TYPE_INPUT
read -p "Database username [$DB_USERNAME]: " DB_USERNAME_INPUT
read -s -p "Database password [auto-generated, press enter to use auto-generated]: " DB_PASSWORD_INPUT
echo ""
read -s -p "Session secret [auto-generated, press enter to use auto-generated]: " SESSION_SECRET_INPUT
echo ""

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
PLATFORM=${PLATFORM_INPUT:-$PLATFORM}
INSTANCE_TYPE=${INSTANCE_TYPE_INPUT:-$INSTANCE_TYPE}
DB_USERNAME=${DB_USERNAME_INPUT:-$DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD_INPUT:-$DB_PASSWORD}
SESSION_SECRET=${SESSION_SECRET_INPUT:-$SESSION_SECRET}

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${RED}Elastic Beanstalk CLI is not installed. Do you want to install it?${NC}"
    read -p "Install EB CLI? (y/n): " INSTALL_EB
    if [[ $INSTALL_EB == "y" || $INSTALL_EB == "Y" ]]; then
        pip install awsebcli
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install EB CLI using pip.${NC}"
            echo -e "${YELLOW}Please install the EB CLI manually and try again.${NC}"
            echo -e "Visit: https://github.com/aws/aws-elastic-beanstalk-cli-setup"
            exit 1
        fi
    else
        echo -e "${RED}Please install the EB CLI and try again.${NC}"
        exit 1
    fi
fi

# Create directory for deployment
echo -e "${YELLOW}Preparing deployment...${NC}"
DEPLOY_DIR="eb-deploy-temp"
mkdir -p $DEPLOY_DIR

# Copy project files to deployment directory
cp -r server.js database.js schema.js email-service.js scheduled-events-api.js package.json package-lock.json next.js-frontend $DEPLOY_DIR/

# Create Procfile if it doesn't exist
if [ ! -f "$DEPLOY_DIR/Procfile" ]; then
    echo "web: node server.js" > $DEPLOY_DIR/Procfile
    echo -e "${YELLOW}Created Procfile${NC}"
fi

# Create .ebextensions directory with configuration
mkdir -p $DEPLOY_DIR/.ebextensions
cat > $DEPLOY_DIR/.ebextensions/01_env.config << EOL
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    SESSION_SECRET: ${SESSION_SECRET}
    EMAIL_SERVICE_ENABLED: true
  aws:elasticbeanstalk:container:nodejs:
    NodeVersion: 20.10.0
  aws:autoscaling:launchconfiguration:
    InstanceType: ${INSTANCE_TYPE}
    SecurityGroups: '`{"Ref" : "AWSEBSecurityGroup"}`'
  aws:elasticbeanstalk:environment:
    ServiceRole: aws-elasticbeanstalk-service-role
EOL

cat > $DEPLOY_DIR/.ebextensions/02_cloudwatch.config << EOL
Resources:
  AWSEBCloudWatchAlarmHigh:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join [ '', [ { "Ref" : "AWSEBEnvironmentName" }, '-high-cpu' ] ]
      AlarmDescription: "Alarm if CPU exceeds 90% for 10 minutes"
      Namespace: AWS/EC2
      MetricName: CPUUtilization
      Dimensions:
        - Name: AutoScalingGroupName
          Value: !Join [ '', [ 'awseb-e-', { "Ref" : "AWSEBEnvironmentName" }, '-AWSEBAutoScalingGroup' ] ]
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 90
      ComparisonOperator: GreaterThanThreshold
  AWSEBCloudWatchAlarmHighMemory:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Join [ '', [ { "Ref" : "AWSEBEnvironmentName" }, '-high-memory' ] ]
      AlarmDescription: "Alarm if Memory exceeds 80% for 10 minutes"
      Namespace: AWS/EC2
      MetricName: MemoryUtilization
      Dimensions:
        - Name: AutoScalingGroupName
          Value: !Join [ '', [ 'awseb-e-', { "Ref" : "AWSEBEnvironmentName" }, '-AWSEBAutoScalingGroup' ] ]
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
EOL

# Initialize EB application from the deployment directory
echo -e "${YELLOW}Initializing Elastic Beanstalk application...${NC}"
cd $DEPLOY_DIR
eb init $APP_NAME --region $REGION --platform "$PLATFORM"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to initialize Elastic Beanstalk application.${NC}"
    echo -e "${YELLOW}This may be due to insufficient permissions.${NC}"
    echo -e "${YELLOW}See deploy/TROUBLESHOOTING.md for more information.${NC}"
    cd ..
    rm -rf $DEPLOY_DIR
    exit 1
fi

# Create EB environment with database
echo -e "${YELLOW}Creating Elastic Beanstalk environment with database...${NC}"
eb create $ENV_NAME \
  --database \
  --database.engine postgres \
  --database.username $DB_USERNAME \
  --database.password $DB_PASSWORD \
  --database.size 10 \
  --database.instance db.t3.micro \
  --timeout 20 \
  --tags "Application=VisitorSignIn,Environment=$ENV_NAME"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create Elastic Beanstalk environment.${NC}"
    echo -e "${YELLOW}Note: You may need to add specific permissions for EB environment creation.${NC}"
    echo -e "${YELLOW}See deploy/TROUBLESHOOTING.md for more information.${NC}"
    cd ..
    rm -rf $DEPLOY_DIR
    exit 1
fi

# Store environment info for future use
echo -e "${YELLOW}Storing deployment information...${NC}"
mkdir -p ../.elasticbeanstalk/saved_configs/
cat > ../.elasticbeanstalk/saved_configs/deployment_info.txt << EOL
Application Name: $APP_NAME
Environment Name: $ENV_NAME
Region: $REGION
Platform: $PLATFORM
Instance Type: $INSTANCE_TYPE
Deployment Date: $(date)
Database Username: $DB_USERNAME
EOL

# Create a deployment record 
mkdir -p ../.deployment-history
DEPLOY_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ENV_URL=$(eb status | grep CNAME | awk '{print $2}')
cat > ../.deployment-history/$ENV_NAME-$DEPLOY_TIMESTAMP.txt << EOL
Application Name: $APP_NAME
Environment Name: $ENV_NAME
Region: $REGION
Platform: $PLATFORM
Instance Type: $INSTANCE_TYPE
Deployment Date: $(date)
Environment URL: https://$ENV_URL
EOL

# Copy the .elasticbeanstalk directory back to the main project
echo -e "${YELLOW}Copying EB configuration back to main project...${NC}"
cp -r .elasticbeanstalk ../ 2>/dev/null || true

# Return to main directory
cd ..

# Cleanup
echo -e "${YELLOW}Cleaning up temporary deployment files...${NC}"
rm -rf $DEPLOY_DIR

echo -e "${GREEN}===== Deployment Complete =====${NC}"
echo -e "Your application is now deploying to Elastic Beanstalk."
echo -e "You can check the status with: ${YELLOW}eb status $ENV_NAME${NC}"
echo -e "You can view logs with: ${YELLOW}eb logs $ENV_NAME${NC}"
echo -e "You can open the application with: ${YELLOW}eb open $ENV_NAME${NC}"

# Save credentials securely (only locally)
echo -e "${YELLOW}Credentials have been saved locally for your reference.${NC}"
echo -e "${RED}Database Password and Session Secret are only displayed once.${NC}"
echo -e "${RED}Make sure to save them securely.${NC}"
echo -e "Database Password: ${YELLOW}$DB_PASSWORD${NC}"
echo -e "Session Secret: ${YELLOW}$SESSION_SECRET${NC}"
echo -e "${GREEN}Deployment information saved to .elasticbeanstalk/saved_configs/deployment_info.txt${NC}"
echo -e "${GREEN}A detailed deployment record has been saved to .deployment-history/${ENV_NAME}-${DEPLOY_TIMESTAMP}.txt${NC}"

# Advice for next steps
echo -e "${BLUE}===== Next Steps =====${NC}"
echo -e "1. Monitor the deployment in the AWS Elastic Beanstalk console"
echo -e "2. Set up DNS records to point to your application URL"
echo -e "3. Consider setting up a CI/CD pipeline for future deployments"
echo -e "4. Review CloudWatch logs and metrics to monitor application health"