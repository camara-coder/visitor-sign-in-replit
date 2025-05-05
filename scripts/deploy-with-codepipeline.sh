#!/bin/bash

# Master script to set up and deploy the Visitor Sign-In application using AWS CodePipeline
set -e

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
BRANCH_NAME="main"
REPOSITORY_NAME="${APP_NAME}"
PLATFORM_VERSION="Node.js 20"
INSTANCE_TYPE="t3.small"

# Display header
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}      AWS CodePipeline Deployment for Visitor Sign-In App     ${NC}"
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
        source ./aws-sso-login.sh
    else
        echo -e "${YELLOW}Please configure your AWS credentials and try again.${NC}"
        exit 1
    fi
fi

# Check for existing deployment and offer option to update
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null || echo "STACK_NOT_FOUND")
if [[ $STACK_EXISTS != *"STACK_NOT_FOUND"* ]]; then
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

read -p "Enter CodeCommit repository name [$REPOSITORY_NAME]: " input
REPOSITORY_NAME=${input:-$REPOSITORY_NAME}

read -p "Enter branch name [$BRANCH_NAME]: " input
BRANCH_NAME=${input:-$BRANCH_NAME}

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
mkdir -p .deployment-config
CONFIG_FILE=".deployment-config/$(date +%Y%m%d-%H%M%S)-$STACK_NAME.conf"
cat > $CONFIG_FILE << EOL
# Deployment configuration saved on $(date)
APP_NAME=$APP_NAME
ENVIRONMENT=$ENVIRONMENT
REGION=$REGION
STACK_NAME=$STACK_NAME
REPOSITORY_NAME=$REPOSITORY_NAME
BRANCH_NAME=$BRANCH_NAME
EB_APP_NAME=$EB_APP_NAME
EB_ENV_NAME=$EB_ENV_NAME
ARTIFACT_BUCKET=$ARTIFACT_BUCKET
PLATFORM_VERSION=$PLATFORM_VERSION
INSTANCE_TYPE=$INSTANCE_TYPE
EOL
echo -e "${GREEN}Configuration saved to $CONFIG_FILE${NC}"

# Step 2: Setup IAM roles and policies
echo -e "${CYAN}== Step 2: Setting up IAM roles and policies ==${NC}"
if [ -f "./setup-iam-policies.sh" ]; then
    ./setup-iam-policies.sh
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
    echo -e "${YELLOW}IAM setup script not found. Skipping IAM setup.${NC}"
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
    if aws s3 mb s3://$ARTIFACT_BUCKET --region $REGION; then
        aws s3api put-bucket-versioning --bucket $ARTIFACT_BUCKET --versioning-configuration Status=Enabled
        aws s3api put-bucket-encryption --bucket $ARTIFACT_BUCKET --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
        echo -e "${GREEN}S3 bucket created successfully with versioning and encryption enabled!${NC}"
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
    echo -e "${GREEN}S3 bucket already exists!${NC}"
fi

# Step 4: Deploy CloudFormation stack
echo -e "${CYAN}== Step 4: Deploying CloudFormation stack for CodePipeline ==${NC}"
echo -e "${YELLOW}This will create or update the following resources:${NC}"
echo -e "- CloudFormation Stack:    ${CYAN}$STACK_NAME${NC}"
echo -e "- CodeCommit Repository:   ${CYAN}$REPOSITORY_NAME${NC}"
echo -e "- CodeBuild Project:       ${CYAN}${APP_NAME}-build${NC}"
echo -e "- CodePipeline:            ${CYAN}${APP_NAME}-pipeline${NC}"
echo -e "- Elastic Beanstalk App:   ${CYAN}$EB_APP_NAME${NC}"
echo -e "- Elastic Beanstalk Env:   ${CYAN}$EB_ENV_NAME${NC}"
echo -e "- S3 Artifact Bucket:      ${CYAN}$ARTIFACT_BUCKET${NC}"
echo -e "- Platform:                ${CYAN}$PLATFORM_VERSION${NC}"
echo -e "- Instance Type:           ${CYAN}$INSTANCE_TYPE${NC}"
echo ""

