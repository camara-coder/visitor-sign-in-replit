#!/bin/bash

# Script to deploy the scheduled events CloudFormation stack

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Authenticate with AWS (handles both standard credentials and SSO)
check_aws_auth || exit 1

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
CREATE_ALARMS="true"
STACK_NAME="${APP_NAME}-${ENV_NAME}-scheduled-events"

echo "=== Deploying Scheduled Events Resources ==="
echo "This script will create CloudWatch resources, EventBridge rules, and other components for the scheduled events module."

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
read -p "Create CloudWatch alarms? (true/false) [$CREATE_ALARMS]: " CREATE_ALARMS_INPUT

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
CREATE_ALARMS=${CREATE_ALARMS_INPUT:-$CREATE_ALARMS}
STACK_NAME="${APP_NAME}-${ENV_NAME}-scheduled-events"

# Get the database security group ID
echo "Fetching database security group ID..."
DB_SECURITY_GROUP_ID=$(aws cloudformation describe-stacks \
  --stack-name "${APP_NAME}-${ENV_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='DBSecurityGroupId'].OutputValue" \
  --output text \
  --region $REGION)

if [ -z "$DB_SECURITY_GROUP_ID" ]; then
  echo "Error: Could not find database security group ID."
  read -p "Enter database security group ID manually: " DB_SECURITY_GROUP_ID
  if [ -z "$DB_SECURITY_GROUP_ID" ]; then
    echo "No security group ID provided. Exiting."
    exit 1
  fi
fi

echo "Using database security group ID: $DB_SECURITY_GROUP_ID"

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack for scheduled events..."
aws cloudformation deploy \
  --template-file ../deploy/scheduled-events-resources.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides \
    AppName=$APP_NAME \
    EnvironmentName=$ENV_NAME \
    DatabaseSecurityGroupId=$DB_SECURITY_GROUP_ID \
    CreateCloudWatchAlarms=$CREATE_ALARMS \
  --capabilities CAPABILITY_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "=== Scheduled Events Resources Deployed Successfully ==="
  
  # Get outputs
  LOG_GROUP_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='LogGroupName'].OutputValue" \
    --output text \
    --region $REGION)
  
  EVENT_BRIDGE_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='EventBridgeRoleArn'].OutputValue" \
    --output text \
    --region $REGION)
  
  echo "CloudWatch Log Group: $LOG_GROUP_NAME"
  echo "EventBridge Role ARN: $EVENT_BRIDGE_ROLE_ARN"
  echo ""
  echo "You can view all resources in the AWS Console:"
  echo "https://console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks/stackinfo?stackId=$STACK_NAME"
else
  echo "=== Deployment Failed ==="
  echo "Check the CloudFormation console for more details."
  exit 1
fi