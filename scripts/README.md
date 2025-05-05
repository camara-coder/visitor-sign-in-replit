# Visitor Sign-In App Deployment Scripts

This directory contains scripts for deploying and managing the Visitor Sign-In application on AWS using various deployment methods.

## AWS Authentication

These scripts support both standard AWS credentials and AWS SSO (Single Sign-On) authentication:

* **Standard AWS Credentials**: If you've run `aws configure` and set up your access key and secret key
* **AWS SSO**: If you've configured SSO profiles using `aws configure sso`

## Available Scripts

### AWS SSO Helper Scripts

* `aws-sso-login.sh` - Standalone script to authenticate with AWS SSO
* `aws-sso-helper.sh` - Helper functions for AWS SSO used by other scripts
* `check-aws-permissions.sh` - Verify AWS permissions before deployment

### Deployment Methods

#### 1. Direct Elastic Beanstalk Deployment

The simplest deployment method, suitable for users who want a straightforward setup:

* `deploy.sh` - Basic deployment to AWS Elastic Beanstalk
* `deploy-eb-direct.sh` - More advanced direct EB deployment with configuration options

#### 2. AWS CodePipeline CI/CD Deployment

For continuous integration/continuous deployment with Git-based workflows:

* `deploy-with-codepipeline.sh` - Set up a complete CI/CD pipeline with CodePipeline and CodeBuild
* `setup-codepipeline.sh` - Core script to set up CodePipeline infrastructure

#### 3. Terraform-Based Deployment 

For infrastructure-as-code deployment with more control:

* `deploy-terraform.sh` - Deploy using Terraform for infrastructure as code

#### 4. Auxiliary Setup Scripts

Additional scripts for specific components:

* `setup-iam-policies.sh` - Set up IAM roles and policies for deployment
* `setup-scheduled-events.sh` - Set up CloudWatch and EventBridge for scheduled events
* `setup-monitoring.sh` - Set up CloudWatch dashboards and alarms
* `setup-aws-params.sh` - Configure AWS parameters for deployment

### Wrapper Scripts with SSO Support

These scripts automatically handle AWS SSO authentication before running the actual deployment:

* `run-setup-codepipeline.sh` - Set up CodePipeline CI/CD with SSO authentication
* `run-setup-iam-policies.sh` - Set up IAM policies with SSO authentication
* `run-setup-scheduled-events.sh` - Set up scheduled events with SSO authentication
* `run-setup-monitoring.sh` - Set up monitoring resources with SSO authentication
* `run-deploy-complete.sh` - Run complete deployment with SSO authentication

## Deployment Guide

### Step 1: Choose Your Deployment Method

Choose the most appropriate method based on your needs:

| Method | Script | Best For | Features |
|--------|--------|----------|----------|
| Simple EB | `deploy.sh` | Quick deployments | Basic EB deployment |
| Direct EB | `deploy-eb-direct.sh` | Production with customization | EB with database and monitoring |
| CI/CD Pipeline | `deploy-with-codepipeline.sh` | Teams with Git workflow | Automated deployments from Git |
| Terraform | `deploy-terraform.sh` | Infrastructure as code | Complete control over AWS resources |

### Step 2: Authenticate with AWS

All scripts will verify your AWS authentication. If you're using AWS SSO:

```bash
# Authenticate with AWS SSO first
./aws-sso-login.sh

# Or use wrapper scripts that handle authentication
./run-deploy-complete.sh
```

### Step 3: Run Your Chosen Deployment Script

Follow the prompts to configure your deployment. Example:

```bash
# Simple Elastic Beanstalk deployment
./deploy.sh

# OR CI/CD Pipeline deployment
./deploy-with-codepipeline.sh

# OR Terraform deployment
./deploy-terraform.sh
```

## Environment Variables

The deployment scripts use the following environment variables, which can be set before running:

* `AWS_PROFILE` - AWS profile to use for authentication
* `AWS_REGION` - AWS region to deploy to (default: us-east-1)
* `NODE_ENV` - Environment (development, staging, production)

## AWS SSO Configuration

If you haven't set up AWS SSO yet, you can do so with:

```bash
aws configure sso

# Follow the prompts to configure your SSO profile
```

For more information, see the [AWS SSO documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

## Troubleshooting

* **Authentication Issues**: Run `aws-sso-login.sh` directly to test your SSO authentication
* **Permission Issues**: Use `check-aws-permissions.sh` to verify your AWS permissions
* **Deployment Logs**: Check CloudFormation or Elastic Beanstalk logs in the AWS Console
* **Missing Dependencies**: Ensure you have the required CLI tools installed (AWS CLI, EB CLI, Terraform)

For more detailed troubleshooting, see the `../deploy/TROUBLESHOOTING.md` file.

## Security Notes

* Deployment scripts store sensitive information (database passwords, session secrets) only locally
* Review all generated configuration files before committing to version control
* Never commit `.elasticbeanstalk/saved_configs/deployment_info.txt` or `.deployment-history/` files
* Use AWS Secrets Manager for production application secrets