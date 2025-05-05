#!/bin/bash

# Deployment script to set up and deploy the Visitor Sign-In application using AWS CodePipeline with GitHub
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
ENVIRONMENT="production"
REGION="us-east-1"
STACK_NAME="${APP_NAME}-pipeline"
ARTIFACT_BUCKET="${APP_NAME}-artifacts"
EB_APP_NAME="${APP_NAME}"
EB_ENV_NAME="${APP_NAME}-${ENVIRONMENT}"
GITHUB_BRANCH="main"
PLATFORM_VERSION="Node.js 20"
INSTANCE_TYPE="t3.small"

# Display header
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}     AWS CodePipeline with GitHub for Visitor Sign-In App    ${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    echo -e "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Validate AWS credentials
echo -e "${YELLOW}Validating AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS credentials not found or expired.${NC}"
    echo -e "Would you like to run the AWS SSO login script? (y/n): "
    read run_sso_login
    
    if [[ $run_sso_login == "y" || $run_sso_login == "Y" ]]; then
        source "${SCRIPT_DIR}/aws-sso-login.sh"
    else
        echo -e "${YELLOW}Please configure your AWS credentials and try again.${NC}"
        exit 1
    fi
fi

# Check for existing deployment and offer option to update
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null || echo "STACK_NOT_FOUND")
if [[ $STACK_EXISTS != *"STACK_NOT_FOUND"* ]]; then
    # Check if stack is in ROLLBACK_COMPLETE state (failed deployment)
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].StackStatus" --output text 2>/dev/null)
    
    if [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
        echo -e "${YELLOW}The existing stack '$STACK_NAME' is in ROLLBACK_COMPLETE state.${NC}"
        echo -e "${YELLOW}This indicates a failed deployment. You need to delete it before redeploying.${NC}"
        echo -e "Would you like to delete the failed stack and create a new one?"
        echo -e "  1. Delete failed stack and continue with deployment"
        echo -e "  2. Create new deployment with different stack name"
        echo -e "  3. Exit"
        read -p "Enter your choice [1-3]: " rollback_choice
        
        case $rollback_choice in
            1)
                echo -e "${YELLOW}Deleting failed stack '$STACK_NAME'...${NC}"
                aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
                echo -e "${YELLOW}Waiting for stack deletion to complete...${NC}"
                aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
                echo -e "${GREEN}Stack deleted successfully. Proceeding with new deployment...${NC}"
                ;;
            2)
                echo -e "${YELLOW}Creating new deployment with different name...${NC}"
                read -p "Enter a new CloudFormation stack name: " STACK_NAME
                APP_NAME=${STACK_NAME%-pipeline}
                EB_APP_NAME=$APP_NAME
                ARTIFACT_BUCKET="${APP_NAME}-artifacts"
                ;;
            *)
                echo -e "${YELLOW}Exiting deployment script.${NC}"
                exit 0
                ;;
        esac
    else
        echo -e "${YELLOW}An existing deployment with stack name '$STACK_NAME' was found.${NC}"
        echo -e "Would you like to update the existing deployment or create a new one?"
        echo -e "  1. Update existing deployment"
        echo -e "  2. Create new deployment (will require different stack name)"
        echo -e "  3. Exit"
        read -p "Enter your choice [1-3]: " update_choice
        
        case $update_choice in
            1)
                echo -e "${YELLOW}Proceeding with update of existing deployment...${NC}"
                ;;
            2)
                echo -e "${YELLOW}Creating new deployment...${NC}"
                read -p "Enter a new CloudFormation stack name: " STACK_NAME
                APP_NAME=${STACK_NAME%-pipeline}
                EB_APP_NAME=$APP_NAME
                ARTIFACT_BUCKET="${APP_NAME}-artifacts"
                ;;
            *)
                echo -e "${YELLOW}Exiting deployment script.${NC}"
                exit 0
                ;;
        esac
    fi
fi

# Step 1: Collect configuration
echo -e "${CYAN}== Step 1: Collecting Configuration ==${NC}"
echo "Please provide the following configuration values (press Enter to use defaults):"

read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter environment name (production, staging, development) [$ENVIRONMENT]: " input
ENVIRONMENT=${input:-$ENVIRONMENT}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

read -p "Enter platform version [$PLATFORM_VERSION]: " input
PLATFORM_VERSION=${input:-$PLATFORM_VERSION}

read -p "Enter instance type [$INSTANCE_TYPE]: " input
INSTANCE_TYPE=${input:-$INSTANCE_TYPE}

