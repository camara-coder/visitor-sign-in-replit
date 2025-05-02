#!/bin/bash

# AWS SSO Login Helper
# This is a standalone script to handle AWS SSO authentication
# You can run this directly or source it from other scripts

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

# Check if a profile was specified
if [ "$1" != "" ]; then
    PROFILE="$1"
    echo -e "${YELLOW}Using specified profile: $PROFILE${NC}"
    export AWS_PROFILE=$PROFILE
fi

# Try to get identity without prompting first
IDENTITY_CHECK=$(aws sts get-caller-identity 2>&1 || echo "error")

# If we couldn't get an identity, we need to authenticate
if [[ $IDENTITY_CHECK == *"error"* ]]; then
    echo -e "${YELLOW}AWS authentication required.${NC}"
    
    # Check if AWS SSO is configured
    if aws configure list-profiles 2>/dev/null | grep -q "sso"; then
        echo -e "${YELLOW}AWS SSO profiles found. Available profiles:${NC}"
        
        # List all SSO profiles
        SSO_PROFILES=$(aws configure list-profiles | grep sso)
        echo "$SSO_PROFILES"
        
        # Prompt for profile selection
        read -p "Enter SSO profile name to use: " PROFILE
        
        if [ -z "$PROFILE" ]; then
            echo -e "${RED}No profile selected. Exiting.${NC}"
            exit 1
        fi
        
        # Set the AWS_PROFILE environment variable
        export AWS_PROFILE=$PROFILE
        
        # Login with SSO
        echo -e "${YELLOW}Logging in with AWS SSO using profile: $PROFILE${NC}"
        aws sso login --profile $PROFILE
        
        # Check if login was successful
        if ! aws sts get-caller-identity &> /dev/null; then
            echo -e "${RED}AWS SSO login failed. Please try again.${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}AWS SSO login successful.${NC}"
    else
        echo -e "${YELLOW}No AWS SSO profiles found. Checking standard AWS credentials...${NC}"
        
        # Try with default credentials
        if ! aws sts get-caller-identity &> /dev/null; then
            echo -e "${RED}AWS authentication failed. Please configure AWS credentials:${NC}"
            echo -e "  Option 1: Run 'aws configure' to set up standard credentials"
            echo -e "  Option 2: Set up AWS SSO with 'aws configure sso'"
            exit 1
        fi
        
        echo -e "${GREEN}AWS credentials are valid.${NC}"
    fi
else
    echo -e "${GREEN}AWS credentials are already valid.${NC}"
fi

# Display current identity
echo -e "${YELLOW}Using AWS Identity:${NC}"
aws sts get-caller-identity

# If this script is sourced, it will export the AWS_PROFILE environment variable
# If run directly, it will set the AWS_PROFILE for the current session

# Usage: 
# To use in another script: source ./aws-sso-login.sh
# To run directly: ./aws-sso-login.sh [profile-name]