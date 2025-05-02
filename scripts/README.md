# Deployment Scripts

This directory contains scripts for deploying and managing the Visitor Sign-In application on AWS.

## AWS Authentication

These scripts support both standard AWS credentials and AWS SSO (Single Sign-On) authentication:

* **Standard AWS Credentials**: If you've run `aws configure` and set up your access key and secret key
* **AWS SSO**: If you've configured SSO profiles using `aws configure sso`

## Available Scripts

### AWS SSO Helper Scripts

* `aws-sso-login.sh` - Standalone script to authenticate with AWS SSO
* `aws-sso-helper.sh` - Helper functions for AWS SSO used by other scripts

### Deployment Wrapper Scripts (with SSO Support)

These scripts automatically handle AWS SSO authentication before running the actual deployment:

* `run-setup-codepipeline.sh` - Set up CodePipeline CI/CD with SSO authentication
* `run-setup-iam-policies.sh` - Set up IAM policies with SSO authentication
* `run-setup-scheduled-events.sh` - Set up scheduled events with SSO authentication
* `run-setup-monitoring.sh` - Set up monitoring resources with SSO authentication
* `run-deploy-complete.sh` - Run complete deployment with SSO authentication

### Core Deployment Scripts

* `setup-codepipeline.sh` - Set up AWS CodePipeline for CI/CD deployment
* `setup-iam-policies.sh` - Set up IAM roles and policies for deployment
* `setup-scheduled-events.sh` - Set up CloudWatch and EventBridge for scheduled events
* `setup-monitoring.sh` - Set up CloudWatch dashboards and alarms
* `deploy-complete.sh` - One-step deployment script (runs all required steps)

## Usage Examples

### Using AWS SSO Authentication

```bash
# Authenticate with AWS SSO and set up CodePipeline
./run-setup-codepipeline.sh

# Authenticate with AWS SSO and deploy everything
./run-deploy-complete.sh
```

### Using Standard AWS Credentials

If you already have AWS credentials configured, you can use the base scripts directly:

```bash
# Set up CodePipeline (if using standard AWS credentials)
./setup-codepipeline.sh

# Deploy everything (if using standard AWS credentials)
./deploy-complete.sh
```

## AWS SSO Configuration

If you haven't set up AWS SSO yet, you can do so with:

```bash
aws configure sso

# Follow the prompts to configure your SSO profile
```

For more information, see the [AWS SSO documentation](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html).

## Troubleshooting

* If you encounter authentication issues, try running `aws-sso-login.sh` directly to test your SSO authentication
* Check that your AWS CLI is properly configured with `aws sts get-caller-identity`
* Ensure you have appropriate permissions in your AWS account