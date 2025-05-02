#!/bin/bash

# Script to set up IAM policies for CodePipeline deployment
set -e

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Configuration
APP_NAME="visitor-sign-in-app"
REGION="us-east-1"
CODEPIPELINE_ROLE_NAME="${APP_NAME}-codepipeline-role"
CODEBUILD_ROLE_NAME="${APP_NAME}-codebuild-role"

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

# Authenticate with AWS (handles both standard credentials and SSO)
check_aws_auth || exit 1

# Prompt for configuration values
read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

read -p "Enter CodePipeline role name [${APP_NAME}-codepipeline-role]: " input
CODEPIPELINE_ROLE_NAME=${input:-"${APP_NAME}-codepipeline-role"}

read -p "Enter CodeBuild role name [${APP_NAME}-codebuild-role]: " input
CODEBUILD_ROLE_NAME=${input:-"${APP_NAME}-codebuild-role"}

# Create trust policy for CodePipeline
echo -e "${YELLOW}Creating trust policy for CodePipeline...${NC}"
cat > /tmp/codepipeline-trust-policy.json << EOL
{
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
}
EOL

# Create trust policy for CodeBuild
echo -e "${YELLOW}Creating trust policy for CodeBuild...${NC}"
cat > /tmp/codebuild-trust-policy.json << EOL
{
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
}
EOL

# Create or update CodePipeline role
echo -e "${YELLOW}Creating/updating CodePipeline role...${NC}"
aws iam create-role \
  --role-name $CODEPIPELINE_ROLE_NAME \
  --assume-role-policy-document file:///tmp/codepipeline-trust-policy.json \
  --region $REGION || true

# Create or update CodeBuild role
echo -e "${YELLOW}Creating/updating CodeBuild role...${NC}"
aws iam create-role \
  --role-name $CODEBUILD_ROLE_NAME \
  --assume-role-policy-document file:///tmp/codebuild-trust-policy.json \
  --region $REGION || true

# Update CodePipeline policy
echo -e "${YELLOW}Updating CodePipeline policy...${NC}"
sed -i "s/visitor-sign-in-app/$APP_NAME/g" ../deploy/iam_policies/codepipeline-policy.json
sed -i "s/visitor-app-artifacts/${APP_NAME}-artifacts/g" ../deploy/iam_policies/codepipeline-policy.json

# Update CodeBuild policy
echo -e "${YELLOW}Updating CodeBuild policy...${NC}"
sed -i "s/visitor-sign-in-app/$APP_NAME/g" ../deploy/iam_policies/codebuild-policy.json
sed -i "s/visitor-app-artifacts/${APP_NAME}-artifacts/g" ../deploy/iam_policies/codebuild-policy.json

# Attach policy to CodePipeline role
echo -e "${YELLOW}Attaching policy to CodePipeline role...${NC}"
aws iam put-role-policy \
  --role-name $CODEPIPELINE_ROLE_NAME \
  --policy-name "${APP_NAME}-codepipeline-policy" \
  --policy-document file://../deploy/iam_policies/codepipeline-policy.json \
  --region $REGION

# Attach policy to CodeBuild role
echo -e "${YELLOW}Attaching policy to CodeBuild role...${NC}"
aws iam put-role-policy \
  --role-name $CODEBUILD_ROLE_NAME \
  --policy-name "${APP_NAME}-codebuild-policy" \
  --policy-document file://../deploy/iam_policies/codebuild-policy.json \
  --region $REGION

# Clean up temporary files
rm -f /tmp/codepipeline-trust-policy.json
rm -f /tmp/codebuild-trust-policy.json

echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}IAM Roles and Policies Created Successfully!${NC}"
echo -e "${GREEN}===========================================================${NC}"
echo -e "CodePipeline Role: ${YELLOW}$CODEPIPELINE_ROLE_NAME${NC}"
echo -e "CodeBuild Role: ${YELLOW}$CODEBUILD_ROLE_NAME${NC}"
echo -e ""
echo -e "You can now use these roles in your CloudFormation template."
echo -e "${GREEN}===========================================================${NC}"