# Deployment Troubleshooting Guide

This guide addresses common issues that may occur during deployment of the Visitor Sign-In application.

## AWS SSO Permission Issues

### Problem: IAM Permission Errors with AWS SSO

When using AWS SSO authentication with the `PowerUserAccess` role (or similar roles), you may encounter permission errors like:

```
User: arn:aws:sts::ACCOUNT_ID:assumed-role/AWSReservedSSO_PowerUserAccess_*/USER is not authorized to perform: iam:CreateRole
```

This occurs because many AWS SSO roles, including the common `PowerUserAccess` role, have restrictions on IAM permissions for security reasons.

### Solution Options:

#### Option 1: Use Administrator Access (Recommended for Development)

If you have access to an administrative role through SSO, switch to that role:

1. Log out of your current AWS SSO session
2. Log in with a role that has `AdministratorAccess` or equivalent permissions
3. Run the deployment scripts again

#### Option 2: Request IAM Permission Updates

Have your AWS administrator add these specific permissions to your SSO role:

- `iam:CreateRole`
- `iam:AttachRolePolicy`
- `iam:PutRolePolicy`
- `iam:DetachRolePolicy`
- `iam:DeleteRole`
- `iam:TagRole`

#### Option 3: Use Pre-Created IAM Roles (Most Secure)

For a more secure approach:

1. Ask your AWS administrator to pre-create the needed IAM roles:
   - CodePipeline service role
   - CodeBuild service role
   - CloudFormation service role

2. Update the CloudFormation template in `deploy/codepipeline.yaml` to use these existing roles:
   
   ```yaml
   # Change from creating a new role:
   CodePipelineServiceRole:
     Type: AWS::IAM::Role
     
   # To using an existing role:
   # Remove the IAM::Role resources and reference existing ones in your services
   ```

3. Run the deployment without creating new IAM roles

## S3 Bucket Already Exists

### Problem: S3 Bucket Creation Failure

```
Bucket "visitor-app-artifacts" already exists
```

### Solution:
1. Use a different bucket name in your deployment parameters
2. If you own the bucket, delete it first (if it's not in use)
3. Update the CloudFormation template to use a unique bucket name with a timestamp or account ID suffix

## CloudFormation Stack Failed to Delete

### Problem: Stack Status Shows DELETE_FAILED or ROLLBACK_FAILED

```
StackStatus: ROLLBACK_FAILED
ResourceStatusReason: The following resource(s) failed to delete: [CodeBuildServiceRole, CodePipelineServiceRole].
```

### Solution:
1. Go to the AWS CloudFormation console
2. Click on your stack
3. Choose "Delete Stack"
4. If it fails again, check "Retain resources" for the resources that failed to delete
5. Manually clean up those resources after the stack deletion

## CodeCommit Repository Issues

### Problem: Cannot push to CodeCommit repository

```
fatal: unable to access 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/visitor-sign-in-app/': The requested URL returned error: 403
```

### Solution:
1. Verify your AWS credentials are properly configured
2. Make sure your IAM user/role has `AWSCodeCommitFullAccess` permissions
3. Set up Git credentials for AWS CodeCommit:
   ```
   aws codecommit credential-helper --setup
   ```

## Other Common Issues

### Database Connection Failures
- Check security group settings to ensure proper access
- Verify that database credentials are correct
- Confirm database endpoint is reachable

### Elastic Beanstalk Environment Health Issues
- Check application logs through the EB Console
- Validate environment variables are set correctly
- Ensure instance profile has permissions to access other AWS services

## Getting Advanced Help

If you're unable to resolve the issue using this guide:

1. Check the AWS service-specific documentation
2. Collect relevant logs and error messages
3. Contact your AWS administrator or open a support case
4. Include the stack name, region, and complete error messages