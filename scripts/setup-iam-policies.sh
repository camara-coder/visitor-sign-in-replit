#!/bin/bash

# Script to set up IAM policies for CodePipeline deployment
set -e

# Determine script directory and root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." &>/dev/null && pwd)"

# Import AWS SSO helper functions if available
if [ -f "${SCRIPT_DIR}/aws-sso-helper.sh" ]; then
    source "${SCRIPT_DIR}/aws-sso-helper.sh"
fi

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

# Authenticate with AWS (handles both standard credentials and SSO) if function exists
if type check_aws_auth &>/dev/null; then
    check_aws_auth || exit 1
else
    # If the function doesn't exist, let's check credentials directly
    if ! aws sts get-caller-identity &>/dev/null; then
        echo -e "${RED}AWS credentials not found or expired. Please configure AWS credentials.${NC}"
        exit 1
    fi
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

# Create temp directory for policy files
TEMP_DIR="${ROOT_DIR}/tmp"
mkdir -p "${TEMP_DIR}"

# Create trust policy for CodePipeline
echo -e "${YELLOW}Creating trust policy for CodePipeline...${NC}"
CODEPIPELINE_TRUST_POLICY_FILE="${TEMP_DIR}/codepipeline-trust-policy.json"
cat > "${CODEPIPELINE_TRUST_POLICY_FILE}" << EOL
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
CODEBUILD_TRUST_POLICY_FILE="${TEMP_DIR}/codebuild-trust-policy.json"
cat > "${CODEBUILD_TRUST_POLICY_FILE}" << EOL
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
  --assume-role-policy-document "file://${CODEPIPELINE_TRUST_POLICY_FILE}" \
  --region $REGION || true

# Create or update CodeBuild role
echo -e "${YELLOW}Creating/updating CodeBuild role...${NC}"
aws iam create-role \
  --role-name $CODEBUILD_ROLE_NAME \
  --assume-role-policy-document "file://${CODEBUILD_TRUST_POLICY_FILE}" \
  --region $REGION || true

# Prepare policy file paths
CODEPIPELINE_POLICY_FILE="${TEMP_DIR}/codepipeline-policy.json"
CODEBUILD_POLICY_FILE="${TEMP_DIR}/codebuild-policy.json"

# Copy and update policy files
if [ -f "${ROOT_DIR}/deploy/iam_policies/codepipeline-policy.json" ]; then
    cp "${ROOT_DIR}/deploy/iam_policies/codepipeline-policy.json" "${CODEPIPELINE_POLICY_FILE}"
    sed -i "s/visitor-sign-in-app/$APP_NAME/g" "${CODEPIPELINE_POLICY_FILE}"
    sed -i "s/visitor-app-artifacts/${APP_NAME}-artifacts/g" "${CODEPIPELINE_POLICY_FILE}"
else
    echo -e "${RED}CodePipeline policy file not found. Creating a basic policy...${NC}"
    # Create a basic CodePipeline policy
    cat > "${CODEPIPELINE_POLICY_FILE}" << EOL
{
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
}
EOL
fi

if [ -f "${ROOT_DIR}/deploy/iam_policies/codebuild-policy.json" ]; then
    cp "${ROOT_DIR}/deploy/iam_policies/codebuild-policy.json" "${CODEBUILD_POLICY_FILE}"
    sed -i "s/visitor-sign-in-app/$APP_NAME/g" "${CODEBUILD_POLICY_FILE}"
    sed -i "s/visitor-app-artifacts/${APP_NAME}-artifacts/g" "${CODEBUILD_POLICY_FILE}"
else
    echo -e "${RED}CodeBuild policy file not found. Creating a basic policy...${NC}"
    # Create a basic CodeBuild policy
    cat > "${CODEBUILD_POLICY_FILE}" << EOL
{
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
}
EOL
fi

# Attach policy to CodePipeline role
echo -e "${YELLOW}Attaching policy to CodePipeline role...${NC}"
aws iam put-role-policy \
  --role-name $CODEPIPELINE_ROLE_NAME \
  --policy-name "${APP_NAME}-codepipeline-policy" \
  --policy-document "file://${CODEPIPELINE_POLICY_FILE}" \
  --region $REGION

# Attach policy to CodeBuild role
echo -e "${YELLOW}Attaching policy to CodeBuild role...${NC}"
aws iam put-role-policy \
  --role-name $CODEBUILD_ROLE_NAME \
  --policy-name "${APP_NAME}-codebuild-policy" \
  --policy-document "file://${CODEBUILD_POLICY_FILE}" \
  --region $REGION

# Clean up temporary files
rm -rf "${TEMP_DIR}"

echo -e "${GREEN}===========================================================${NC}"
echo -e "${GREEN}IAM Roles and Policies Created Successfully!${NC}"
echo -e "${GREEN}===========================================================${NC}"
echo -e "CodePipeline Role: ${YELLOW}$CODEPIPELINE_ROLE_NAME${NC}"
echo -e "CodeBuild Role: ${YELLOW}$CODEBUILD_ROLE_NAME${NC}"
echo -e ""
echo -e "You can now use these roles in your CloudFormation template."
echo -e "${GREEN}===========================================================${NC}"