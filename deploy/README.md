# Visitor Sign-In App AWS Deployment Resources

This directory contains resources for deploying the Visitor Sign-In application to AWS.

## Directory Contents

- `DEPLOYMENT_GUIDE.md` - Step-by-step deployment instructions
- `SCHEDULED_EVENTS_GUIDE.md` - Documentation for the scheduled events module
- `CODEPIPELINE_DEPLOYMENT_STEPS.md` - Detailed CodePipeline deployment instructions
- `codepipeline.yaml` - CloudFormation template for CI/CD pipeline deployment
- `scheduled-events-resources.yaml` - CloudFormation template for scheduled events resources
- `monitoring-resources.yaml` - CloudFormation template for CloudWatch monitoring resources

## Deployment Scripts

The application includes deployment scripts in the `scripts/` directory:

- `setup-codepipeline.sh` - Sets up the AWS CodePipeline CI/CD deployment
- `setup-scheduled-events.sh` - Deploys the scheduled events resources
- `setup-monitoring.sh` - Deploys CloudWatch monitoring resources and alarms
- `deploy-complete.sh` - One-click deployment of the complete application stack

## Architecture Overview

The deployed application consists of:

1. **Web Tier** - Elastic Beanstalk environment running the Express.js application
2. **Database Tier** - Amazon RDS PostgreSQL database
3. **Scheduled Events** - EventBridge rules and Lambda functions for event generation
4. **CI/CD Pipeline** - CodePipeline, CodeBuild, and CodeCommit for automated deployments

## Security Considerations

- Database credentials are stored in AWS Secrets Manager
- Session secrets are stored in Systems Manager Parameter Store
- AWS IAM roles with least-privilege permissions
- VPC security groups limit access to resources

## CloudFormation Templates

### codepipeline.yaml

Deploys:
- CodeCommit repository
- CodeBuild project
- CodePipeline
- S3 artifact bucket
- IAM roles and policies
- Elastic Beanstalk environment
- RDS PostgreSQL database

### scheduled-events-resources.yaml

Deploys:
- EventBridge rules
- Lambda functions
- CloudWatch logs
- CloudWatch alarms
- IAM roles and policies
- VPC security group updates

### monitoring-resources.yaml

Deploys:
- CloudWatch dashboards
- CloudWatch alarms
- SNS topics for notifications
- Email subscriptions for alerts

## Prerequisites

Before deploying, ensure you have:

1. AWS CLI installed and configured with appropriate credentials
2. AWS region selected with support for all required services
3. Sufficient IAM permissions to create resources

## Support

For issues or questions, refer to the deployment guides or contact your system administrator.