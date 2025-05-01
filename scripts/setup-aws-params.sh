#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display header
echo -e "${GREEN}===== Visitor Sign-In App - AWS Parameter Store Setup =====${NC}"
echo "This script will set up required parameters in AWS Parameter Store"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Set AWS region if not already set
AWS_REGION=$(aws configure get region)
if [ -z "$AWS_REGION" ]; then
    read -p "Enter AWS region (e.g., us-east-1): " AWS_REGION
    aws configure set region "$AWS_REGION"
fi

echo -e "${GREEN}Using AWS region: $AWS_REGION${NC}"
echo ""

# Get the database password
read -sp "Enter database password for the RDS instance: " DB_PASSWORD
echo ""

# Generate a random session secret if not provided
read -sp "Enter session secret (leave blank to generate): " SESSION_SECRET
echo ""
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -hex 32)
    echo -e "${YELLOW}Generated random session secret.${NC}"
fi

# Get SSL certificate ARN (optional)
read -p "Enter SSL certificate ARN (leave blank if not using HTTPS): " SSL_CERT_ARN
echo ""

# Set parameters in Parameter Store
echo -e "${GREEN}Setting up parameters in AWS Parameter Store...${NC}"

# Set database password
aws ssm put-parameter \
    --name "/visitor-sign-in-app/database-password" \
    --value "$DB_PASSWORD" \
    --type "SecureString" \
    --overwrite

echo -e "${GREEN}✓ Database password stored successfully${NC}"

# Set session secret
aws ssm put-parameter \
    --name "/visitor-sign-in-app/session-secret" \
    --value "$SESSION_SECRET" \
    --type "SecureString" \
    --overwrite

echo -e "${GREEN}✓ Session secret stored successfully${NC}"

# Set SSL cert ARN if provided
if [ ! -z "$SSL_CERT_ARN" ]; then
    aws ssm put-parameter \
        --name "/visitor-sign-in-app/ssl-certificate-arn" \
        --value "$SSL_CERT_ARN" \
        --type "String" \
        --overwrite
    
    echo -e "${GREEN}✓ SSL certificate ARN stored successfully${NC}"
else
    echo -e "${YELLOW}⚠ No SSL certificate ARN provided. HTTPS will not be set up.${NC}"
fi

# Set SMTP configuration (optional)
echo -e "${YELLOW}Do you want to configure email sending via SMTP?${NC}"
read -p "Setup SMTP configuration? (y/n): " SETUP_SMTP

if [[ $SETUP_SMTP == "y" || $SETUP_SMTP == "Y" ]]; then
    read -p "SMTP Host: " SMTP_HOST
    read -p "SMTP Port: " SMTP_PORT
    read -p "SMTP Secure (true/false): " SMTP_SECURE
    read -p "SMTP User: " SMTP_USER
    read -sp "SMTP Password: " SMTP_PASSWORD
    echo ""
    read -p "From Email Address: " EMAIL_FROM
    
    # Store SMTP configuration
    aws ssm put-parameter --name "/visitor-sign-in-app/smtp-host" --value "$SMTP_HOST" --type "String" --overwrite
    aws ssm put-parameter --name "/visitor-sign-in-app/smtp-port" --value "$SMTP_PORT" --type "String" --overwrite
    aws ssm put-parameter --name "/visitor-sign-in-app/smtp-secure" --value "$SMTP_SECURE" --type "String" --overwrite
    aws ssm put-parameter --name "/visitor-sign-in-app/smtp-user" --value "$SMTP_USER" --type "String" --overwrite
    aws ssm put-parameter --name "/visitor-sign-in-app/smtp-password" --value "$SMTP_PASSWORD" --type "SecureString" --overwrite
    aws ssm put-parameter --name "/visitor-sign-in-app/email-from" --value "$EMAIL_FROM" --type "String" --overwrite
    
    echo -e "${GREEN}✓ SMTP configuration stored successfully${NC}"
else
    echo -e "${YELLOW}⚠ SMTP configuration skipped. Will use default email settings.${NC}"
fi

echo ""
echo -e "${GREEN}===== AWS Parameter Store setup completed =====${NC}"
echo -e "${YELLOW}Remember to update the .ebextensions files if you need to reference these parameters.${NC}"