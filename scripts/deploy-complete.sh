#!/bin/bash

# This script deploys the complete Visitor Sign-In application including scheduled events

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Authenticate with AWS (handles both standard credentials and SSO)
check_aws_auth || exit 1

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"

echo "=== Visitor Sign-In App Complete Deployment ==="
echo "This script will deploy the main application and scheduled events resources."

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

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}

# Step 1: Deploy the main application stack using CodePipeline
echo "Step 1: Deploying main application stack..."
./setup-codepipeline.sh

# Check if the first step was successful
if [ $? -ne 0 ]; then
  echo "Error: Main application stack deployment failed."
  exit 1
fi

# Wait for the main stack to complete
echo "Waiting for main stack deployment to complete..."
aws cloudformation wait stack-create-complete \
  --stack-name "${APP_NAME}-${ENV_NAME}" \
  --region $REGION || true

# Step 2: Get database security group ID
echo "Step 2: Fetching database security group ID..."
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

# Step 3: Deploy the scheduled events resources
echo "Step 3: Deploying scheduled events resources..."
./setup-scheduled-events.sh

# Check if the scheduled events deployment was successful
if [ $? -ne 0 ]; then
  echo "Error: Scheduled events resources deployment failed."
  exit 1
fi

# Step 4: Get Elastic Beanstalk environment URL
echo "Step 4: Fetching Elastic Beanstalk environment URL..."
EB_URL=$(aws cloudformation describe-stacks \
  --stack-name "${APP_NAME}-${ENV_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ElasticBeanstalkURL'].OutputValue" \
  --output text \
  --region $REGION)

if [ -z "$EB_URL" ]; then
  echo "Warning: Could not find Elastic Beanstalk environment URL."
else
  echo "Elastic Beanstalk environment URL: $EB_URL"
  
  # Test the health check endpoint
  echo "Testing health check endpoint..."
  HEALTH_CHECK_URL="${EB_URL}/api/health"
  echo "Health check URL: $HEALTH_CHECK_URL"
  curl -s "$HEALTH_CHECK_URL" | jq || echo "Could not connect to health check endpoint."
fi

echo ""
echo "=== Deployment Complete ==="
echo "You can monitor your application in the AWS Console:"
echo "- CodePipeline: https://console.aws.amazon.com/codesuite/codepipeline/pipelines?region=$REGION"
echo "- Elastic Beanstalk: https://console.aws.amazon.com/elasticbeanstalk/home?region=$REGION#/environments"
echo "- CloudWatch: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:"
echo ""
echo "For further details, see the deployment guides in the deploy/ directory."