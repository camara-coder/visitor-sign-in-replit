#!/bin/bash

# AWS SSO Helper Functions
# This script provides helper functions for AWS SSO authentication
# Source this script in other deployment scripts

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check and handle AWS SSO authentication
check_aws_auth() {
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
        return 1
    fi

    # Check if AWS is configured (either with standard credentials or SSO)
    AWS_CONFIG_CHECK=$(aws sts get-caller-identity 2>&1 || echo "error")
    if [[ $AWS_CONFIG_CHECK == *"error"* ]]; then
        # Check if SSO is configured
        if aws configure list-profiles 2>/dev/null | grep -q "sso"; then
            echo -e "${YELLOW}AWS CLI configured with SSO. Checking SSO login status...${NC}"
            
            # Prompt for SSO profile
            echo "Available SSO profiles:"
            aws configure list-profiles | grep sso
            
            read -p "Enter your SSO profile name: " SSO_PROFILE
            
            if [ -z "$SSO_PROFILE" ]; then
                echo -e "${RED}No SSO profile provided. Exiting.${NC}"
                return 1
            fi
            
            # Login with SSO
            echo -e "${YELLOW}Logging in with SSO profile: $SSO_PROFILE${NC}"
            aws sso login --profile $SSO_PROFILE
            
            # Export the AWS_PROFILE environment variable
            export AWS_PROFILE=$SSO_PROFILE
            
            # Check if login was successful
            if ! aws sts get-caller-identity &> /dev/null; then
                echo -e "${RED}SSO login failed. Please try again.${NC}"
                return 1
            fi
            
            echo -e "${GREEN}SSO login successful.${NC}"
        else
            echo -e "${RED}AWS CLI is not configured. Please run 'aws configure' or set up SSO first.${NC}"
            return 1
        fi
    else
        echo -e "${GREEN}AWS credentials are valid.${NC}"
    fi

    # Display AWS identity information
    echo -e "${YELLOW}Using AWS Identity:${NC}"
    aws sts get-caller-identity
    return 0
}

# Function to validate region
validate_region() {
    local region=$1
    
    # Check if AWS region is valid
    if ! aws ec2 describe-regions --region $region --query "Regions[?RegionName=='$region'].RegionName" --output text &>/dev/null; then
        echo -e "${RED}Invalid AWS region: $region${NC}"
        return 1
    fi
    
    return 0
}

# Function to ensure S3 bucket exists
ensure_s3_bucket() {
    local bucket_name=$1
    local region=$2
    
    # Check if bucket exists
    if ! aws s3api head-bucket --bucket $bucket_name 2>/dev/null; then
        echo -e "${YELLOW}Creating S3 bucket: $bucket_name${NC}"
        if [[ "$region" == "us-east-1" ]]; then
            aws s3api create-bucket --bucket $bucket_name --region $region || return 1
        else
            aws s3api create-bucket --bucket $bucket_name --region $region --create-bucket-configuration LocationConstraint=$region || return 1
        fi
        
        # Enable versioning
        aws s3api put-bucket-versioning --bucket $bucket_name --versioning-configuration Status=Enabled --region $region
    else
        echo -e "${GREEN}S3 bucket already exists: $bucket_name${NC}"
    fi
    
    return 0
}

# Function to retrieve stack outputs
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    local region=$3
    
    aws cloudformation describe-stacks \
        --stack-name $stack_name \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text \
        --region $region
}

# Function to wait for stack completion
wait_for_stack() {
    local stack_name=$1
    local region=$2
    local operation=$3  # "create", "update", or "delete"
    
    echo -e "${YELLOW}Waiting for stack $operation to complete...${NC}"
    
    if [[ "$operation" == "create" ]]; then
        aws cloudformation wait stack-create-complete --stack-name $stack_name --region $region
    elif [[ "$operation" == "update" ]]; then
        aws cloudformation wait stack-update-complete --stack-name $stack_name --region $region
    elif [[ "$operation" == "delete" ]]; then
        aws cloudformation wait stack-delete-complete --stack-name $stack_name --region $region
    else
        echo -e "${RED}Invalid operation: $operation${NC}"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Stack $operation completed successfully.${NC}"
        return 0
    else
        echo -e "${RED}Stack $operation failed.${NC}"
        return 1
    fi
}

# Usage example:
# source ./aws-sso-helper.sh
# check_aws_auth || exit 1
# validate_region "us-east-1" || exit 1
# ensure_s3_bucket "my-bucket" "us-east-1" || exit 1