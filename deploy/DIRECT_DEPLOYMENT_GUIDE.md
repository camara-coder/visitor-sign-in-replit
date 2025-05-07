# Direct Elastic Beanstalk Deployment Guide

This guide provides instructions for deploying the Visitor Sign-In application directly to AWS Elastic Beanstalk without using the complex CodePipeline/CodeBuild infrastructure. This approach is simpler and less likely to encounter validation errors with restricted IAM permissions.

## Prerequisites

1. AWS CLI installed and configured with appropriate credentials
2. Bash shell environment (Git Bash on Windows, Terminal on macOS/Linux)
3. Permissions to create CloudFormation stacks and Elastic Beanstalk resources

## Deployment Steps

### 1. Set Up Infrastructure

The `elasticbeanstalk-direct.yaml` CloudFormation template creates:
- An Elastic Beanstalk application
- An Elastic Beanstalk environment
- Necessary IAM roles and instance profiles
- Environment configuration with your database settings

To deploy the infrastructure:

```bash
# Navigate to the scripts directory
cd scripts

# Make the deployment script executable
chmod +x deploy-elasticbeanstalk-direct.sh

# Run the deployment script
./deploy-elasticbeanstalk-direct.sh
```

You will be prompted for sensitive information:
- Database password
- Session secret
- Email service enabled flag

### 2. Deploy Your Application Code

Once the Elastic Beanstalk environment is created, you need to deploy your application code. You have two options:

#### Option A: Using the AWS Console

1. Bundle your application:
   ```bash
   # From your project root directory
   zip -r deploy.zip . -x "*.git*" -x "terraform/*" -x "scripts/*" -x "lambda-functions/*" -x "lambda/*"
   ```

2. Go to the AWS Management Console
3. Navigate to Elastic Beanstalk > Environments
4. Select your environment (e.g., visitor-signin-prod)
5. Click "Upload and Deploy"
6. Upload your `deploy.zip` file
7. Click "Deploy"

#### Option B: Using the EB CLI

1. Install the Elastic Beanstalk CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB CLI in your project:
   ```bash
   # From your project root directory
   eb init

   # Follow the prompts:
   # - Select the region (e.g., us-east-1)
   # - Select the application (visitor-signin-app)
   # - Select the Node.js platform
   ```

3. Deploy to your environment:
   ```bash
   eb deploy visitor-signin-prod
   ```

### 3. Verify Deployment

After deployment completes, access your application using the provided URL:
```
http://visitor-signin-prod.us-east-1.elasticbeanstalk.com
```

## Troubleshooting

### Environment Creation Issues

If the environment creation fails, check the CloudFormation events:
```bash
aws cloudformation describe-stack-events --stack-name visitor-signin-stack
```

### Application Deployment Issues

If the application deployment fails, check the Elastic Beanstalk logs:
```bash
# If using EB CLI
eb logs

# Or in the AWS Console:
# Elastic Beanstalk > Environments > visitor-signin-prod > Logs
```

## Cleanup

To remove all resources when no longer needed:
```bash
aws cloudformation delete-stack --stack-name visitor-signin-stack
```

## Security Considerations

- Never commit sensitive information (database passwords, session secrets, etc.) to version control
- Consider using AWS Secrets Manager or Parameter Store for managing secrets in production environments
- Review the IAM permissions granted to ensure they follow the principle of least privilege