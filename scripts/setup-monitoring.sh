#!/bin/bash

# Script to deploy the monitoring CloudFormation stack

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
STACK_NAME="${APP_NAME}-${ENV_NAME}-monitoring"

echo "=== Deploying Monitoring Resources ==="
echo "This script will create CloudWatch dashboards, alarms, and SNS topics for monitoring."

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
read -p "Email for notifications: " NOTIFICATION_EMAIL

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
STACK_NAME="${APP_NAME}-${ENV_NAME}-monitoring"

if [ -z "$NOTIFICATION_EMAIL" ]; then
  echo "Error: Notification email is required."
  exit 1
fi

# Get Elastic Beanstalk environment ID
echo "Fetching Elastic Beanstalk environment ID..."
EB_ENV_ID=$(aws elasticbeanstalk describe-environments \
  --environment-names "${APP_NAME}-${ENV_NAME}" \
  --query "Environments[0].EnvironmentId" \
  --output text \
  --region $REGION)

if [ -z "$EB_ENV_ID" ]; then
  echo "Error: Could not find Elastic Beanstalk environment ID."
  read -p "Enter Elastic Beanstalk environment ID manually: " EB_ENV_ID
  if [ -z "$EB_ENV_ID" ]; then
    echo "No environment ID provided. Exiting."
    exit 1
  fi
fi

echo "Using Elastic Beanstalk environment ID: $EB_ENV_ID"

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack for monitoring resources..."
aws cloudformation deploy \
  --template-file ../deploy/monitoring-resources.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides \
    AppName=$APP_NAME \
    EnvironmentName=$ENV_NAME \
    EnvironmentId=$EB_ENV_ID \
    NotificationEmail=$NOTIFICATION_EMAIL

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "=== Monitoring Resources Deployed Successfully ==="
  
  # Get dashboard URL
  DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='DashboardURL'].OutputValue" \
    --output text \
    --region $REGION)
  
  echo "CloudWatch Dashboard URL: $DASHBOARD_URL"
  echo ""
  echo "Note: A confirmation email has been sent to $NOTIFICATION_EMAIL."
  echo "You must click the confirmation link in that email to receive alarm notifications."
else
  echo "=== Deployment Failed ==="
  echo "Check the CloudFormation console for more details."
  exit 1
fi