# Deploying with GitHub and AWS CodePipeline

This guide provides instructions for deploying the Visitor Sign-In Application using AWS CodePipeline with GitHub as the source repository.

## Why GitHub Instead of CodeCommit?

As of July 25, 2024, AWS has stopped onboarding new customers to AWS CodeCommit. This guide uses GitHub as an alternative source repository that integrates well with AWS CI/CD services.

## Prerequisites

Before starting, you'll need:

- An AWS account with appropriate permissions
- A GitHub account
- Git installed on your local machine
- Your application code pushed to a GitHub repository
- AWS CLI installed and configured

## Setting Up Your GitHub Repository

1. Create a new repository on GitHub or use an existing one.
2. Ensure your repository contains all necessary application files, including:
   - Application source code
   - `buildspec.yml` for AWS CodeBuild
   - `.ebextensions/` directory (if using Elastic Beanstalk-specific configurations)
   - `Procfile` (if using a custom process type)

### Sample buildspec.yml

```yaml
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
```

## Deployment Steps

### Option 1: Using Our Deployment Script

We've provided a script that automates the setup process:

1. Navigate to the `scripts` directory:
   ```bash
   cd scripts
   ```

2. Run the deployment script:
   ```bash
   ./deploy-with-github.sh
   ```

3. Follow the prompts to enter your configuration details:
   - Application name
   - GitHub repository owner (username or organization)
   - GitHub repository name
   - GitHub branch name
   - AWS region
   - Database credentials
   - Other configuration options

4. After deployment, the script will display important information and next steps.

### Option 2: Manual Setup

If you prefer to set up the deployment manually:

1. Create an S3 bucket for build artifacts.

2. Deploy the CloudFormation stack:
   ```bash
   aws cloudformation deploy \
       --template-file deploy/codepipeline-github.yaml \
       --stack-name visitor-sign-in-pipeline \
       --parameter-overrides \
           AppName=visitor-sign-in-app \
           EnvironmentName=production \
           GitHubOwner=your-github-username \
           GitHubRepo=your-repo-name \
           GitHubBranch=main \
           ElasticBeanstalkApplicationName=visitor-sign-in-app \
           ElasticBeanstalkEnvironmentName=visitor-sign-in-app-production \
           DatabasePassword=your-secure-password \
           SessionSecret=your-session-secret \
           ArtifactBucketName=visitor-app-artifacts \
           PlatformVersion="Node.js 20" \
           InstanceType=t3.small \
       --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
       --region us-east-1
   ```

## Post-Deployment Setup

After the CloudFormation stack is deployed, there's one manual step required:

### Activating the GitHub Connection

1. Go to the AWS Console > Developer Tools > Settings > Connections.
2. Find the connection named `[your-app-name]-github-connection`.
3. Click "Update pending connection" and follow the GitHub authentication process.
4. Once authorized, the connection status will change to "Available".

This step is necessary because AWS requires explicit authorization to access your GitHub repositories.

## Understanding the Deployment Architecture

This deployment setup includes:

1. **Source Stage**: AWS CodeStar Connections integrate with GitHub to pull your source code.
2. **Build Stage**: AWS CodeBuild compiles and packages your application.
3. **Deploy Stage**: AWS Elastic Beanstalk deploys your application.

The CI/CD pipeline automatically triggers whenever changes are pushed to the specified branch of your GitHub repository.

## Troubleshooting

### GitHub Connection Issues

- **Problem**: Connection shows as "Pending" and pipeline doesn't start.
- **Solution**: Go to AWS Console > Developer Tools > Settings > Connections and complete the GitHub authorization.

### Build Failures

- **Problem**: Build stage fails in CodePipeline.
- **Solution**: Check the CodeBuild logs in the AWS Console. Common issues include missing dependencies or incorrect `buildspec.yml` configuration.

### Deployment Failures

- **Problem**: Deployment stage fails in CodePipeline.
- **Solution**: Check the Elastic Beanstalk environment health status and logs. Common issues include application startup failures or database connection problems.

## Additional Resources

- [AWS CodeStar Connections Documentation](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections.html)
- [AWS CodePipeline User Guide](https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html)
- [GitHub Documentation](https://docs.github.com)
- [Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html)