# GitHub-specific configuration
read -p "Enter GitHub repository owner: " GITHUB_OWNER
if [[ -z "$GITHUB_OWNER" ]]; then
    echo -e "${RED}GitHub repository owner is required.${NC}"
    exit 1
fi

read -p "Enter GitHub repository name: " GITHUB_REPO
if [[ -z "$GITHUB_REPO" ]]; then
    echo -e "${RED}GitHub repository name is required.${NC}"
    exit 1
fi

read -p "Enter GitHub branch [$GITHUB_BRANCH]: " input
GITHUB_BRANCH=${input:-$GITHUB_BRANCH}

# AWS CodeStar Connections require manual activation in the AWS Console
echo -e "${YELLOW}Note: You will need to manually activate the GitHub connection in the AWS Console after stack creation.${NC}"

read -p "Enter Elastic Beanstalk application name [$EB_APP_NAME]: " input
EB_APP_NAME=${input:-$EB_APP_NAME}

read -p "Enter Elastic Beanstalk environment name [$EB_ENV_NAME]: " input
EB_ENV_NAME=${input:-$EB_ENV_NAME}

read -p "Enter S3 artifact bucket name [$ARTIFACT_BUCKET]: " input
ARTIFACT_BUCKET=${input:-$ARTIFACT_BUCKET}

read -p "Enter CloudFormation stack name [$STACK_NAME]: " input
STACK_NAME=${input:-$STACK_NAME}

# Prompt for database password with confirmation
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

# Generate a secure session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Save configuration for future reference
echo -e "${YELLOW}Saving deployment configuration...${NC}"
mkdir -p "${SCRIPT_DIR}/.deployment-config"
CONFIG_FILE="${SCRIPT_DIR}/.deployment-config/$(date +%Y%m%d-%H%M%S)-$STACK_NAME.conf"
cat > $CONFIG_FILE << EOL
# Deployment configuration saved on $(date)
APP_NAME=$APP_NAME
ENVIRONMENT=$ENVIRONMENT
REGION=$REGION
STACK_NAME=$STACK_NAME
GITHUB_OWNER=$GITHUB_OWNER
GITHUB_REPO=$GITHUB_REPO
GITHUB_BRANCH=$GITHUB_BRANCH
EB_APP_NAME=$EB_APP_NAME
EB_ENV_NAME=$EB_ENV_NAME
ARTIFACT_BUCKET=$ARTIFACT_BUCKET
PLATFORM_VERSION=$PLATFORM_VERSION
INSTANCE_TYPE=$INSTANCE_TYPE
EOL
echo -e "${GREEN}Configuration saved to $CONFIG_FILE${NC}"

# Step 2: Setup IAM roles and policies
echo -e "${CYAN}== Step 2: Setting up IAM roles and policies ==${NC}"

# Check if running on Windows (Git Bash/MINGW)
if [[ "$(uname -s)" == *"MINGW"* ]]; then
    IAM_SETUP_SCRIPT="${SCRIPT_DIR}/setup-iam-policies-windows.sh"
    echo -e "${YELLOW}Detected Windows environment, using Windows-compatible IAM setup script${NC}"
else
    IAM_SETUP_SCRIPT="${SCRIPT_DIR}/setup-iam-policies.sh"
    echo -e "${YELLOW}Using standard IAM setup script${NC}"
fi

if [ -f "${IAM_SETUP_SCRIPT}" ]; then
    echo -e "${YELLOW}Running IAM setup script: ${IAM_SETUP_SCRIPT}${NC}"
    # Make the script executable if it's not
    chmod +x "${IAM_SETUP_SCRIPT}"
    
    # Execute the script with the current working directory set to scripts/
    (cd "${SCRIPT_DIR}" && "${IAM_SETUP_SCRIPT}")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to set up IAM roles and policies.${NC}"
        echo -e "${YELLOW}Do you want to continue anyway? This might cause the deployment to fail. (y/n)${NC}"
        read continue_anyway
        if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
            echo -e "${RED}Deployment canceled.${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}IAM setup completed successfully.${NC}"
    fi
else
    echo -e "${YELLOW}IAM setup script not found at: ${IAM_SETUP_SCRIPT}${NC}"
    echo -e "${YELLOW}This might cause the deployment to fail if the required IAM roles are not already created.${NC}"
    echo -e "${YELLOW}Do you want to continue anyway? (y/n)${NC}"
    read continue_anyway
    if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
        echo -e "${RED}Deployment canceled.${NC}"
        exit 1
    fi
