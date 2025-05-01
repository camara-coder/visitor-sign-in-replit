# Step-by-Step AWS CodePipeline Deployment Guide

This guide provides detailed, step-by-step instructions for deploying the Visitor Sign-In Application to AWS using CodePipeline.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS account with administrative access
- [ ] AWS CLI installed and configured
- [ ] Git installed locally
- [ ] AWS permissions to create and manage:
  - [ ] IAM roles and policies
  - [ ] S3 buckets
  - [ ] CodeCommit repositories
  - [ ] CodeBuild projects
  - [ ] CodePipeline pipelines
  - [ ] Elastic Beanstalk applications
  - [ ] CloudFormation stacks
  - [ ] RDS instances

## Step 1: Initial AWS Setup

1. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your AWS Access Key ID, Secret Access Key, default region (e.g., us-east-1), and output format (json).

2. **Create IAM Roles and Policies**:
   ```bash
   cd scripts
   ./setup-iam-policies.sh
   ```
   This script will:
   - Create necessary IAM roles for CodePipeline and CodeBuild
   - Attach required policies for these roles
   - Display the role names that will be used in subsequent steps

## Step 2: Create Resources Using CloudFormation

1. **Deploy the CodePipeline CloudFormation Stack**:
   ```bash
   cd scripts
   ./setup-codepipeline.sh
   ```
   
   You will be prompted for:
   - Application name (default: visitor-sign-in-app)
   - Environment name (default: production)
   - AWS region (default: us-east-1)
   - CodeCommit repository name
   - Branch name (default: main)
   - Elastic Beanstalk application and environment names
   - S3 artifact bucket name
   - Database password

   The script will:
   - Create an S3 bucket for build artifacts
   - Deploy the CloudFormation stack that creates:
     - CodeCommit repository
     - CodeBuild project
     - CodePipeline pipeline
     - IAM roles (if not created already)

2. **Note the Outputs**:
   After the stack is created, the script will display:
   - The CodeCommit repository URL
   - The CodePipeline console URL

## Step 3: Push Code to CodeCommit

1. **Setup Git Credentials for AWS CodeCommit**:
   
   Follow the instructions at:
   https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-https-unixes.html

   Or use the following commands:
   ```bash
   # Install the git-remote-codecommit helper
   pip install git-remote-codecommit

   # Configure your AWS credentials
   aws configure
   ```

2. **Clone the Repository**:
   ```bash
   git clone codecommit://<region>/<repository-name>
   # Example:
   # git clone codecommit://us-east-1/visitor-sign-in-app
   ```

3. **Copy Project Files**:
   ```bash
   cp -r /* visitor-sign-in-app/
   # Exclude any unnecessary files
   cd visitor-sign-in-app
   ```

4. **Ensure Required Files Exist**:
   Verify that these key files exist in your repository:
   - `buildspec.yml`
   - `.ebextensions/` directory
   - `Procfile`
   - Application source code

5. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Initial commit for CodePipeline deployment"
   git push origin main
   ```

## Step 4: Monitor the Pipeline

1. **View Pipeline Status**:
   - Open the AWS Management Console
   - Navigate to CodePipeline
   - Select your pipeline (e.g., visitor-sign-in-app-pipeline)
   - Monitor the progress of the pipeline stages

2. **Troubleshoot if Needed**:
   - **Source Stage Issues**: Check CodeCommit repository configuration
   - **Build Stage Issues**: Check buildspec.yml and CodeBuild logs
   - **Deploy Stage Issues**: Check Elastic Beanstalk configuration and logs

## Step 5: Configure Elastic Beanstalk (if not already done)

If your Elastic Beanstalk environment wasn't created by the CloudFormation template:

1. **Create Elastic Beanstalk Application**:
   ```bash
   aws elasticbeanstalk create-application \
     --application-name visitor-sign-in-app \
     --description "Visitor Sign-In Application"
   ```

2. **Create Elastic Beanstalk Environment**:
   ```bash
   aws elasticbeanstalk create-environment \
     --application-name visitor-sign-in-app \
     --environment-name visitor-sign-in-app-production \
     --solution-stack-name "64bit Amazon Linux 2 v5.8.0 running Node.js 18" \
     --option-settings file://deploy/ebconfig.json
   ```

## Step 6: Access Your Application

1. **Get Elastic Beanstalk URL**:
   ```bash
   aws elasticbeanstalk describe-environments \
     --environment-names visitor-sign-in-app-production \
     --query "Environments[0].CNAME" \
     --output text
   ```

2. **Visit Application**:
   Open the URL in your web browser

3. **Log In**:
   - Username: `admin`
   - Password: `password`
   - **Important**: Change the default password immediately

## Step 7: Update Your Application

When you need to update your application:

1. **Make Changes Locally**
2. **Commit and Push**:
   ```bash
   git add .
   git commit -m "Update application with new features"
   git push origin main
   ```
3. **Monitor the Pipeline** in the AWS Console to see your changes deploy automatically

## Troubleshooting Common Issues

### CodeCommit Access Issues

**Problem**: Unable to push to CodeCommit
**Solution**:
1. Verify your Git credentials are set up correctly:
   ```bash
   aws codecommit get-repository --repository-name visitor-sign-in-app
   ```
2. Check your IAM user permissions for CodeCommit access
3. Try using the HTTPS GRC method: `git clone codecommit://region/repository`

### Build Failures

**Problem**: CodeBuild project fails
**Solution**:
1. View build logs in the AWS console (CodeBuild → Build projects → your project → Build history)
2. Common issues:
   - Missing dependencies: Update your buildspec.yml
   - Syntax errors: Fix code issues
   - Permission problems: Update CodeBuild role permissions

### Deployment Failures

**Problem**: Elastic Beanstalk deployment fails
**Solution**:
1. Check Elastic Beanstalk logs in the AWS console
2. Common issues:
   - Health check failures: Check your application's health check endpoint
   - Configuration issues: Update .ebextensions files
   - Database connection problems: Verify DATABASE_URL environment variable

## Additional Resources

- [AWS CodePipeline User Guide](https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html)
- [AWS CodeBuild User Guide](https://docs.aws.amazon.com/codebuild/latest/userguide/welcome.html)
- [AWS Elastic Beanstalk Developer Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)