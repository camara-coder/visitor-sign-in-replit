#!/bin/bash

# Terraform Deployment Script for Visitor Sign-In App
# This script deploys the application using Terraform to AWS

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Import AWS SSO helper functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "${SCRIPT_DIR}/aws-sso-helper.sh"

# Set default values
AWS_REGION="us-east-1"
ENVIRONMENT="dev"
DB_NAME="visitor_sign_in"
DB_INSTANCE_CLASS="db.t3.small"
LAMBDA_MEMORY_SIZE=256
LAMBDA_TIMEOUT=30
STATE_BUCKET=""
STATE_KEY="terraform.tfstate"

# Display header
echo -e "${BLUE}===== Visitor Sign-In App - Terraform Deployment =====${NC}"
echo "This script will deploy the application infrastructure using Terraform."
echo ""

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform is not installed. Please install it first.${NC}"
    echo "Visit: https://learn.hashicorp.com/tutorials/terraform/install-cli"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Authenticate with AWS (handles both standard credentials and SSO)
check_aws_auth || exit 1

# Ask for confirmation
read -p "Continue with deployment? (y/n): " CONFIRM
if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo -e "${YELLOW}Deployment canceled.${NC}"
    exit 0
fi

# Get inputs from user
echo -e "${CYAN}== Step 1: Collecting Configuration ==${NC}"
echo "Please provide the following configuration values (press Enter to use defaults):"

read -p "AWS region [$AWS_REGION]: " input
AWS_REGION=${input:-$AWS_REGION}

read -p "Environment (dev, staging, prod) [$ENVIRONMENT]: " input
ENVIRONMENT=${input:-$ENVIRONMENT}

read -p "Database name [$DB_NAME]: " input
DB_NAME=${input:-$DB_NAME}

read -p "Database instance class [$DB_INSTANCE_CLASS]: " input
DB_INSTANCE_CLASS=${input:-$DB_INSTANCE_CLASS}

read -p "Lambda function memory size (MB) [$LAMBDA_MEMORY_SIZE]: " input
LAMBDA_MEMORY_SIZE=${input:-$LAMBDA_MEMORY_SIZE}

read -p "Lambda function timeout (seconds) [$LAMBDA_TIMEOUT]: " input
LAMBDA_TIMEOUT=${input:-$LAMBDA_TIMEOUT}

# Ask about Terraform state management
echo -e "${YELLOW}Terraform state can be stored remotely in an S3 bucket for team collaboration.${NC}"
read -p "Do you want to use a remote state in S3? (y/n): " USE_REMOTE_STATE

if [[ $USE_REMOTE_STATE == "y" || $USE_REMOTE_STATE == "Y" ]]; then
    read -p "Enter S3 bucket name for Terraform state: " STATE_BUCKET
    read -p "Enter S3 key path for Terraform state [$STATE_KEY]: " input
    STATE_KEY=${input:-$STATE_KEY}
    
    # Check if bucket exists, create it if it doesn't
    if ! aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
        echo -e "${YELLOW}Bucket $STATE_BUCKET does not exist. Creating it...${NC}"
        aws s3 mb s3://$STATE_BUCKET --region $AWS_REGION
        
        # Enable versioning on the bucket
        aws s3api put-bucket-versioning --bucket $STATE_BUCKET --versioning-configuration Status=Enabled
        
        # Enable encryption on the bucket
        aws s3api put-bucket-encryption --bucket $STATE_BUCKET --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
        
        echo -e "${GREEN}S3 bucket created with versioning and encryption enabled.${NC}"
    else
        echo -e "${GREEN}S3 bucket already exists.${NC}"
    fi
    
    # Generate backend configuration
    mkdir -p ../terraform/config
    cat > ../terraform/config/backend.tf << EOL
terraform {
  backend "s3" {
    bucket = "${STATE_BUCKET}"
    key    = "${STATE_KEY}"
    region = "${AWS_REGION}"
    encrypt = true
  }
}
EOL
    echo -e "${GREEN}Backend configuration created.${NC}"
else
    echo -e "${YELLOW}Using local Terraform state. Note: This is not recommended for team environments.${NC}"
    # Create empty backend file to overwrite any existing backend configuration
    mkdir -p ../terraform/config
    cat > ../terraform/config/backend.tf << EOL
# Using local state
EOL
fi

# Prompt for sensitive variables
echo -e "${YELLOW}Entering sensitive information. This will not be displayed or stored in plain text.${NC}"

# Database credentials
while true; do
    read -s -p "Enter database username: " DB_USERNAME
    echo ""
    if [[ -z "$DB_USERNAME" ]]; then
        echo -e "${RED}Username cannot be empty. Please try again.${NC}"
        continue
    fi
    break
done

