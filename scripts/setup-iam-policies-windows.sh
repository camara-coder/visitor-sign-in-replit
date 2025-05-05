#!/bin/bash

# Windows-compatible IAM setup script for CodePipeline deployment
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="visitor-sign-in-app"
REGION="us-east-1"
CODEPIPELINE_ROLE_NAME="${APP_NAME}-codepipeline-role"
CODEBUILD_ROLE_NAME="${APP_NAME}-codebuild-role"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}AWS credentials not found or expired. Please configure AWS credentials.${NC}"
    exit 1
else
    echo -e "${GREEN}AWS credentials are valid.${NC}"
    echo -e "${YELLOW}Using AWS Identity:${NC}"
    aws sts get-caller-identity
    echo ""
fi

# Prompt for configuration values
read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

read -p "Enter CodePipeline role name [${APP_NAME}-codepipeline-role]: " input
CODEPIPELINE_ROLE_NAME=${input:-"${APP_NAME}-codepipeline-role"}

read -p "Enter CodeBuild role name [${APP_NAME}-codebuild-role]: " input
CODEBUILD_ROLE_NAME=${input:-"${APP_NAME}-codebuild-role"}

# Using approach that works better on Windows - direct JSON strings
echo -e "${YELLOW}Creating IAM roles and policies...${NC}"

# Create CodePipeline role
echo -e "${YELLOW}Creating CodePipeline role...${NC}"
# Use a string for the trust policy instead of a file
CODEPIPELINE_TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Create CodeBuild role
echo -e "${YELLOW}Creating CodeBuild role...${NC}"
# Use a string for the trust policy instead of a file
CODEBUILD_TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Create basic CodePipeline policy
CODEPIPELINE_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "codebuild:*",
        "elasticbeanstalk:*",
        "iam:PassRole",
        "cloudformation:*",
        "codecommit:*",
        "codestar-connections:*"
      ],
      "Resource": "*"
    }
  ]
}'

# Create basic CodeBuild policy
CODEBUILD_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:*",
        "s3:*",
        "ecr:*",
        "ssm:GetParameters"
      ],
      "Resource": "*"
    }
  ]
}'

# Create roles with inline policies
echo -e "${YELLOW}Creating roles with inline policies...${NC}"

# Create CodePipeline Role
echo -e "${YELLOW}Creating CodePipeline role ${CODEPIPELINE_ROLE_NAME}...${NC}"
aws iam create-role \
  --role-name "$CODEPIPELINE_ROLE_NAME" \
  --assume-role-policy-document "$CODEPIPELINE_TRUST_POLICY" \
  --region "$REGION" || true

# Create CodeBuild Role
echo -e "${YELLOW}Creating CodeBuild role ${CODEBUILD_ROLE_NAME}...${NC}"
aws iam create-role \
  --role-name "$CODEBUILD_ROLE_NAME" \
  --assume-role-policy-document "$CODEBUILD_TRUST_POLICY" \
  --region "$REGION" || true

# Attach policies to roles
echo -e "${YELLOW}Attaching policies to roles...${NC}"

# Attach policy to CodePipeline role
echo -e "${YELLOW}Attaching policy to CodePipeline role...${NC}"
aws iam put-role-policy \
  --role-name "$CODEPIPELINE_ROLE_NAME" \
  --policy-name "${APP_NAME}-codepipeline-policy" \
  --policy-document "$CODEPIPELINE_POLICY" \
  --region "$REGION" || true

# Attach policy to CodeBuild role
echo -e "${YELLOW}Attaching policy to CodeBuild role...${NC}"
aws iam put-role-policy \
  --role-name "$CODEBUILD_ROLE_NAME" \
  --policy-name "${APP_NAME}-codebuild-policy" \
  --policy-document "$CODEBUILD_POLICY" \
  --region "$REGION" || true

echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}IAM Setup Complete!${NC}"
echo -e "${GREEN}===========================================================${NC}"
echo -e "CodePipeline Role: ${YELLOW}$CODEPIPELINE_ROLE_NAME${NC}"
echo -e "CodeBuild Role: ${YELLOW}$CODEBUILD_ROLE_NAME${NC}"
echo -e ""
echo -e "You can now use these roles in your CloudFormation template."
echo -e "${GREEN}===========================================================${NC}"