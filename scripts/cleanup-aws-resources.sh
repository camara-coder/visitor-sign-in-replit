#!/bin/bash

# Script to clean up AWS resources created for the Visitor Sign-In application
set -e

# Determine script directory and root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." &>/dev/null && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration with defaults
APP_NAME="visitor-sign-in-app"
REGION="us-east-1"
STACK_NAME="${APP_NAME}-pipeline"
ARTIFACT_BUCKET="${APP_NAME}-artifacts"
EB_APP_NAME="${APP_NAME}"
EB_ENV_NAME="${APP_NAME}-production"
CODEPIPELINE_ROLE_NAME="${APP_NAME}-codepipeline-role"
CODEBUILD_ROLE_NAME="${APP_NAME}-codebuild-role"

# Display header
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}      AWS Resource Cleanup for Visitor Sign-In App          ${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not found or expired.${NC}"
    exit 1
else
    echo -e "${GREEN}AWS credentials validated successfully.${NC}"
    aws sts get-caller-identity
    echo ""
fi

# Load configuration from file if available
CONFIG_FILES=("${SCRIPT_DIR}/.deployment-config/"*"-${STACK_NAME}.conf")
if [ ${#CONFIG_FILES[@]} -gt 0 ] && [ -f "${CONFIG_FILES[0]}" ]; then
    LATEST_CONFIG="${CONFIG_FILES[0]}"
    echo -e "${YELLOW}Loading configuration from ${LATEST_CONFIG}...${NC}"
    source "${LATEST_CONFIG}"
    echo -e "${GREEN}Configuration loaded successfully.${NC}"
else
    echo -e "${YELLOW}No configuration file found. Using default values.${NC}"
    echo -e "${YELLOW}You can provide custom values in the prompts.${NC}"
fi

# Prompt for configuration values
read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

read -p "Enter CloudFormation stack name [$STACK_NAME]: " input
STACK_NAME=${input:-$STACK_NAME}

read -p "Enter S3 artifact bucket name [$ARTIFACT_BUCKET]: " input
ARTIFACT_BUCKET=${input:-$ARTIFACT_BUCKET}

read -p "Enter Elastic Beanstalk application name [$EB_APP_NAME]: " input
EB_APP_NAME=${input:-$EB_APP_NAME}

read -p "Enter Elastic Beanstalk environment name [$EB_ENV_NAME]: " input
EB_ENV_NAME=${input:-$EB_ENV_NAME}

read -p "Enter CodePipeline role name [$CODEPIPELINE_ROLE_NAME]: " input
CODEPIPELINE_ROLE_NAME=${input:-$CODEPIPELINE_ROLE_NAME}

read -p "Enter CodeBuild role name [$CODEBUILD_ROLE_NAME]: " input
CODEBUILD_ROLE_NAME=${input:-$CODEBUILD_ROLE_NAME}

# Ask for confirmation before proceeding with deletion
echo -e "${RED}WARNING: This will delete the following AWS resources:${NC}"
echo -e "- CloudFormation Stack: ${CYAN}$STACK_NAME${NC}"
echo -e "- S3 Artifact Bucket: ${CYAN}$ARTIFACT_BUCKET${NC}"
echo -e "- Elastic Beanstalk Environment: ${CYAN}$EB_ENV_NAME${NC}"
echo -e "- Elastic Beanstalk Application: ${CYAN}$EB_APP_NAME${NC}"
echo -e "- IAM Roles: ${CYAN}$CODEPIPELINE_ROLE_NAME, $CODEBUILD_ROLE_NAME${NC}"
echo -e "\n${RED}This action cannot be undone. All data will be permanently lost.${NC}"
read -p "Are you sure you want to proceed? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${YELLOW}Cleanup canceled.${NC}"
    exit 0
fi

# Step 1: Delete CloudFormation stack
echo -e "${CYAN}== Step 1: Deleting CloudFormation stack ==${NC}"
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null || echo "STACK_NOT_FOUND")
if [[ $STACK_EXISTS != *"STACK_NOT_FOUND"* ]]; then
    echo -e "${YELLOW}Deleting CloudFormation stack: $STACK_NAME...${NC}"
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    echo -e "${YELLOW}Waiting for stack deletion to complete...${NC}"
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
    echo -e "${GREEN}Stack deleted successfully.${NC}"
else
    echo -e "${YELLOW}Stack $STACK_NAME does not exist. Skipping...${NC}"
fi

# Step 2: Empty and delete S3 bucket
echo -e "${CYAN}== Step 2: Emptying and deleting S3 bucket ==${NC}"
if aws s3api head-bucket --bucket "$ARTIFACT_BUCKET" 2>/dev/null; then
    echo -e "${YELLOW}Emptying S3 bucket: $ARTIFACT_BUCKET...${NC}"
    aws s3 rm s3://$ARTIFACT_BUCKET --recursive
    echo -e "${YELLOW}Deleting S3 bucket: $ARTIFACT_BUCKET...${NC}"
    aws s3api delete-bucket --bucket $ARTIFACT_BUCKET --region $REGION
    echo -e "${GREEN}S3 bucket deleted successfully.${NC}"
else
    echo -e "${YELLOW}S3 bucket $ARTIFACT_BUCKET does not exist. Skipping...${NC}"
fi

# Step 3: Delete Elastic Beanstalk environment and application
echo -e "${CYAN}== Step 3: Deleting Elastic Beanstalk environment and application ==${NC}"
# Check if environment exists
EB_ENV_EXISTS=$(aws elasticbeanstalk describe-environments --environment-names $EB_ENV_NAME --region $REGION --query "Environments[?EnvironmentName=='$EB_ENV_NAME'].Status" --output text 2>/dev/null || echo "ENV_NOT_FOUND")
if [[ $EB_ENV_EXISTS != "ENV_NOT_FOUND" ]]; then
    echo -e "${YELLOW}Terminating Elastic Beanstalk environment: $EB_ENV_NAME...${NC}"
    aws elasticbeanstalk terminate-environment --environment-name $EB_ENV_NAME --region $REGION
    echo -e "${YELLOW}Waiting for environment termination to complete...${NC}"
    while true; do
        STATUS=$(aws elasticbeanstalk describe-environments --environment-names $EB_ENV_NAME --region $REGION --query "Environments[?EnvironmentName=='$EB_ENV_NAME'].Status" --output text 2>/dev/null || echo "TERMINATED")
        if [[ $STATUS == "TERMINATED" || $STATUS == "" ]]; then
            break
        fi
        echo -e "${YELLOW}Environment status: $STATUS. Waiting...${NC}"
        sleep 30
    done
    echo -e "${GREEN}Elastic Beanstalk environment terminated successfully.${NC}"
else
    echo -e "${YELLOW}Elastic Beanstalk environment $EB_ENV_NAME does not exist. Skipping...${NC}"
fi

# Check if application exists
EB_APP_EXISTS=$(aws elasticbeanstalk describe-applications --application-names $EB_APP_NAME --region $REGION --query "Applications[?ApplicationName=='$EB_APP_NAME'].ApplicationName" --output text 2>/dev/null || echo "APP_NOT_FOUND")
if [[ $EB_APP_EXISTS != "APP_NOT_FOUND" ]]; then
    echo -e "${YELLOW}Deleting Elastic Beanstalk application: $EB_APP_NAME...${NC}"
    aws elasticbeanstalk delete-application --application-name $EB_APP_NAME --region $REGION
    echo -e "${GREEN}Elastic Beanstalk application deleted successfully.${NC}"
else
    echo -e "${YELLOW}Elastic Beanstalk application $EB_APP_NAME does not exist. Skipping...${NC}"
fi

# Step 4: Delete IAM roles and policies
echo -e "${CYAN}== Step 4: Deleting IAM roles and policies ==${NC}"
# Delete CodePipeline role
if aws iam get-role --role-name $CODEPIPELINE_ROLE_NAME 2>/dev/null; then
    echo -e "${YELLOW}Detaching policies from CodePipeline role: $CODEPIPELINE_ROLE_NAME...${NC}"
    POLICIES=$(aws iam list-attached-role-policies --role-name $CODEPIPELINE_ROLE_NAME --query "AttachedPolicies[].PolicyArn" --output text)
    for POLICY in $POLICIES; do
        echo -e "${YELLOW}Detaching policy: $POLICY...${NC}"
        aws iam detach-role-policy --role-name $CODEPIPELINE_ROLE_NAME --policy-arn $POLICY
    done
    
    INLINE_POLICIES=$(aws iam list-role-policies --role-name $CODEPIPELINE_ROLE_NAME --query "PolicyNames" --output text)
    for POLICY in $INLINE_POLICIES; do
        echo -e "${YELLOW}Deleting inline policy: $POLICY...${NC}"
        aws iam delete-role-policy --role-name $CODEPIPELINE_ROLE_NAME --policy-name $POLICY
    done
    
    echo -e "${YELLOW}Deleting CodePipeline role: $CODEPIPELINE_ROLE_NAME...${NC}"
    aws iam delete-role --role-name $CODEPIPELINE_ROLE_NAME
    echo -e "${GREEN}CodePipeline role deleted successfully.${NC}"
else
    echo -e "${YELLOW}CodePipeline role $CODEPIPELINE_ROLE_NAME does not exist. Skipping...${NC}"
fi

# Delete CodeBuild role
if aws iam get-role --role-name $CODEBUILD_ROLE_NAME 2>/dev/null; then
    echo -e "${YELLOW}Detaching policies from CodeBuild role: $CODEBUILD_ROLE_NAME...${NC}"
    POLICIES=$(aws iam list-attached-role-policies --role-name $CODEBUILD_ROLE_NAME --query "AttachedPolicies[].PolicyArn" --output text)
    for POLICY in $POLICIES; do
        echo -e "${YELLOW}Detaching policy: $POLICY...${NC}"
        aws iam detach-role-policy --role-name $CODEBUILD_ROLE_NAME --policy-arn $POLICY
    done
    
    INLINE_POLICIES=$(aws iam list-role-policies --role-name $CODEBUILD_ROLE_NAME --query "PolicyNames" --output text)
    for POLICY in $INLINE_POLICIES; do
        echo -e "${YELLOW}Deleting inline policy: $POLICY...${NC}"
        aws iam delete-role-policy --role-name $CODEBUILD_ROLE_NAME --policy-name $POLICY
    done
    
    echo -e "${YELLOW}Deleting CodeBuild role: $CODEBUILD_ROLE_NAME...${NC}"
    aws iam delete-role --role-name $CODEBUILD_ROLE_NAME
    echo -e "${GREEN}CodeBuild role deleted successfully.${NC}"
else
    echo -e "${YELLOW}CodeBuild role $CODEBUILD_ROLE_NAME does not exist. Skipping...${NC}"
fi

echo -e "${BLUE}=============================================================${NC}"
echo -e "${GREEN}Resource cleanup completed successfully!${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo -e "The following resources have been deleted:"
echo -e "- CloudFormation Stack: ${GREEN}$STACK_NAME${NC}"
echo -e "- S3 Artifact Bucket: ${GREEN}$ARTIFACT_BUCKET${NC}"
echo -e "- Elastic Beanstalk Environment: ${GREEN}$EB_ENV_NAME${NC}"
echo -e "- Elastic Beanstalk Application: ${GREEN}$EB_APP_NAME${NC}"
echo -e "- IAM Roles: ${GREEN}$CODEPIPELINE_ROLE_NAME, $CODEBUILD_ROLE_NAME${NC}"
echo -e "${BLUE}=============================================================${NC}"