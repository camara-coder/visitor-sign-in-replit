#!/bin/bash
# Script to deploy directly to Elastic Beanstalk using a CloudFormation template

# Exit on error
set -e

# Configuration variables
STACK_NAME="visitor-signin-stack"
TEMPLATE_FILE="../deploy/elasticbeanstalk-direct.yaml"
REGION="us-east-1"
APP_NAME="visitor-signin-app"
ENV_NAME="visitor-signin-prod"
# Platform version is now hardcoded in the template
# PLATFORM_VERSION="Node.js 20"
INSTANCE_TYPE="t2.micro"
ENVIRONMENT="production"

# Database settings
DB_NAME="visitordb"
DB_USERNAME="postgres"
DB_PORT="5432"

# Warn about sensitive parameters
echo "WARNING: You will need to provide the database password and session secret."
echo "These values should not be stored in scripts or source control."
echo ""

# Get DB password (masked input)
read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Get session secret (masked input)
read -s -p "Enter session secret: " SESSION_SECRET
echo ""

# Get email service flag
read -p "Enable email service? (true/false, default: false): " EMAIL_SERVICE_ENABLED
EMAIL_SERVICE_ENABLED=${EMAIL_SERVICE_ENABLED:-false}

echo ""
echo "Deploying Elastic Beanstalk environment..."

# Deploy CloudFormation stack
aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    AppName="$APP_NAME" \
    EnvironmentName="$ENVIRONMENT" \
    ElasticBeanstalkApplicationName="$APP_NAME" \
    ElasticBeanstalkEnvironmentName="$ENV_NAME" \
    InstanceType="$INSTANCE_TYPE" \
    DatabaseName="$DB_NAME" \
    DatabaseUsername="$DB_USERNAME" \
    DatabasePassword="$DB_PASSWORD" \
    DatabasePort="$DB_PORT" \
    SessionSecret="$SESSION_SECRET" \
    EmailServiceEnabled="$EMAIL_SERVICE_ENABLED"

echo ""
echo "CloudFormation stack deployment initiated."
echo "Checking stack status..."

# Wait for stack to complete
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME" || aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"

# Get the Elastic Beanstalk environment URL
EB_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ApplicationURL'].OutputValue" --output text)

echo ""
echo "Deployment completed successfully!"
echo "Application URL: $EB_URL"
echo ""
echo "Next steps:"
echo "1. Bundle your application code: zip -r deploy.zip . -x \"*.git*\" -x \"terraform/*\" -x \"lambda-functions/*\" -x \"lambda/*\""
echo "2. Upload the bundle to Elastic Beanstalk using the AWS Console or EB CLI"
echo "   - AWS Console: Go to Elastic Beanstalk > Environments > $ENV_NAME > Upload and Deploy"
echo "   - EB CLI: eb deploy $ENV_NAME"
echo ""
echo "For more details about using the EB CLI:"
echo "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html"