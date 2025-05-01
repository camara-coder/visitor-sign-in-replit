#!/bin/bash

# Master script to set up and deploy the Visitor Sign-In application using AWS CodePipeline
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# Display header
echo -e "${BLUE}=============================================================${NC}"
echo -e "${BLUE}     AWS CodePipeline Deployment for Visitor Sign-In App     ${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Step 1: Collect configuration
echo -e "${YELLOW}Step 1: Collecting Configuration${NC}"
echo "Please provide the following configuration values (press Enter to use defaults):"

read -p "Enter application name [$APP_NAME]: " input
APP_NAME=${input:-$APP_NAME}

read -p "Enter environment name (production, staging, development) [$ENVIRONMENT]: " input
ENVIRONMENT=${input:-$ENVIRONMENT}

read -p "Enter AWS region [$REGION]: " input
REGION=${input:-$REGION}

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

# Prompt for database password
read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Step 2: Setup IAM roles and policies
echo -e "${YELLOW}Step 2: Setting up IAM roles and policies${NC}"
./setup-iam-policies.sh
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to set up IAM roles and policies.${NC}"
    exit 1
fi
echo -e "${GREEN}IAM setup completed successfully.${NC}"

# Step 3: Create S3 bucket for artifacts
echo -e "${YELLOW}Step 3: Creating S3 bucket for artifacts${NC}"
if ! aws s3api head-bucket --bucket "$ARTIFACT_BUCKET" 2>/dev/null; then
    echo -e "${YELLOW}Creating S3 bucket: $ARTIFACT_BUCKET${NC}"
    aws s3 mb s3://$ARTIFACT_BUCKET --region $REGION
    aws s3api put-bucket-versioning --bucket $ARTIFACT_BUCKET --versioning-configuration Status=Enabled
    echo -e "${GREEN}S3 bucket created successfully!${NC}"
else
    echo -e "${GREEN}S3 bucket already exists!${NC}"
fi

# Step 4: Deploy CloudFormation stack
echo -e "${YELLOW}Step 4: Deploying CloudFormation stack for CodePipeline${NC}"
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
        ArtifactBucketName=$ARTIFACT_BUCKET \
    --capabilities CAPABILITY_IAM \
    --region $REGION

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudFormation stack deployed successfully!${NC}"
    
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
    
    # Step 5: Clone repository locally
    echo -e "${YELLOW}Step 5: Setting up local Git repository${NC}"
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        echo -e "${RED}Git is not installed. Please install it to continue with code repository setup.${NC}"
    else
        echo -e "${YELLOW}Do you want to set up a local Git repository and push code to CodeCommit? (y/n)${NC}"
        read setup_git
        
        if [[ $setup_git == "y" || $setup_git == "Y" ]]; then
            # Create a temporary directory
            TEMP_DIR=$(mktemp -d)
            
            echo -e "${YELLOW}Cloning empty repository...${NC}"
            git clone $REPO_URL $TEMP_DIR
            
            if [ $? -eq 0 ]; then
                echo -e "${YELLOW}Copying project files...${NC}"
                # Copy all files from the project to the cloned repo
                cd ../
                cp -r * $TEMP_DIR/ 2>/dev/null || true
                cp -r .ebextensions $TEMP_DIR/ 2>/dev/null || true
                cp -r .elasticbeanstalk $TEMP_DIR/ 2>/dev/null || true
                cp .gitignore $TEMP_DIR/ 2>/dev/null || true
                cp Procfile $TEMP_DIR/ 2>/dev/null || true
                
                # Navigate to the temp directory
                cd $TEMP_DIR
                
                # Add, commit, and push
                echo -e "${YELLOW}Committing and pushing code...${NC}"
                git add .
                git commit -m "Initial commit for CodePipeline deployment"
                git push origin $BRANCH_NAME
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}Code successfully pushed to CodeCommit!${NC}"
                else
                    echo -e "${RED}Failed to push code to CodeCommit.${NC}"
                    echo -e "${YELLOW}You will need to manually push your code to:${NC}"
                    echo -e "${YELLOW}$REPO_URL${NC}"
                fi
                
                # Clean up
                cd ..
                rm -rf $TEMP_DIR
            else
                echo -e "${RED}Failed to clone repository.${NC}"
                echo -e "${YELLOW}You will need to manually push your code to:${NC}"
                echo -e "${YELLOW}$REPO_URL${NC}"
            fi
        else
            echo -e "${YELLOW}Skipping Git repository setup.${NC}"
            echo -e "${YELLOW}You will need to manually push your code to:${NC}"
            echo -e "${YELLOW}$REPO_URL${NC}"
        fi
    fi
    
    # Step 6: Show summary
    echo -e "${GREEN}===========================================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}===========================================================${NC}"
    echo -e "${YELLOW}Resources Created:${NC}"
    echo -e "- CloudFormation Stack: ${GREEN}$STACK_NAME${NC}"
    echo -e "- CodeCommit Repository: ${GREEN}$REPOSITORY_NAME${NC}"
    echo -e "- CodeBuild Project: ${GREEN}${APP_NAME}-build${NC}"
    echo -e "- CodePipeline: ${GREEN}${APP_NAME}-pipeline${NC}"
    echo -e "- S3 Artifact Bucket: ${GREEN}$ARTIFACT_BUCKET${NC}"
    echo -e ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. If not pushed automatically, push your code to CodeCommit:"
    echo -e "   ${GREEN}git push --set-upstream $REPO_URL $BRANCH_NAME${NC}"
    echo -e "2. Monitor your pipeline at:"
    echo -e "   ${GREEN}$PIPELINE_URL${NC}"
    echo -e "3. Once deployment is complete, access your application at:"
    echo -e "   ${GREEN}http://$EB_ENV_NAME.elasticbeanstalk.com${NC}"
    echo -e "${GREEN}===========================================================${NC}"
else
    echo -e "${RED}Failed to deploy CloudFormation stack.${NC}"
    exit 1
fi