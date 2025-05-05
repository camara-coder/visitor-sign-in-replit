#!/bin/bash

# AWS SSO Login Helper
# This is a standalone script to handle AWS SSO authentication
# You can run this directly or source it from other scripts

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Display header
echo -e "${BLUE}===== AWS SSO Login Helper =====${NC}"

# Check if AWS CLI version 2 is installed
AWS_VERSION=$(aws --version 2>&1 | grep -o "aws-cli/2" || echo "")
if [[ "$AWS_VERSION" != "aws-cli/2" ]]; then
    echo -e "${RED}AWS CLI version 2 is required for SSO functionality.${NC}"
    echo -e "${YELLOW}Please install AWS CLI version 2 from:${NC}"
    echo -e "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
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
        SSO_PROFILES=$(aws configure list-profiles | grep -i sso)
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
            echo -e "${YELLOW}Possible reasons:${NC}"
            echo -e "  - Your SSO session may have expired"
            echo -e "  - The browser window may have been closed before completion"
            echo -e "  - The profile may not be configured correctly"
            exit 1
        fi
        
        echo -e "${GREEN}AWS SSO login successful.${NC}"
    else
        echo -e "${YELLOW}No AWS SSO profiles found. Would you like to set up SSO now? (y/n)${NC}"
        read setup_sso
        
        if [[ $setup_sso == "y" || $setup_sso == "Y" ]]; then
            echo -e "${YELLOW}Setting up AWS SSO...${NC}"
            aws configure sso
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}AWS SSO configured successfully.${NC}"
                echo -e "${YELLOW}Please run this script again to log in.${NC}"
            else
                echo -e "${RED}AWS SSO configuration failed.${NC}"
                echo -e "${YELLOW}Checking standard AWS credentials...${NC}"
                
                # Try with default credentials
                if ! aws sts get-caller-identity &> /dev/null; then
                    echo -e "${RED}AWS authentication failed. Please configure AWS credentials:${NC}"
                    echo -e "  Option 1: Run 'aws configure' to set up standard credentials"
                    echo -e "  Option 2: Set up AWS SSO with 'aws configure sso'"
                    exit 1
                fi
            fi
        else
            echo -e "${YELLOW}Checking standard AWS credentials...${NC}"
            
            # Try with default credentials
            if ! aws sts get-caller-identity &> /dev/null; then
                echo -e "${RED}AWS authentication failed. Please configure AWS credentials:${NC}"
                echo -e "  Option 1: Run 'aws configure' to set up standard credentials"
                echo -e "  Option 2: Set up AWS SSO with 'aws configure sso'"
                exit 1
            fi
            
            echo -e "${GREEN}AWS credentials are valid.${NC}"
        fi
    fi
else
    echo -e "${GREEN}AWS credentials are already valid.${NC}"
fi

# Display current identity
echo -e "${YELLOW}Using AWS Identity:${NC}"
aws sts get-caller-identity

# Extract Account ID and Region from current session
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null)
REGION=$(aws configure get region 2>/dev/null || echo "us-east-1")

echo -e "${YELLOW}AWS Account: ${NC}${ACCOUNT_ID}"
echo -e "${YELLOW}AWS Region: ${NC}${REGION}"

# Check if credentials will expire soon
if [[ $AWS_PROFILE == *"sso"* ]]; then
    # Extract expiration time from AWS credentials
    CACHE_DIR="$HOME/.aws/sso/cache"
    if [ -d "$CACHE_DIR" ]; then
        # Get the most recent token file
        TOKEN_FILE=$(ls -t "$CACHE_DIR"/*.json 2>/dev/null | head -1)
        if [ -n "$TOKEN_FILE" ]; then
            EXPIRATION=$(cat "$TOKEN_FILE" | grep -o '"expiresAt":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$EXPIRATION" ]; then
                EXPIRY_TIMESTAMP=$(date -d "$EXPIRATION" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$EXPIRATION" +%s 2>/dev/null)
                NOW=$(date +%s)
                SECONDS_LEFT=$((EXPIRY_TIMESTAMP - NOW))
                MINUTES_LEFT=$((SECONDS_LEFT / 60))
                
                if [ $MINUTES_LEFT -lt 60 ]; then
                    echo -e "${YELLOW}Warning: SSO session will expire in $MINUTES_LEFT minutes.${NC}"
                    echo -e "${YELLOW}Consider refreshing your session soon with: aws sso login${NC}"
                else
                    HOURS_LEFT=$((MINUTES_LEFT / 60))
                    echo -e "${GREEN}SSO session valid for approximately $HOURS_LEFT hours.${NC}"
                fi
            fi
        fi
    fi
fi

# If this script is sourced, it will export the AWS_PROFILE environment variable
# If run directly, it will set the AWS_PROFILE for the current session

echo -e "${BLUE}===== AWS SSO Login Complete =====${NC}"

# Usage: 
# To use in another script: source ./aws-sso-login.sh
# To run directly: ./aws-sso-login.sh [profile-name]