read -p "Proceed with deployment? (y/n): " PROCEED
if [[ $PROCEED != "y" && $PROCEED != "Y" ]]; then
  echo -e "${YELLOW}Deployment canceled.${NC}"
  exit 0
fi

echo -e "${YELLOW}Deploying CloudFormation stack. This may take 10-15 minutes...${NC}"

# Check if the CloudFormation template exists
if [ ! -f "../deploy/codepipeline.yaml" ]; then
    echo -e "${RED}CloudFormation template not found at ../deploy/codepipeline.yaml${NC}"
    exit 1
fi

# Deploy or update the CloudFormation stack
aws cloudformation deploy \
    --template-file ../deploy/codepipeline.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides \
        AppName=$APP_NAME \
        EnvironmentName=$ENVIRONMENT \
        RepositoryName=$REPOSITORY_NAME \
        BranchName=$BRANCH_NAME \
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
    
    # Get repository URL
    REPO_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query "Stacks[0].Outputs[?OutputKey=='RepositoryCloneUrlHttp'].OutputValue" \
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
    
    # Step 5: Set up Git repository
    echo -e "${CYAN}== Step 5: Setting up Git repository ==${NC}"
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        echo -e "${RED}Git is not installed. Please install it to continue with code repository setup.${NC}"
        echo -e "${YELLOW}You will need to manually push your code to:${NC}"
        echo -e "${CYAN}$REPO_URL${NC}"
    else
        echo -e "${YELLOW}Do you want to set up a local Git repository and push code to CodeCommit? (y/n)${NC}"
        read setup_git
        
        if [[ $setup_git == "y" || $setup_git == "Y" ]]; then
            # Create a temporary directory with a unique name
            TEMP_DIR="temp_codepipeline_deploy_$(date +%s)"
            mkdir -p $TEMP_DIR
            
            echo -e "${YELLOW}Cloning empty repository...${NC}"
            git clone $REPO_URL $TEMP_DIR
            
            if [ $? -eq 0 ]; then
                echo -e "${YELLOW}Copying project files...${NC}"
                # Copy all relevant files from the project to the cloned repo
                cd ..
                
                # Create a .gitignore file if it doesn't exist
                if [ ! -f ".gitignore" ]; then
                    cat > $TEMP_DIR/.gitignore << EOL
# Node.js
node_modules/
npm-debug.log
yarn-error.log
.env
.env.local

# Build output
dist/
build/
.next/
out/

# Elastic Beanstalk
.elasticbeanstalk/*
!.elasticbeanstalk/*.cfg.yml
!.elasticbeanstalk/*.global.yml

# Deployment files
deploy.zip
eb-deploy-temp/
.deployment-history/
.deployment-config/

# Logs
logs/
*.log

# OS specific
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo
EOL
                else
                    cp .gitignore $TEMP_DIR/ 2>/dev/null || true
                fi
                
                # Copy application files
                cp -r server.js database.js schema.js email-service.js scheduled-events-api.js package.json package-lock.json next.js-frontend $TEMP_DIR/ 2>/dev/null || true
                
                # Copy configuration files if they exist
                cp -r .ebextensions $TEMP_DIR/ 2>/dev/null || true
                cp Procfile $TEMP_DIR/ 2>/dev/null || true
                
                # Create buildspec.yml if it doesn't exist
                if [ ! -f "buildspec.yml" ]; then
                    cat > $TEMP_DIR/buildspec.yml << EOL
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
  pre_build:
    commands:
      - echo Installing dependencies...
      - npm ci
  build:
    commands:
      - echo Build started on `date`
      - npm run build
  post_build:
    commands:
      - echo Build completed on `date`

artifacts:
  files:
    - server.js
    - database.js
    - schema.js
    - email-service.js
    - scheduled-events-api.js
    - package.json
    - package-lock.json
    - next.js-frontend/**/*
    - .ebextensions/**/*
    - Procfile
    - .platform/**/*
  base-directory: '.'
