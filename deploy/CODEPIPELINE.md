# AWS CodePipeline Deployment Guide

This guide provides step-by-step instructions for deploying the Visitor Sign-In Application to AWS using CodePipeline, CodeCommit, CodeBuild, and Elastic Beanstalk.

## Overview

This deployment setup creates a complete CI/CD pipeline that:
1. Stores your code in AWS CodeCommit
2. Builds the application using AWS CodeBuild
3. Deploys the built application to AWS Elastic Beanstalk

## Prerequisites

Before proceeding, ensure you have:

1. An AWS account with administrator permissions
2. [AWS CLI](https://aws.amazon.com/cli/) installed and configured
3. [Git](https://git-scm.com/) installed
4. Basic knowledge of AWS services

## Step 1: Set Up AWS Credentials

Ensure your AWS CLI is configured with the proper credentials:

```bash
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, default region, and output format.

## Step 2: Deploy the CloudFormation Stack

The CloudFormation stack will create all the necessary resources for your CI/CD pipeline.

Run the setup script:

```bash
cd scripts
./setup-codepipeline.sh
```

This script will:
- Prompt for configuration values (application name, environment, etc.)
- Create an S3 bucket for build artifacts
- Deploy the CloudFormation stack with all necessary resources

## Step 3: Configure Git and Push Your Code

After the CloudFormation stack is deployed, you'll receive a CodeCommit repository URL. Next, you need to:

1. Setup Git credentials for AWS CodeCommit:

```bash
aws iam create-service-specific-credential \
    --user-name YOUR_IAM_USERNAME \
    --service-name codecommit.amazonaws.com
```

2. Configure Git with these credentials:

```bash
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
```

3. Clone the empty repository:

```bash
git clone https://git-codecommit.REGION.amazonaws.com/v1/repos/visitor-sign-in-app
```

4. Copy your project files to the cloned repository:

```bash
cp -r /path/to/your/project/* visitor-sign-in-app/
cd visitor-sign-in-app
```

5. Commit and push your code:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

## Step 4: Monitor the Pipeline

Once you push your code, the pipeline will automatically start:

1. Open the AWS Management Console
2. Navigate to CodePipeline
3. Click on your pipeline (visitor-sign-in-app-pipeline)
4. Monitor the progress of each stage

The pipeline has three stages:
- **Source**: Fetches code from CodeCommit
- **Build**: Builds the application using CodeBuild
- **Deploy**: Deploys the application to Elastic Beanstalk

## Step 5: Access Your Application

After the pipeline completes successfully:

1. Open the AWS Management Console
2. Navigate to Elastic Beanstalk
3. Click on your environment (visitor-sign-in-app-production)
4. Click on the URL to access your deployed application

## Troubleshooting

### Pipeline Failures

If your pipeline fails during any stage:

1. Click on the failed stage to view the details
2. For build failures, check the CodeBuild logs
3. For deployment failures, check the Elastic Beanstalk logs

### CodeCommit Access Issues

If you have issues accessing CodeCommit:

1. Verify your Git credentials
2. Ensure your IAM user has the appropriate permissions
3. Check the AWS region in your repository URL

### Elastic Beanstalk Environment Issues

If your application doesn't work correctly after deployment:

1. Check the Elastic Beanstalk environment health
2. View the logs in the Elastic Beanstalk console
3. SSH into the EC2 instance to check the application logs

## Updating Your Application

To update your application:

1. Make changes to your local repository
2. Commit and push the changes to CodeCommit
3. The pipeline will automatically detect the changes and redeploy

```bash
git add .
git commit -m "Update application"
git push origin main
```

## Cleaning Up

To delete all resources created by this deployment:

1. Delete the Elastic Beanstalk environment
2. Delete the CloudFormation stack:

```bash
aws cloudformation delete-stack --stack-name visitor-sign-in-app-pipeline
```

3. Delete the S3 artifact bucket:

```bash
aws s3 rb s3://visitor-app-artifacts --force
```

## Security Considerations

This deployment setup includes:
- IAM roles with least privilege permissions
- Private S3 bucket for artifacts
- Secure storage of database credentials

For production deployments, consider:
- Enabling HTTPS
- Setting up VPC networking
- Implementing AWS WAF
- Adding monitoring and alerting

## Additional Resources

- [AWS CodePipeline Documentation](https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html)
- [AWS CodeCommit Documentation](https://docs.aws.amazon.com/codecommit/latest/userguide/welcome.html)
- [AWS CodeBuild Documentation](https://docs.aws.amazon.com/codebuild/latest/userguide/welcome.html)
- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)