while true; do
    read -s -p "Enter database password (min 8 characters): " DB_PASSWORD
    echo ""
    if [[ ${#DB_PASSWORD} -lt 8 ]]; then
        echo -e "${RED}Password too short. Please use at least 8 characters.${NC}"
        continue
    fi
    
    read -s -p "Confirm database password: " DB_PASSWORD_CONFIRM
    echo ""
    
    if [[ "$DB_PASSWORD" == "$DB_PASSWORD_CONFIRM" ]]; then
        break
    else
        echo -e "${RED}Passwords do not match. Please try again.${NC}"
    fi
done

# JWT secret for authentication
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}Generated secure JWT secret.${NC}"

# Create tfvars file for sensitive variables
cat > ../terraform/secrets.auto.tfvars << EOL
db_username = "${DB_USERNAME}"
db_password = "${DB_PASSWORD}"
jwt_secret  = "${JWT_SECRET}"
EOL
chmod 600 ../terraform/secrets.auto.tfvars

# Create tfvars file for non-sensitive variables
cat > ../terraform/terraform.auto.tfvars << EOL
aws_region       = "${AWS_REGION}"
environment      = "${ENVIRONMENT}"
db_name          = "${DB_NAME}"
db_instance_class = "${DB_INSTANCE_CLASS}"
lambda_memory_size = ${LAMBDA_MEMORY_SIZE}
lambda_timeout   = ${LAMBDA_TIMEOUT}
EOL

echo -e "${GREEN}Variable files created.${NC}"

# Navigate to Terraform directory
cd ../terraform

# Initialize Terraform
echo -e "${CYAN}== Step 2: Initializing Terraform ==${NC}"
terraform init

if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform initialization failed. Please check the error message above.${NC}"
    exit 1
fi

# Validate Terraform configuration
echo -e "${CYAN}== Step 3: Validating Terraform configuration ==${NC}"
terraform validate

if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform validation failed. Please check the error message above.${NC}"
    exit 1
fi

# Show plan
echo -e "${CYAN}== Step 4: Generating Terraform plan ==${NC}"
terraform plan -out=terraform.plan

if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform plan generation failed. Please check the error message above.${NC}"
    exit 1
fi

# Ask for confirmation to apply
echo -e "${YELLOW}Review the plan above carefully before proceeding.${NC}"
read -p "Do you want to apply this Terraform plan? (y/n): " APPLY_CONFIRM

if [[ $APPLY_CONFIRM != "y" && $APPLY_CONFIRM != "Y" ]]; then
    echo -e "${YELLOW}Deployment canceled.${NC}"
    exit 0
fi

# Apply the plan
echo -e "${CYAN}== Step 5: Applying Terraform plan ==${NC}"
echo -e "${YELLOW}This may take 10-15 minutes to complete...${NC}"
terraform apply terraform.plan

if [ $? -ne 0 ]; then
    echo -e "${RED}Terraform apply failed. Please check the error message above.${NC}"
    exit 1
fi

# Save outputs to a file
echo -e "${CYAN}== Step 6: Saving deployment information ==${NC}"
terraform output -json > ../terraform-outputs.json

# Extract important outputs
API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "Not available")
FRONTEND_URL=$(terraform output -raw frontend_cloudfront_domain 2>/dev/null || echo "Not available")
DB_ENDPOINT=$(terraform output -raw database_endpoint 2>/dev/null || echo "Not available")

# Create a deployment record
mkdir -p ../.deployment-history
DEPLOY_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
cat > ../.deployment-history/terraform-$DEPLOY_TIMESTAMP.txt << EOL
Terraform Deployment Information
===============================
Timestamp: $(date)
Environment: $ENVIRONMENT
Region: $AWS_REGION

Resources:
- API Gateway URL: $API_URL
- Frontend URL: https://$FRONTEND_URL
- Database Endpoint: $DB_ENDPOINT
- Database Name: $DB_NAME

Configuration:
- DB Instance Class: $DB_INSTANCE_CLASS
- Lambda Memory: $LAMBDA_MEMORY_SIZE MB
- Lambda Timeout: $LAMBDA_TIMEOUT seconds

Terraform State:
EOL

if [[ -n "$STATE_BUCKET" ]]; then
    echo "- Remote state in S3 bucket: s3://$STATE_BUCKET/$STATE_KEY" >> ../.deployment-history/terraform-$DEPLOY_TIMESTAMP.txt
else
    echo "- Local state (terraform.tfstate)" >> ../.deployment-history/terraform-$DEPLOY_TIMESTAMP.txt
fi

echo -e "${BLUE}===== Deployment Complete =====${NC}"
echo -e "${GREEN}Application deployed successfully!${NC}"
echo -e "API Gateway URL: ${CYAN}$API_URL${NC}"
echo -e "Frontend URL: ${CYAN}https://$FRONTEND_URL${NC}"
echo -e "Database Endpoint: ${CYAN}$DB_ENDPOINT${NC}"
echo -e "Deployment record saved to: ${CYAN}.deployment-history/terraform-$DEPLOY_TIMESTAMP.txt${NC}"

echo -e "${BLUE}===== Next Steps =====${NC}"
echo -e "1. Upload your frontend assets to the S3 bucket"
echo -e "2. Configure your domain in CloudFront if needed"
echo -e "3. Update your application configuration to use the new endpoints"

# Security reminder
echo -e "${YELLOW}Important: Sensitive information has been stored in terraform/secrets.auto.tfvars${NC}"
echo -e "${YELLOW}           Ensure this file is properly secured and not committed to version control.${NC}"