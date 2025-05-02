#!/bin/bash

# Script to deploy the CodePipeline CloudFormation stack

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Authenticate with AWS (handles both standard credentials and SSO)
check_aws_auth || exit 1

# Set default values
APP_NAME="visitor-sign-in-app"
ENV_NAME="production"
REGION="us-east-1"
REPO_NAME="visitor-sign-in-app"
BRANCH_NAME="main"
EB_APP_NAME="visitor-sign-in-app"
EB_ENV_NAME="visitor-sign-in-app-production"
S3_BUCKET_NAME="visitor-app-artifacts"
DB_NAME="visitor_app"
DB_USERNAME="postgres"
DB_PORT="5432"
EMAIL_SERVICE_ENABLED="true"

echo "=== Deploying CodePipeline CloudFormation Stack ==="
echo "This script will create all necessary resources for CI/CD pipeline deployment."

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
read -p "CodeCommit repository name [$REPO_NAME]: " REPO_NAME_INPUT
read -p "Branch name [$BRANCH_NAME]: " BRANCH_NAME_INPUT
read -p "Elastic Beanstalk application name [$EB_APP_NAME]: " EB_APP_NAME_INPUT
read -p "Elastic Beanstalk environment name [$EB_ENV_NAME]: " EB_ENV_NAME_INPUT
read -p "S3 artifact bucket name [$S3_BUCKET_NAME]: " S3_BUCKET_NAME_INPUT
read -p "Database name [$DB_NAME]: " DB_NAME_INPUT
read -p "Database username [$DB_USERNAME]: " DB_USERNAME_INPUT
read -p "Database port [$DB_PORT]: " DB_PORT_INPUT
read -p "Email service enabled (true/false) [$EMAIL_SERVICE_ENABLED]: " EMAIL_SERVICE_ENABLED_INPUT
read -s -p "Database password: " DB_PASSWORD
echo
read -s -p "Session secret: " SESSION_SECRET
echo

# Use user inputs if provided
APP_NAME=${APP_NAME_INPUT:-$APP_NAME}
ENV_NAME=${ENV_NAME_INPUT:-$ENV_NAME}
REGION=${REGION_INPUT:-$REGION}
REPO_NAME=${REPO_NAME_INPUT:-$REPO_NAME}
BRANCH_NAME=${BRANCH_NAME_INPUT:-$BRANCH_NAME}
EB_APP_NAME=${EB_APP_NAME_INPUT:-$EB_APP_NAME}
EB_ENV_NAME=${EB_ENV_NAME_INPUT:-$EB_ENV_NAME}
S3_BUCKET_NAME=${S3_BUCKET_NAME_INPUT:-$S3_BUCKET_NAME}
DB_NAME=${DB_NAME_INPUT:-$DB_NAME}
DB_USERNAME=${DB_USERNAME_INPUT:-$DB_USERNAME}
DB_PORT=${DB_PORT_INPUT:-$DB_PORT}
EMAIL_SERVICE_ENABLED=${EMAIL_SERVICE_ENABLED_INPUT:-$EMAIL_SERVICE_ENABLED}
STACK_NAME="${APP_NAME}-${ENV_NAME}"

# Store the database password in Parameter Store
echo "Storing database password in Parameter Store..."
aws ssm put-parameter \
  --name "/visitor-sign-in-app/database-password" \
  --type "SecureString" \
  --value "$DB_PASSWORD" \
  --overwrite \
  --region $REGION

# Store session secret in Parameter Store
echo "Storing session secret in Parameter Store..."
aws ssm put-parameter \
  --name "/visitor-sign-in-app/session-secret" \
  --type "SecureString" \
  --value "$SESSION_SECRET" \
  --overwrite \
  --region $REGION

# Create S3 bucket for build artifacts
echo "Creating S3 bucket for build artifacts..."
aws s3api create-bucket \
  --bucket $S3_BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION || true

# Enable versioning on the bucket
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET_NAME \
  --versioning-configuration Status=Enabled \
  --region $REGION

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack for CodePipeline..."
aws cloudformation deploy \
  --template-file ../deploy/codepipeline.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --parameter-overrides \
    AppName=$APP_NAME \
    EnvironmentName=$ENV_NAME \
    RepositoryName=$REPO_NAME \
    BranchName=$BRANCH_NAME \
    ElasticBeanstalkApplicationName=$EB_APP_NAME \
    ElasticBeanstalkEnvironmentName=$EB_ENV_NAME \
    DatabasePassword=$DB_PASSWORD \
    DatabaseName=$DB_NAME \
    DatabaseUsername=$DB_USERNAME \
    DatabasePort=$DB_PORT \
    EmailServiceEnabled=$EMAIL_SERVICE_ENABLED \
    SessionSecret=$SESSION_SECRET \
    ArtifactBucketName=$S3_BUCKET_NAME \
  --capabilities CAPABILITY_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "=== CodePipeline Stack Deployed Successfully ==="
  
  # Get CodeCommit repository URL
  REPO_URL_HTTP=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='RepositoryCloneUrlHttp'].OutputValue" \
    --output text \
    --region $REGION)
  
  REPO_URL_SSH=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='RepositoryCloneUrlSsh'].OutputValue" \
    --output text \
    --region $REGION)
  
  PIPELINE_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='PipelineURL'].OutputValue" \
    --output text \
    --region $REGION)
  
  echo "CodeCommit Repository URL (HTTPS): $REPO_URL_HTTP"
  echo "CodeCommit Repository URL (SSH): $REPO_URL_SSH"
  echo "CodePipeline URL: $PIPELINE_URL"
  echo ""
  echo "Next steps:"
  echo "1. Clone the repository"
  echo "2. Copy your code to the repository"
  echo "3. Commit and push to the repository"
  echo "4. Monitor the pipeline in the AWS Console"
else
  echo "=== Deployment Failed ==="
  echo "Check the CloudFormation console for more details."
  exit 1
fi