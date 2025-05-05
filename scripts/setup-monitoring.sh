#!/bin/bash

# Script to deploy the monitoring CloudFormation stack for Visitor Sign-In App

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
STACK_NAME="${APP_NAME}-${ENV_NAME}-monitoring"
ALARM_THRESHOLD_CPU=80
ALARM_THRESHOLD_MEMORY=75
ALARM_THRESHOLD_5XX=5
ALARM_EVALUATION_PERIODS=3

# Display header
echo -e "${BLUE}===== Visitor Sign-In App - Monitoring Setup =====${NC}"
echo -e "This script will create CloudWatch dashboards, alarms, and SNS topics for monitoring."
echo ""

# Authenticate with AWS (handles both standard credentials and SSO)
echo -e "${YELLOW}Validating AWS credentials...${NC}"
check_aws_auth || exit 1

# Ask for confirmation
read -p "Continue with deployment? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
  echo -e "${YELLOW}Deployment canceled.${NC}"
  exit 0
fi

# Get inputs from user
echo -e "${CYAN}== Step 1: Collecting Configuration ==${NC}"
echo "Please provide the following configuration values (press Enter to use defaults):"

read -p "Application name [$APP_NAME]: " APP_NAME_INPUT
read -p "Environment name [$ENV_NAME]: " ENV_NAME_INPUT
read -p "AWS region [$REGION]: " REGION_INPUT
read -p "CPU Utilization Alarm Threshold (%) [$ALARM_THRESHOLD_CPU]: " CPU_THRESHOLD_INPUT
read -p "Memory Utilization Alarm Threshold (%) [$ALARM_THRESHOLD_MEMORY]: " MEMORY_THRESHOLD_INPUT
read -p "HTTP 5XX Error Rate Threshold [$ALARM_THRESHOLD_5XX]: " ERROR_THRESHOLD_INPUT
read -p "Alarm Evaluation Periods [$ALARM_EVALUATION_PERIODS]: " EVAL_PERIODS_INPUT

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
ALARM_THRESHOLD_CPU=${CPU_THRESHOLD_INPUT:-$ALARM_THRESHOLD_CPU}
ALARM_THRESHOLD_MEMORY=${MEMORY_THRESHOLD_INPUT:-$ALARM_THRESHOLD_MEMORY}
ALARM_THRESHOLD_5XX=${ERROR_THRESHOLD_INPUT:-$ALARM_THRESHOLD_5XX}
ALARM_EVALUATION_PERIODS=${EVAL_PERIODS_INPUT:-$ALARM_EVALUATION_PERIODS}
STACK_NAME="${APP_NAME}-${ENV_NAME}-monitoring"

