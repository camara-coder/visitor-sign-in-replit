# Deploying with an External PostgreSQL Database

This guide provides detailed steps for deploying the Visitor Sign-In application with an external PostgreSQL database. This approach is simpler and more reliable than trying to create the RDS database within the Elastic Beanstalk environment.

## Prerequisites

1. An AWS account with permissions to create:
   - Elastic Beanstalk environments
   - RDS instances
   - IAM roles
   - Security groups

2. The AWS CLI installed and configured with appropriate credentials
3. PostgreSQL client tools (optional, for testing connectivity)

## Step 1: Create a PostgreSQL RDS Instance

First, create a standalone RDS instance:

```bash
# Create a security group for the database
aws ec2 create-security-group \
  --group-name visitor-db-sg \
  --description "Security group for Visitor App database" \
  --vpc-id YOUR_VPC_ID

# Note the security group ID from the output
DB_SECURITY_GROUP_ID=sg-xxxxxxxxxxxxxxxxx

# Create the RDS instance
aws rds create-db-instance \
  --db-instance-identifier visitor-app-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 13.7 \
  --master-username visitorapp \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids $DB_SECURITY_GROUP_ID \
  --db-name visitordb \
  --backup-retention-period 7 \
  --no-publicly-accessible
```

## Step 2: Configure Security Group Access

Allow the Elastic Beanstalk environment to access the database:

```bash
# First create your Elastic Beanstalk environment (detailed later)
# Then get the security group ID for your Elastic Beanstalk environment
EB_SECURITY_GROUP_ID=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name visitor-signin-prod \
  --query "EnvironmentResources.Instances[0].SecurityGroups[0]" \
  --output text)

# Allow inbound PostgreSQL traffic from Elastic Beanstalk
aws ec2 authorize-security-group-ingress \
  --group-id $DB_SECURITY_GROUP_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SECURITY_GROUP_ID
```

## Step 3: Prepare Your Application for Deployment

1. Create the .ebextensions directory structure for configuration:

```
.ebextensions/
  ├── 01_environment.config
  └── 02_nginx.config
.platform/
  └── nginx/
      └── conf.d/
          └── proxy.conf
```

2. Create `.ebextensions/01_environment.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8080
    SESSION_SECRET: your-secure-session-secret
    EMAIL_SERVICE_ENABLED: true
    PGUSER: visitorapp
    PGDATABASE: visitordb
    PGPORT: 5432
    PGHOST: your-db-endpoint.rds.amazonaws.com
    PGPASSWORD: your-secure-db-password
```

3. Create `.ebextensions/02_nginx.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:environment:
    LoadBalancerType: application
  
  aws:elbv2:listener:80:
    ListenerEnabled: 'true'
    DefaultProcess: default
    Protocol: HTTP
    
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
    Port: '8080'
    Protocol: HTTP
    HealthCheckTimeout: 10
    HealthCheckInterval: 15
    HealthyThresholdCount: 3
    UnhealthyThresholdCount: 5
```

4. Create `.platform/nginx/conf.d/proxy.conf`:

```nginx
upstream nodejs {
  server 127.0.0.1:8080;
  keepalive 256;
}

server {
  listen 80;

  location / {
    proxy_pass http://nodejs;
    proxy_set_header Connection "";
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Step 4: Create the Elastic Beanstalk Environment

```bash
# Initialize Elastic Beanstalk application (if not already created)
aws elasticbeanstalk create-application --application-name visitor-sign-in-app

# Create the environment
aws elasticbeanstalk create-environment \
  --application-name visitor-sign-in-app \
  --environment-name visitor-signin-prod \
  --solution-stack-name "64bit Amazon Linux 2023 v6.5.1 running Node.js 20" \
  --option-settings file://eb-options.json
```

Create an `eb-options.json` file with your environment settings:

```json
[
  {
    "Namespace": "aws:autoscaling:launchconfiguration",
    "OptionName": "InstanceType",
    "Value": "t3.micro"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "NODE_ENV",
    "Value": "production"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PGHOST",
    "Value": "your-db-endpoint.rds.amazonaws.com"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PGPORT",
    "Value": "5432"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PGDATABASE",
    "Value": "visitordb"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PGUSER",
    "Value": "visitorapp"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "PGPASSWORD",
    "Value": "your-secure-db-password"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "SESSION_SECRET",
    "Value": "your-secure-session-secret"
  },
  {
    "Namespace": "aws:elasticbeanstalk:application:environment",
    "OptionName": "EMAIL_SERVICE_ENABLED",
    "Value": "true"
  }
]
```

## Step 5: Deploy Your Application

```bash
# Create a deployment package
zip -r deploy.zip . -x "*.git*" -x "terraform/*" -x "scripts/*" -x "lambda-functions/*" -x "lambda/*" -x "node_modules/*"

# Deploy to Elastic Beanstalk
aws elasticbeanstalk create-application-version \
  --application-name visitor-sign-in-app \
  --version-label v1 \
  --source-bundle S3Bucket=your-deployment-bucket,S3Key=deploy.zip

# Update the environment with the new version
aws elasticbeanstalk update-environment \
  --application-name visitor-sign-in-app \
  --environment-name visitor-signin-prod \
  --version-label v1
```

## Step 6: Verify the Deployment

1. Check environment health:
   ```bash
   aws elasticbeanstalk describe-environments \
     --environment-names visitor-signin-prod \
     --query "Environments[0].{Status:Status,Health:Health}"
   ```

2. Get the environment URL:
   ```bash
   aws elasticbeanstalk describe-environments \
     --environment-names visitor-signin-prod \
     --query "Environments[0].CNAME" \
     --output text
   ```

3. Visit the application URL in your browser to verify it's working correctly

## Troubleshooting

1. **Database connection issues**:
   - Verify security group settings to ensure the Elastic Beanstalk environment can connect to the RDS instance
   - Check environment variables to ensure the database connection details are correct
   - Review Elastic Beanstalk logs for any connection errors

2. **Application startup failures**:
   - Check logs with `aws elasticbeanstalk retrieve-environment-info --environment-name visitor-signin-prod`
   - Verify the Procfile is correctly set up with `web: npm start`
   - Ensure package.json has a valid start script

3. **NGINX configuration issues**:
   - SSH into the instance to check NGINX logs
   - Verify the proxy pass is correctly configured in the NGINX configuration

## Best Practices

1. **Security**:
   - Use AWS Secrets Manager or Parameter Store for sensitive information
   - Regularly rotate database passwords
   - Use the least privilege principle for IAM roles

2. **Monitoring**:
   - Set up CloudWatch Alarms for monitoring the environment
   - Configure SNS notifications for important events
   - Implement application logging with an appropriate level of detail

3. **Database Management**:
   - Set up automated snapshots for the RDS instance
   - Consider using a replica for read-heavy workloads
   - Implement a regular backup strategy

By following this guide, you'll have a more robust deployment with a properly configured external PostgreSQL database, which avoids many of the validation issues encountered when trying to create RDS within the Elastic Beanstalk environment.