fi

# Step 3: Create S3 bucket for artifacts
echo -e "${CYAN}== Step 3: Creating S3 bucket for artifacts ==${NC}"
if ! aws s3api head-bucket --bucket "$ARTIFACT_BUCKET" 2>/dev/null; then
    echo -e "${YELLOW}Creating S3 bucket: $ARTIFACT_BUCKET${NC}"
    
    # Check if region is us-east-1 (special case for S3 buckets)
    if [[ "$REGION" == "us-east-1" ]]; then
        # For us-east-1, we need to use the create-bucket command without location constraint
        if aws s3api create-bucket --bucket "$ARTIFACT_BUCKET" --region "$REGION"; then
            echo -e "${GREEN}S3 bucket created successfully in us-east-1!${NC}"
        else
            echo -e "${RED}Failed to create S3 bucket.${NC}"
            echo -e "${YELLOW}Do you want to continue with the deployment? (y/n)${NC}"
            read continue_anyway
            if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
                echo -e "${RED}Deployment canceled.${NC}"
                exit 1
            fi
        fi
    else
        # For other regions, use location constraint
        if aws s3api create-bucket --bucket "$ARTIFACT_BUCKET" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"; then
            echo -e "${GREEN}S3 bucket created successfully in $REGION!${NC}"
        else
            echo -e "${RED}Failed to create S3 bucket.${NC}"
            echo -e "${YELLOW}Do you want to continue with the deployment? (y/n)${NC}"
            read continue_anyway
            if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
                echo -e "${RED}Deployment canceled.${NC}"
                exit 1
            fi
        fi
    fi
    
    # Enable versioning and encryption on the bucket
    if aws s3api put-bucket-versioning --bucket "$ARTIFACT_BUCKET" --versioning-configuration Status=Enabled; then
        echo -e "${GREEN}Bucket versioning enabled.${NC}"
    else
        echo -e "${YELLOW}Failed to enable bucket versioning. Continuing anyway...${NC}"
    fi
    
    if aws s3api put-bucket-encryption --bucket "$ARTIFACT_BUCKET" --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'; then
        echo -e "${GREEN}Bucket encryption enabled.${NC}"
    else
        echo -e "${YELLOW}Failed to enable bucket encryption. Continuing anyway...${NC}"
    fi
else
    echo -e "${GREEN}S3 bucket already exists!${NC}"
fi

# Step 4: Deploy CloudFormation stack
echo -e "${CYAN}== Step 4: Deploying CloudFormation stack for CodePipeline with GitHub ==${NC}"
echo -e "${YELLOW}This will create or update the following resources:${NC}"
echo -e "- CloudFormation Stack:          ${CYAN}$STACK_NAME${NC}"
echo -e "- GitHub Connection:             ${CYAN}${APP_NAME}-github-connection${NC}"
echo -e "- GitHub Repository:             ${CYAN}${GITHUB_OWNER}/${GITHUB_REPO}${NC}"
echo -e "- GitHub Branch:                 ${CYAN}${GITHUB_BRANCH}${NC}"
echo -e "- CodeBuild Project:             ${CYAN}${APP_NAME}-build${NC}"
echo -e "- CodePipeline:                  ${CYAN}${APP_NAME}-pipeline${NC}"
echo -e "- Elastic Beanstalk App:         ${CYAN}$EB_APP_NAME${NC}"
echo -e "- Elastic Beanstalk Env:         ${CYAN}$EB_ENV_NAME${NC}"
echo -e "- S3 Artifact Bucket:            ${CYAN}$ARTIFACT_BUCKET${NC}"
echo -e "- Platform:                      ${CYAN}$PLATFORM_VERSION${NC}"
echo -e "- Instance Type:                 ${CYAN}$INSTANCE_TYPE${NC}"
echo -e "${YELLOW}NOTE: You will need to manually activate the GitHub connection in AWS Console.${NC}"
echo ""

read -p "Proceed with deployment? (y/n): " PROCEED
if [[ $PROCEED != "y" && $PROCEED != "Y" ]]; then
  echo -e "${YELLOW}Deployment canceled.${NC}"
  exit 0
fi

echo -e "${YELLOW}Deploying CloudFormation stack. This may take 10-15 minutes...${NC}"

# Check if the GitHub CloudFormation template exists
TEMPLATE_FILE="${ROOT_DIR}/deploy/codepipeline-github.yaml"
if [ ! -f "${TEMPLATE_FILE}" ]; then
    echo -e "${RED}CloudFormation template not found at ${TEMPLATE_FILE}${NC}"
    exit 1