# Get notification email with validation
while true; do
  read -p "Email for notifications: " NOTIFICATION_EMAIL
  
  if [ -z "$NOTIFICATION_EMAIL" ]; then
    echo -e "${RED}Error: Notification email is required.${NC}"
    continue
  fi
  
  # Simple email validation
  if [[ ! "$NOTIFICATION_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo -e "${RED}Error: Invalid email format. Please enter a valid email address.${NC}"
    continue
  fi
  
  break
done

# Step 2: Discover environment resources
echo -e "${CYAN}== Step 2: Discovering Environment Resources ==${NC}"

# Get Elastic Beanstalk environment ID
echo -e "${YELLOW}Fetching Elastic Beanstalk environment ID...${NC}"
EB_ENV_ID=$(aws elasticbeanstalk describe-environments \
  --environment-names "${APP_NAME}-${ENV_NAME}" \
  --query "Environments[0].EnvironmentId" \
  --output text \
  --region $REGION)

if [ -z "$EB_ENV_ID" ] || [ "$EB_ENV_ID" == "None" ]; then
  echo -e "${RED}Could not find Elastic Beanstalk environment ID.${NC}"
  echo -e "${YELLOW}Checking for alternative environment names...${NC}"
  
  # Get available environments
  AVAILABLE_ENVS=$(aws elasticbeanstalk describe-environments \
    --query "Environments[].EnvironmentName" \
    --output text \
    --region $REGION)
  
  if [ -n "$AVAILABLE_ENVS" ]; then
    echo -e "${YELLOW}Available environments:${NC}"
    echo "$AVAILABLE_ENVS" | tr '\t' '\n'
    read -p "Enter environment name from the list above: " SELECTED_ENV
    
    if [ -n "$SELECTED_ENV" ]; then
      EB_ENV_ID=$(aws elasticbeanstalk describe-environments \
        --environment-names "$SELECTED_ENV" \
        --query "Environments[0].EnvironmentId" \
        --output text \
        --region $REGION)
    fi
  fi
  
  # If still no environment ID, ask for manual input
  if [ -z "$EB_ENV_ID" ] || [ "$EB_ENV_ID" == "None" ]; then
    read -p "Enter Elastic Beanstalk environment ID manually (e-xxxxxxxxxx): " EB_ENV_ID
    if [ -z "$EB_ENV_ID" ]; then
      echo -e "${RED}No environment ID provided. Exiting.${NC}"
      exit 1
    fi
  fi
fi

echo -e "${GREEN}Using Elastic Beanstalk environment ID: $EB_ENV_ID${NC}"

# Get RDS instance ID if available
echo -e "${YELLOW}Checking for RDS instances...${NC}"
RDS_INSTANCE_ID=$(aws rds describe-db-instances \
  --query "DBInstances[?DBInstanceIdentifier!=null] | [?contains(DBInstanceIdentifier, '${APP_NAME}')].DBInstanceIdentifier" \
  --output text \
  --region $REGION)

if [ -n "$RDS_INSTANCE_ID" ] && [ "$RDS_INSTANCE_ID" != "None" ]; then
  echo -e "${GREEN}Found RDS instance: $RDS_INSTANCE_ID${NC}"
  INCLUDE_RDS="true"
else
  echo -e "${YELLOW}No RDS instance found. RDS monitoring will not be included.${NC}"
  INCLUDE_RDS="false"
fi

# Summary of setup
echo -e "${CYAN}== Step 3: Deploying Monitoring Resources ==${NC}"
echo -e "${YELLOW}Configuration Summary:${NC}"
echo -e "Application Name:      ${CYAN}$APP_NAME${NC}"
echo -e "Environment Name:      ${CYAN}$ENV_NAME${NC}"
echo -e "Region:                ${CYAN}$REGION${NC}"
echo -e "EB Environment ID:     ${CYAN}$EB_ENV_ID${NC}"
echo -e "CPU Alarm Threshold:   ${CYAN}${ALARM_THRESHOLD_CPU}%${NC}"
echo -e "Memory Alarm Threshold:${CYAN}${ALARM_THRESHOLD_MEMORY}%${NC}"
echo -e "5XX Error Threshold:   ${CYAN}$ALARM_THRESHOLD_5XX${NC}"
echo -e "Notification Email:    ${CYAN}$NOTIFICATION_EMAIL${NC}"
echo -e "Include RDS Monitoring:${CYAN}$INCLUDE_RDS${NC}"
echo ""

read -p "Proceed with deployment? (y/n): " DEPLOY_CONFIRM
if [[ $DEPLOY_CONFIRM != "y" && $DEPLOY_CONFIRM != "Y" ]]; then
  echo -e "${YELLOW}Deployment canceled.${NC}"
  exit 0
fi

# Create a file with timestamp to keep track of deployments
mkdir -p ../.deployment-history
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
DEPLOYMENT_FILE="../.deployment-history/monitoring-setup-$TIMESTAMP.txt"

# Deploy CloudFormation stack
echo -e "${YELLOW}Deploying CloudFormation stack for monitoring resources...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"

aws cloudformation deploy \
  --template-file ../deploy/monitoring-resources.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides \
    AppName=$APP_NAME \
    EnvironmentName=$ENV_NAME \
    EnvironmentId=$EB_ENV_ID \
    NotificationEmail=$NOTIFICATION_EMAIL \
    CPUUtilizationThreshold=$ALARM_THRESHOLD_CPU \
    MemoryUtilizationThreshold=$ALARM_THRESHOLD_MEMORY \
    HTTP5XXErrorThreshold=$ALARM_THRESHOLD_5XX \
    AlarmEvaluationPeriods=$ALARM_EVALUATION_PERIODS \
    IncludeRDSMonitoring=$INCLUDE_RDS \
  --tags \
    Application=$APP_NAME \
    Environment=$ENV_NAME \
    Service=Monitoring

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}=== Monitoring Resources Deployed Successfully ===${NC}"
  
  # Get CloudFormation outputs
  echo -e "${YELLOW}Retrieving deployment information...${NC}"
  
  # Get dashboard URL
  DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='DashboardURL'].OutputValue" \
    --output text \
    --region $REGION)
    
  # Get SNS topic ARN
  SNS_TOPIC_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='NotificationTopicARN'].OutputValue" \
    --output text \
    --region $REGION)
  
  # Write deployment information to file
  cat > $DEPLOYMENT_FILE << EOL
Monitoring Setup Information
===========================
Timestamp: $(date)
Application: $APP_NAME
Environment: $ENV_NAME
Region: $REGION

Resources:
- CloudFormation Stack: $STACK_NAME
- Elastic Beanstalk Environment ID: $EB_ENV_ID
- CloudWatch Dashboard URL: $DASHBOARD_URL
- SNS Topic ARN: $SNS_TOPIC_ARN

Alarm Configuration:
- CPU Utilization Threshold: ${ALARM_THRESHOLD_CPU}%
- Memory Utilization Threshold: ${ALARM_THRESHOLD_MEMORY}%
- HTTP 5XX Error Threshold: $ALARM_THRESHOLD_5XX
- Evaluation Periods: $ALARM_EVALUATION_PERIODS

Notification:
- Email: $NOTIFICATION_EMAIL
EOL

  echo -e "${GREEN}CloudWatch Dashboard URL: ${CYAN}$DASHBOARD_URL${NC}"
  echo -e ""
  echo -e "${YELLOW}IMPORTANT: A confirmation email has been sent to $NOTIFICATION_EMAIL.${NC}"
  echo -e "${YELLOW}You MUST click the confirmation link in that email to receive alarm notifications.${NC}"
  echo -e "${GREEN}Deployment information saved to $DEPLOYMENT_FILE${NC}"
  
  echo -e "${BLUE}===== Next Steps =====${NC}"
  echo -e "1. Confirm the subscription email sent to $NOTIFICATION_EMAIL"
  echo -e "2. View your dashboard at: $DASHBOARD_URL"
  echo -e "3. Consider setting up additional metrics or custom alarms as needed"
else
  echo -e "${RED}=== Deployment Failed ===${NC}"
  echo -e "${YELLOW}Check the CloudFormation console for more details:${NC}"
  echo -e "${CYAN}https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks${NC}"
  exit 1
fi