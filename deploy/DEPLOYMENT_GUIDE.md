# Visitor Sign-In App Deployment Guide

This guide provides instructions for deploying the Visitor Sign-In application to AWS using the automated deployment scripts.

## Prerequisites

Before you begin, ensure you have:

1. An AWS account with appropriate permissions
2. AWS CLI installed and configured with your credentials
3. The latest code from the repository

## Deployment Options

The application can be deployed using two methods:

1. **CodePipeline Deployment** - Continuous integration/continuous delivery (CI/CD) pipeline
2. **Elastic Beanstalk Direct Deployment** - Manual deployment to Elastic Beanstalk

## Option 1: CodePipeline Deployment (Recommended)

This option sets up a complete CI/CD pipeline that automatically deploys your application whenever code is pushed to the repository.

### Step 1: Execute the CodePipeline Setup Script

```bash
cd scripts
./setup-codepipeline.sh
```

Follow the interactive prompts to provide the required information:

- Application name
- Environment name
- AWS region
- Repository name
- Branch name
- Database credentials
- Session secret

The script will:

1. Create a CodeCommit repository
2. Set up an S3 bucket for artifacts
3. Create a CodeBuild project
4. Configure a CodePipeline
5. Set up Elastic Beanstalk environment
6. Create RDS PostgreSQL database
7. Store secrets in AWS Parameter Store

### Step 2: Push Code to the Repository

After the pipeline is created, you'll need to push your code to the CodeCommit repository:

```bash
git remote add aws [CodeCommit-Repository-URL]
git push aws main
```

The CodePipeline will automatically trigger a deployment.

### Step 3: Deploy Scheduled Events Resources

After the main deployment is complete, deploy the CloudWatch resources for scheduled events:

```bash
cd scripts
./setup-scheduled-events.sh
```

## Option 2: Elastic Beanstalk Direct Deployment

For a more manual approach, you can deploy directly to Elastic Beanstalk.

### Step 1: Set Up Elastic Beanstalk Environment

```bash
# Initialize EB CLI
eb init visitor-sign-in-app --platform node.js --region us-east-1

# Create environment
eb create production --database --database.engine postgres \
  --database.username postgres \
  --database.password [YOUR_PASSWORD] \
  --database.size 5 \
  --database.instance db.t3.micro \
  --envvars NODE_ENV=production,SESSION_SECRET=[YOUR_SECRET]
```

### Step 2: Deploy Application

```bash
eb deploy
```

### Step 3: Deploy Scheduled Events Resources

After the main deployment is complete, deploy the CloudWatch resources for scheduled events:

```bash
cd scripts
./setup-scheduled-events.sh
```

## Verifying the Deployment

1. Access the Elastic Beanstalk environment URL
2. Navigate to the `/api/health` endpoint to verify the server is running correctly
3. Test the sign-in functionality

## Deployment Configuration Files

The following files contain the CloudFormation templates for deployment:

- `deploy/codepipeline.yaml` - Main infrastructure stack
- `deploy/scheduled-events-resources.yaml` - CloudWatch and EventBridge resources for scheduled events

## Environment Variables

The following environment variables are configured:

- `NODE_ENV` - Node.js environment (production/development)
- `DATABASE_URL` - Database connection string
- `SESSION_SECRET` - Secret for session encryption
- `EMAIL_SERVICE_ENABLED` - Toggle email notifications

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Check security group settings
   - Verify database credentials

2. **Deployment Failures**
   - Review CloudFormation stack events
   - Check CodeBuild logs

3. **Application Errors**
   - Check Elastic Beanstalk logs
   - Verify environment variables

### Support

For additional assistance, contact your system administrator or open an issue in the repository.