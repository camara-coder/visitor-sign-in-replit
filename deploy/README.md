# Visitor Sign-In App AWS Deployment Guide

This guide explains how to deploy the Visitor Sign-In Application to AWS using Elastic Beanstalk.

## Prerequisites

Before deploying the application, ensure you have:

1. AWS Account with appropriate permissions
2. [AWS CLI](https://aws.amazon.com/cli/) installed and configured
3. [EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) installed
4. PostgreSQL RDS instance (will be created during deployment)

## Deployment Steps

### 1. Setup AWS Parameters

First, store your secret values in AWS Parameter Store:

```bash
./scripts/setup-aws-params.sh
```

This script will prompt for:
- Database password for RDS
- Session secret for Express.js
- SSL certificate ARN (optional for HTTPS)
- SMTP configuration (optional for email functionality)

### 2. Deploy the Application

Use the deployment script to package and deploy the application:

```bash
./scripts/aws-deploy.sh
```

This script will:
1. Create a deployment package
2. Initialize Elastic Beanstalk if needed
3. Deploy the application to Elastic Beanstalk

## Environment Configuration

The application is configured through the following AWS resources:

- **Elastic Beanstalk Environment**: Hosts the Node.js application
- **RDS PostgreSQL**: Stores user data, events, and visitor information
- **Parameter Store**: Securely stores credentials and sensitive configuration

## Post-Deployment

After successful deployment, the script will output the application URL.

### Accessing the Application

1. Visit the application URL provided at the end of the deployment process
2. Log in with the default admin credentials:
   - Username: `admin`
   - Password: `password`
3. **Important**: Change the default admin password immediately after the first login

### Troubleshooting

If you encounter issues during deployment:

1. Check Elastic Beanstalk logs:
   ```bash
   cd deploy && eb logs
   ```

2. To view environment variables:
   ```bash
   cd deploy && eb printenv
   ```

3. To SSH into the instance:
   ```bash
   cd deploy && eb ssh
   ```

## Configuration and Customization

### Customizing Environment Variables

Edit the `.ebextensions/environment.config` file to customize environment variables.

### HTTPS Configuration

To enable HTTPS:
1. Obtain an SSL certificate via AWS Certificate Manager
2. Update the SSL certificate ARN in Parameter Store
3. The `securelistener.config` will automatically configure HTTPS

### Email Settings

Configure email settings via the AWS Parameter Store using the setup script.

## Maintenance

### Updating the Application

To deploy updates:

1. Make your changes to the codebase
2. Run the deployment script again:
   ```bash
   ./scripts/aws-deploy.sh
   ```

### Scaling

Scale the application through the Elastic Beanstalk console:
1. Go to AWS Elastic Beanstalk console
2. Select your environment
3. Go to Configuration → Capacity and adjust the instance count and type