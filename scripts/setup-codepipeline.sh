#!/bin/bash

# Script to set up and deploy using AWS CodePipeline
set -e

# Configuration
APP_NAME="visitor-sign-in-app"
ENVIRONMENT="production"
REGION="us-east-1"
STACK_NAME="${APP_NAME}-pipeline"
ARTIFACT_BUCKET="${APP_NAME}-artifacts"
BRANCH_NAME="main"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Prompt for configuration values
read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter environment name (production, staging, development) [$ENVIRONMENT]: " input
ENVIRONMENT=${input:-$ENVIRONMENT}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

read -p "Enter CodeCommit repository name [$APP_NAME]: " input
REPOSITORY_NAME=${input:-$APP_NAME}

read -p "Enter branch name [$BRANCH_NAME]: " input
BRANCH_NAME=${input:-$BRANCH_NAME}

read -p "Enter Elastic Beanstalk application name [$APP_NAME]: " input
EB_APP_NAME=${input:-$APP_NAME}

read -p "Enter Elastic Beanstalk environment name [${APP_NAME}-${ENVIRONMENT}]: " input
EB_ENV_NAME=${input:-"${APP_NAME}-${ENVIRONMENT}"}

read -p "Enter S3 artifact bucket name [$ARTIFACT_BUCKET]: " input
ARTIFACT_BUCKET=${input:-$ARTIFACT_BUCKET}

read -p "Enter Stack name [$STACK_NAME]: " input
STACK_NAME=${input:-$STACK_NAME}

# Prompt for database password
read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Create S3 bucket for artifacts if it doesn't exist
echo -e "${YELLOW}Checking if S3 artifact bucket exists...${NC}"
if ! aws s3api head-bucket --bucket "$ARTIFACT_BUCKET" 2>/dev/null; then
    echo -e "${YELLOW}Creating S3 bucket for artifacts: $ARTIFACT_BUCKET${NC}"
    aws s3 mb s3://$ARTIFACT_BUCKET --region $REGION
    aws s3api put-bucket-versioning --bucket $ARTIFACT_BUCKET --versioning-configuration Status=Enabled
    echo -e "${GREEN}S3 bucket created successfully!${NC}"
else
    echo -e "${GREEN}S3 bucket already exists!${NC}"
fi

# Deploy CloudFormation stack for CodePipeline
echo -e "${YELLOW}Deploying CloudFormation stack for CodePipeline...${NC}"
aws cloudformation deploy \
    --template-file ../deploy/codepipeline.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        AppName=$APP_NAME \
        EnvironmentName=$ENVIRONMENT \
        RepositoryName=$REPOSITORY_NAME \
        BranchName=$BRANCH_NAME \
        ElasticBeanstalkApplicationName=$EB_APP_NAME \
        ElasticBeanstalkEnvironmentName=$EB_ENV_NAME \
        DatabasePassword=$DB_PASSWORD \
        ArtifactBucketName=$ARTIFACT_BUCKET \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudFormation stack deployed successfully!${NC}"
    
    # Get repository URL
    REPO_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='RepositoryCloneUrlHttp'].OutputValue" \
        --output text \
        --region $REGION)
    
    # Get pipeline URL
    PIPELINE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='PipelineURL'].OutputValue" \
        --output text \
        --region $REGION)
    
    echo -e "${GREEN}===========================================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}===========================================================${NC}"
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Clone your CodeCommit repository:"
    echo -e "   ${GREEN}git clone $REPO_URL${NC}"
    echo -e "2. Push your code to the repository:"
    echo -e "   ${GREEN}git push${NC}"
    echo -e "3. Monitor your pipeline at:"
    echo -e "   ${GREEN}$PIPELINE_URL${NC}"
    echo -e "${GREEN}===========================================================${NC}"
else
    echo -e "${RED}Failed to deploy CloudFormation stack.${NC}"
    exit 1
fi