fi

# Deploy or update the CloudFormation stack
aws cloudformation deploy \
    --template-file "${TEMPLATE_FILE}" \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        AppName=$APP_NAME \
        EnvironmentName=$ENVIRONMENT \
        GitHubOwner=$GITHUB_OWNER \
        GitHubRepo=$GITHUB_REPO \
        GitHubBranch=$GITHUB_BRANCH \
        ElasticBeanstalkApplicationName=$EB_APP_NAME \
        ElasticBeanstalkEnvironmentName=$EB_ENV_NAME \
        DatabasePassword=$DB_PASSWORD \
        SessionSecret=$SESSION_SECRET \
        ArtifactBucketName=$ARTIFACT_BUCKET \
        PlatformVersion="$PLATFORM_VERSION" \
        InstanceType=$INSTANCE_TYPE \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags \
        Application=$APP_NAME \
        Environment=$ENVIRONMENT

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudFormation stack deployed successfully!${NC}"
    
    # Get output values from the CloudFormation stack
    echo -e "${YELLOW}Retrieving deployment information...${NC}"
    
    # Get GitHub connection ARN
    CONNECTION_ARN=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='CodeStarConnectionARN'].OutputValue" \
        --output text \
        --region $REGION)
    
    # Get pipeline URL
    PIPELINE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='PipelineURL'].OutputValue" \
        --output text \
        --region $REGION)
    
    # Get EB environment URL
    EB_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='ApplicationURL'].OutputValue" \
        --output text \
        --region $REGION)
    
    # Step 5: Show summary and next steps
    echo -e "${BLUE}=============================================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${BLUE}=============================================================${NC}"
    
    echo -e "${YELLOW}Resources Created:${NC}"
    echo -e "- CloudFormation Stack:      ${GREEN}$STACK_NAME${NC}"
    echo -e "- GitHub Connection:         ${GREEN}${APP_NAME}-github-connection${NC}"
    echo -e "- GitHub Repository:         ${GREEN}${GITHUB_OWNER}/${GITHUB_REPO}${NC}"
    echo -e "- CodeBuild Project:         ${GREEN}${APP_NAME}-build${NC}"
    echo -e "- CodePipeline:              ${GREEN}${APP_NAME}-pipeline${NC}"
    echo -e "- S3 Artifact Bucket:        ${GREEN}$ARTIFACT_BUCKET${NC}"
    echo -e "- Elastic Beanstalk App:     ${GREEN}$EB_APP_NAME${NC}"
    echo -e "- Elastic Beanstalk Env:     ${GREEN}$EB_ENV_NAME${NC}"
    
    echo -e "\n${YELLOW}IMPORTANT NEXT STEPS:${NC}"
    echo -e "${RED}1. You MUST activate the GitHub connection manually:${NC}"
    echo -e "   - Go to AWS Console > Developer Tools > Settings > Connections"
    echo -e "   - Find the connection named '${APP_NAME}-github-connection'"
    echo -e "   - Click 'Update pending connection' and follow the GitHub authentication process"
    echo -e "   - Connection ARN: ${CYAN}$CONNECTION_ARN${NC}"
    
    echo -e "\n${YELLOW}2. Ensure your GitHub repository is properly set up:${NC}"
    echo -e "   - The repository must exist at ${CYAN}https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}${NC}"
    echo -e "   - The branch '${GITHUB_BRANCH}' must contain your application code"
    echo -e "   - The repository must include a buildspec.yml file for CodeBuild"
    
    echo -e "\n${YELLOW}3. Monitor your resources:${NC}"
    echo -e "   - Pipeline: ${CYAN}$PIPELINE_URL${NC}"
    echo -e "   - Application URL (after deployment): ${CYAN}$EB_URL${NC}"
    
    echo -e "\n${YELLOW}4. Setting up webhook (optional):${NC}"
    echo -e "   - CodeStar Connections automatically set up webhooks for GitHub repositories"
    echo -e "   - Your pipeline will automatically start when changes are pushed to the ${GITHUB_BRANCH} branch"
    
    echo -e "\n${GREEN}Remember to keep your GitHub repository credentials secure and never commit sensitive information.${NC}"
    
else
    echo -e "${RED}CloudFormation stack deployment failed.${NC}"
    echo -e "${YELLOW}Check the CloudFormation events in the AWS Console for more information.${NC}"
    exit 1
fi