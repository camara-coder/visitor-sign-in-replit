# Automated Deployment Guide for Visitor Sign-In Application

This guide explains how to use the automated deployment script to deploy the Visitor Sign-In application to AWS with a fully configured environment, including database creation.

## What the Deployment Script Does

The automated deployment script (`scripts/automated-deployment.sh`) performs the following:

1. **Creates a complete infrastructure using CloudFormation**:
   - VPC with public and private subnets
   - Security groups for database and application
   - PostgreSQL RDS database instance
   - IAM roles and instance profiles
   - Elastic Beanstalk application and environment

2. **Prepares and deploys your application**:
   - Creates an S3 bucket for deployment artifacts
   - Packages your application code
   - Uploads the package to S3
   - Creates an Elastic Beanstalk application version
   - Deploys the application to the environment

3. **Sets up environment variables**:
   - Database connection details
   - Application configuration settings
   - Security credentials

## Prerequisites

1. **AWS CLI**: Make sure the AWS CLI is installed and configured with appropriate credentials
   ```bash
   aws --version
   # Should return something like: aws-cli/2.9.8 Python/3.9.11 ...
   
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, default region, etc.
   ```

2. **Required permissions**: Your AWS user must have permissions to create:
   - CloudFormation stacks
   - IAM roles
   - VPC resources
   - RDS instances
   - Elastic Beanstalk environments
   - S3 buckets

3. **Bash shell**: The script is designed to run in a Bash shell environment

## Usage Instructions

### Step 1: Verify AWS CLI Configuration

```bash
aws sts get-caller-identity
# Should return your AWS account information
```

### Step 2: Run the Deployment Script

```bash
cd scripts
./automated-deployment.sh
```

### Step 3: Enter Required Information

The script will prompt you for:
- Database password
- Session secret (for securing cookies/sessions)
- Whether to enable email services

### Step 4: Wait for Deployment to Complete

The script will:
1. Create the CloudFormation stack (5-10 minutes)
2. Set up the RDS database (5-10 minutes)
3. Deploy your application code (3-5 minutes)

### Step 5: Access Your Application

Once deployment is complete, the script will output the URL of your application, which will look something like:
```
http://visitor-signin-prod.us-east-1.elasticbeanstalk.com
```

## Configuration Options

You can modify the following variables at the top of the script to customize your deployment:

```bash
APP_NAME="visitor-signin-app"             # Application name
ENV_NAME="visitor-signin-prod"            # Environment name
REGION="us-east-1"                        # AWS region
STACK_NAME="visitor-signin-infrastructure" # CloudFormation stack name
DB_USERNAME="visitorapp"                  # Database username
DB_NAME="visitordb"                       # Database name
S3_BUCKET="${APP_NAME}-deployment-artifacts" # S3 bucket for deployment
SOLUTION_STACK="64bit Amazon Linux 2023 v6.5.1 running Node.js 20" # EB platform
```

## Troubleshooting

### Stack Creation Failure

If the CloudFormation stack fails to create:

1. Check the CloudFormation events in the AWS Console or use:
   ```bash
   aws cloudformation describe-stack-events --stack-name visitor-signin-infrastructure
   ```

2. Look for events with status FAILED to identify the issue

### Database Connection Issues

If the application deploys but can't connect to the database:

1. Verify the security groups allow traffic from Elastic Beanstalk to RDS
2. Check the environment variables are correctly set
3. Examine the Elastic Beanstalk logs

### Application Deployment Issues

If the application deployment fails:

1. Check the Elastic Beanstalk logs:
   ```bash
   aws elasticbeanstalk retrieve-environment-info --environment-name visitor-signin-prod
   ```

2. Verify the application package includes all required files

## Cleaning Up Resources

To delete all resources created by the script:

```bash
# Delete the Elastic Beanstalk environment
aws elasticbeanstalk terminate-environment --environment-name visitor-signin-prod

# Wait for environment termination to complete
aws elasticbeanstalk wait environment-terminated --environment-name visitor-signin-prod

# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name visitor-signin-infrastructure

# Delete the S3 bucket (empty it first)
aws s3 rm s3://visitor-signin-app-deployment-artifacts --recursive
aws s3 rb s3://visitor-signin-app-deployment-artifacts
```

## Security Considerations

- The script handles sensitive information like database passwords
- Do not store the script with hardcoded credentials
- Consider using AWS Secrets Manager for production deployments
- Review IAM roles and security groups to ensure principle of least privilege