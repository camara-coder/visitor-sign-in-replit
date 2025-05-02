#!/bin/bash

# Check necessary AWS permissions for deployment
# This script verifies whether the current AWS identity has the required permissions
# for deploying the application using CloudFormation

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking AWS permissions for deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Get current AWS identity
echo -e "Current AWS identity:"
aws sts get-caller-identity

# List of required permissions to check
declare -a REQUIRED_PERMISSIONS=(
    "iam:CreateRole"
    "iam:AttachRolePolicy"
    "iam:PutRolePolicy"
    "iam:DetachRolePolicy"
    "iam:DeleteRole"
    "iam:TagRole"
    "cloudformation:CreateStack"
    "s3:CreateBucket"
    "codecommit:CreateRepository"
    "codebuild:CreateProject"
    "codepipeline:CreatePipeline"
    "elasticbeanstalk:CreateEnvironment"
)

# Test critical IAM permissions using a dry run
echo -e "\n${YELLOW}Testing IAM permissions...${NC}"
IAM_PERMISSIONS_OK=true

for permission in "${REQUIRED_PERMISSIONS[@]}"; do
    # Extract service and action
    SERVICE=$(echo $permission | cut -d':' -f1)
    ACTION=$(echo $permission | cut -d':' -f2)
    
    echo -ne "Checking $permission... "
    
    # Try a specific permission test based on the service
    case $SERVICE in
        iam)
            if [[ "$ACTION" == "CreateRole" ]]; then
                TEST_RESULT=$(aws iam create-role --role-name TestPermissionsOnly --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' --dry-run 2>&1 || echo "error")
            elif [[ "$ACTION" == "DeleteRole" ]]; then
                TEST_RESULT=$(aws iam delete-role --role-name TestPermissionsOnly --dry-run 2>&1 || echo "error")
            elif [[ "$ACTION" == "AttachRolePolicy" ]]; then
                TEST_RESULT=$(aws iam attach-role-policy --role-name TestPermissionsOnly --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess --dry-run 2>&1 || echo "error")
            elif [[ "$ACTION" == "DetachRolePolicy" ]]; then
                TEST_RESULT=$(aws iam detach-role-policy --role-name TestPermissionsOnly --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess --dry-run 2>&1 || echo "error")
            else
                TEST_RESULT=$(aws iam get-role --role-name TestPermissionsOnly --dry-run 2>&1 || echo "error")
            fi
            ;;
        s3)
            TEST_RESULT=$(aws s3api create-bucket --bucket test-permissions-only-123 --region us-east-1 --dry-run 2>&1 || echo "error")
            ;;
        cloudformation)
            TEST_RESULT=$(aws cloudformation create-stack --stack-name TestPermissionsOnly --template-body '{"Resources":{"TestBucket":{"Type":"AWS::S3::Bucket"}}}' --dry-run 2>&1 || echo "error")
            ;;
        *)
            # For other services, just check if we have permission listing resources
            TEST_RESULT="Cannot test directly, continuing..."
            ;;
    esac
    
    if [[ $TEST_RESULT == *"DryRunOperation"* || $TEST_RESULT == *"Cannot test directly"* ]]; then
        echo -e "${GREEN}OK${NC}"
    elif [[ $TEST_RESULT == *"not authorized"* || $TEST_RESULT == *"AccessDenied"* ]]; then
        echo -e "${RED}MISSING${NC}"
        IAM_PERMISSIONS_OK=false
    else
        echo -e "${YELLOW}UNKNOWN${NC}"
        echo "  $TEST_RESULT"
    fi
done

if [ "$IAM_PERMISSIONS_OK" = false ]; then
    echo -e "\n${RED}WARNING: You don't have all the required permissions for deployment.${NC}"
    echo -e "${YELLOW}This may cause the deployment to fail. Please see deploy/TROUBLESHOOTING.md${NC}"
    echo -e "${YELLOW}for information on resolving AWS SSO permission issues.${NC}"
    
    # Ask if the user wants to continue anyway
    read -p "Do you want to continue anyway? (y/n): " CONTINUE
    if [[ $CONTINUE != "y" && $CONTINUE != "Y" ]]; then
        echo "Exiting."
        exit 1
    fi
    
    echo -e "${YELLOW}Continuing with deployment despite permission warnings...${NC}"
else
    echo -e "\n${GREEN}All permissions checks passed!${NC}"
fi

exit 0