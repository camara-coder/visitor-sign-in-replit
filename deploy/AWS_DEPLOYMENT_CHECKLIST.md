# AWS Elastic Beanstalk Deployment Checklist

This document provides a checklist of items to verify before deploying the Visitor Sign-In application to AWS Elastic Beanstalk.

## Solution Stack

Based on available AWS Elastic Beanstalk solution stacks, use one of the following exact stack names in your CloudFormation templates:

- `64bit Amazon Linux 2023 v6.5.1 running Node.js 20` (Recommended - latest)
- `64bit Amazon Linux 2023 v6.5.1 running Node.js 18`
- `64bit Amazon Linux 2 v5.10.1 running Node.js 18`

Both templates have been updated to use:
```
64bit Amazon Linux 2023 v6.5.1 running Node.js 20
```

## Required Changes to Local Repository Files

Before deploying, make sure your local repository has the following configurations:

### package.json

Update your package.json to include a start script:

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node server.js"
  }
}
```

### Procfile

Ensure your Procfile contains:
```
web: npm start
```

### Database Configuration

Make sure your application can connect to the database using the environment variables:
- DATABASE_NAME
- DATABASE_USERNAME
- DATABASE_PASSWORD
- DATABASE_PORT

These will be provided by the CloudFormation template to your Elastic Beanstalk environment.

## Deployment Methods

### Method 1: Direct Elastic Beanstalk Deployment

Use the scripts/deploy-elasticbeanstalk-direct.sh script:

```bash
cd scripts
./deploy-elasticbeanstalk-direct.sh
```

You will be prompted for:
- Database password
- Session secret
- Email service flag (true/false)

### Method 2: GitHub Integration with CodeBuild

Use the scripts/deploy-with-github.sh script:

```bash
cd scripts
./deploy-with-github.sh
```

This will set up a CodeBuild project that pulls from your GitHub repository and deploys to Elastic Beanstalk.

## After Deployment

After successful deployment of the CloudFormation stack:

1. Bundle your application for uploading:
   ```bash
   zip -r deploy.zip . -x "*.git*" -x "terraform/*" -x "scripts/*" -x "lambda-functions/*" -x "lambda/*"
   ```

2. Upload and deploy to your Elastic Beanstalk environment:
   - AWS Console: Go to Elastic Beanstalk > Environments > [YOUR_ENV_NAME] > Upload and Deploy
   - EB CLI: `eb deploy [YOUR_ENV_NAME]`

## Troubleshooting

- Check Elastic Beanstalk logs for any deployment issues
- Verify that environment variables are correctly set in the Elastic Beanstalk environment
- Check CloudFormation stack events for any resource creation failures
- Ensure your IAM roles have necessary permissions for deployment