EOL
                else
                    cp buildspec.yml $TEMP_DIR/ 2>/dev/null || true
                fi
                
                # Navigate to the temp directory
                cd scripts/$TEMP_DIR
                
                # Add, commit, and push
                echo -e "${YELLOW}Committing and pushing code...${NC}"
                git add .
                git commit -m "Initial commit for CodePipeline deployment"
                git push origin $BRANCH_NAME
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Code successfully pushed to CodeCommit!${NC}"
                    echo -e "${YELLOW}This will trigger the CodePipeline deployment automatically.${NC}"
                else
                    echo -e "${RED}Failed to push code to CodeCommit.${NC}"
                    echo -e "${YELLOW}You will need to manually push your code to:${NC}"
                    echo -e "${CYAN}$REPO_URL${NC}"
                fi
                
                # Clean up
                cd ../..
                rm -rf $TEMP_DIR
            else
                echo -e "${RED}Failed to clone repository.${NC}"
                echo -e "${YELLOW}You will need to manually push your code to:${NC}"
                echo -e "${CYAN}$REPO_URL${NC}"
                rm -rf $TEMP_DIR
            fi
        else
            echo -e "${YELLOW}Skipping Git repository setup.${NC}"
            echo -e "${YELLOW}You will need to manually push your code to:${NC}"
            echo -e "${CYAN}$REPO_URL${NC}"
        fi
    fi
    
    # Step 6: Show summary
    echo -e "${BLUE}=============================================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${BLUE}=============================================================${NC}"
    
    echo -e "${YELLOW}Resources Created:${NC}"
    echo -e "- CloudFormation Stack:    ${GREEN}$STACK_NAME${NC}"
    echo -e "- CodeCommit Repository:   ${GREEN}$REPOSITORY_NAME${NC}"
    echo -e "- CodeBuild Project:       ${GREEN}${APP_NAME}-build${NC}"
    echo -e "- CodePipeline:            ${GREEN}${APP_NAME}-pipeline${NC}"
    echo -e "- S3 Artifact Bucket:      ${GREEN}$ARTIFACT_BUCKET${NC}"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "1. If not pushed automatically, push your code to CodeCommit:"
    echo -e "   ${GREEN}git remote add aws $REPO_URL${NC}"
    echo -e "   ${GREEN}git push aws $BRANCH_NAME${NC}"
    echo -e ""
    echo -e "2. Monitor your pipeline at:"
    echo -e "   ${GREEN}$PIPELINE_URL${NC}"
    echo -e ""
    echo -e "3. Once deployment is complete, access your application at:"
    echo -e "   ${GREEN}$EB_URL${NC}"
    
    # Save deployment info for future reference
    mkdir -p ../../.deployment-history
    DEPLOY_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    cat > ../../.deployment-history/codepipeline-$DEPLOY_TIMESTAMP.txt << EOL
Deployment Information
=====================
Timestamp: $(date)
Stack Name: $STACK_NAME
Application Name: $APP_NAME
Environment: $ENVIRONMENT
Region: $REGION

Resources:
- CodeCommit Repository: $REPOSITORY_NAME
- CodePipeline: ${APP_NAME}-pipeline
- Elastic Beanstalk Application: $EB_APP_NAME
- Elastic Beanstalk Environment: $EB_ENV_NAME
- S3 Artifact Bucket: $ARTIFACT_BUCKET

URLs:
- Repository URL: $REPO_URL
- Pipeline URL: $PIPELINE_URL
- Application URL: $EB_URL
EOL

    echo -e "${BLUE}=============================================================${NC}"
    echo -e "${GREEN}Deployment information saved to .deployment-history/codepipeline-$DEPLOY_TIMESTAMP.txt${NC}"
    echo -e "${BLUE}=============================================================${NC}"
else
    echo -e "${RED}Failed to deploy CloudFormation stack.${NC}"
    echo -e "${YELLOW}Check the CloudFormation events in the AWS console for more details.${NC}"
    echo -e "${YELLOW}Console URL: ${NC}https://$REGION.console.aws.amazon.com/cloudformation/home?region=$REGION#/stacks"
    exit 1
fi