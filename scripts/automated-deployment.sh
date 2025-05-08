#!/bin/bash
# Fully automated deployment script for Visitor Sign-In Application
# Creates CloudFormation stack for RDS database and Elastic Beanstalk environment
# Deploys application code automatically

# Exit on error
set -e

# Configuration variables
APP_NAME="visitor-signin-app"
ENV_NAME="visitor-signin-prod"
REGION="us-east-1"
STACK_NAME="visitor-signin-infrastructure"
DB_USERNAME="visitorapp"
DB_NAME="visitordb"
DB_PORT="5432"
S3_BUCKET="${APP_NAME}-deployment-artifacts"
SOLUTION_STACK="64bit Amazon Linux 2023 v6.5.1 running Node.js 20"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Visitor Sign-In Application - Automated Deployment ===${NC}"
echo ""

# Check if AWS CLI is installed and configured
echo -e "${YELLOW}Checking AWS CLI configuration...${NC}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Test AWS CLI configuration
echo "Testing AWS CLI configuration..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}AWS CLI is not configured correctly. Please run 'aws configure'.${NC}"
    exit 1
fi
echo -e "${GREEN}AWS CLI configured successfully${NC}"

# Get secure input for sensitive parameters
read -s -p "Enter database password: " DB_PASSWORD
echo ""
read -s -p "Enter session secret: " SESSION_SECRET
echo ""
read -p "Enable email service? (true/false): " EMAIL_SERVICE_ENABLED
EMAIL_SERVICE_ENABLED=${EMAIL_SERVICE_ENABLED:-false}

# Create S3 bucket for deployment artifacts if it doesn't exist
echo -e "${YELLOW}Creating/verifying S3 bucket for deployment artifacts...${NC}"
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    aws s3 mb "s3://${S3_BUCKET}" --region "$REGION"
    aws s3api put-bucket-versioning --bucket "$S3_BUCKET" --versioning-configuration Status=Enabled
    echo -e "${GREEN}Created S3 bucket: ${S3_BUCKET}${NC}"
else
    echo -e "${GREEN}S3 bucket ${S3_BUCKET} already exists${NC}"
fi

# Create a temporary directory for CloudFormation templates
TEMP_DIR=$(mktemp -d)
echo -e "${YELLOW}Created temporary directory: ${TEMP_DIR}${NC}"

# Create the CloudFormation template for infrastructure
cat << EOF > "$TEMP_DIR/infrastructure.yaml"
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Infrastructure for Visitor Sign-In Application'

Parameters:
  DBUsername:
    Type: String
    Description: Username for the database
  
  DBPassword:
    Type: String
    Description: Password for the database
    NoEcho: true
  
  DBName:
    Type: String
    Description: Name of the database
  
  AppName:
    Type: String
    Description: Name of the application
  
  Environment:
    Type: String
    Description: Environment name (production, staging, development)
    Default: production
    AllowedValues:
      - production
      - staging
      - development
  
  SessionSecret:
    Type: String
    Description: Secret for session encryption
    NoEcho: true
  
  EmailServiceEnabled:
    Type: String
    Description: Enable email service
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
  
  SolutionStackName:
    Type: String
    Description: Elastic Beanstalk solution stack name

Resources:
  # VPC for isolated resources
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-vpc

  # Internet Gateway for VPC
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-igw

  # Attach Internet Gateway to VPC
  InternetGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public Subnet 1
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-public-subnet-1

  # Public Subnet 2
  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.2.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-public-subnet-2

  # Private Subnet 1 (for RDS)
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: 10.0.3.0/24
      MapPublicIpOnLaunch: false
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-private-subnet-1

  # Private Subnet 2 (for RDS)
  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: 10.0.4.0/24
      MapPublicIpOnLaunch: false
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-private-subnet-2

  # Route Table for Public Subnets
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-public-route-table

  # Route to Internet Gateway
  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: InternetGatewayAttachment
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  # Route Table Association for Public Subnet 1
  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  # Route Table Association for Public Subnet 2
  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  # Private Route Table for Private Subnets
  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-private-route-table

  # Associate Private Subnet 1 with Private Route Table
  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable

  # Associate Private Subnet 2 with Private Route Table
  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet2
      RouteTableId: !Ref PrivateRouteTable

  # Database Security Group
  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Enable database access for Elastic Beanstalk
      VpcId: !Ref VPC
      SecurityGroupIngress: []  # Will be updated later to allow access from EB security group

  # Elastic Beanstalk Security Group
  ElasticBeanstalkSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Enable HTTP/HTTPS access for Elastic Beanstalk
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  # Allow Elastic Beanstalk to access the database
  DatabaseIngress:
    Type: AWS::EC2::SecurityGroupIngress
    Properties:
      GroupId: !GetAtt DatabaseSecurityGroup.GroupId
      IpProtocol: tcp
      FromPort: 5432
      ToPort: 5432
      SourceSecurityGroupId: !GetAtt ElasticBeanstalkSecurityGroup.GroupId

  # DB Subnet Group for RDS
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnet group for RDS database
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-db-subnet-group

  # RDS Database Instance
  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      AllocatedStorage: 20
      DBInstanceIdentifier: !Sub \${AppName}-db
      DBName: !Ref DBName
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: 13.7
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      MultiAZ: false
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !GetAtt DatabaseSecurityGroup.GroupId
      PubliclyAccessible: false
      StorageType: gp2
      BackupRetentionPeriod: 7
      DeletionProtection: false
      Tags:
        - Key: Name
          Value: !Sub \${AppName}-database

  # IAM Role for Elastic Beanstalk Service
  ElasticBeanstalkServiceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: elasticbeanstalk.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkService'
        - 'arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth'

  # IAM Role for EC2 Instances
  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Path: /
      Roles:
        - !Ref EC2InstanceRole

  # IAM Role for EC2 Instances
  EC2InstanceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: 'sts:AssumeRole'
      ManagedPolicyArns:
        - 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
        - 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
        - 'arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier'
        - 'arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker'

  # Elastic Beanstalk Application
  ElasticBeanstalkApplication:
    Type: AWS::ElasticBeanstalk::Application
    Properties:
      ApplicationName: !Ref AppName
      Description: !Sub "Visitor Sign-In Application for \${Environment} environment"

  # Elastic Beanstalk Environment
  ElasticBeanstalkEnvironment:
    Type: AWS::ElasticBeanstalk::Environment
    Properties:
      ApplicationName: !Ref ElasticBeanstalkApplication
      EnvironmentName: !Ref Environment
      SolutionStackName: !Ref SolutionStackName
      Tier:
        Name: WebServer
        Type: Standard
      OptionSettings:
        # Environment Variables
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: NODE_ENV
          Value: !Ref Environment
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PORT
          Value: "8080"
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: SESSION_SECRET
          Value: !Ref SessionSecret
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: EMAIL_SERVICE_ENABLED
          Value: !Ref EmailServiceEnabled
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PGUSER
          Value: !Ref DBUsername
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PGPASSWORD
          Value: !Ref DBPassword
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PGDATABASE
          Value: !Ref DBName
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PGPORT
          Value: "5432"
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: PGHOST
          Value: !GetAtt RDSInstance.Endpoint.Address
          
        - Namespace: aws:elasticbeanstalk:application:environment
          OptionName: DATABASE_URL
          Value: !Sub "postgres://\${DBUsername}:\${DBPassword}@\${RDSInstance.Endpoint.Address}:5432/\${DBName}"
        
        # VPC Configuration
        - Namespace: aws:ec2:vpc
          OptionName: VPCId
          Value: !Ref VPC
          
        - Namespace: aws:ec2:vpc
          OptionName: Subnets
          Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2]]
          
        - Namespace: aws:ec2:vpc
          OptionName: ELBSubnets
          Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2]]
          
        - Namespace: aws:autoscaling:launchconfiguration
          OptionName: SecurityGroups
          Value: !Ref ElasticBeanstalkSecurityGroup
          
        # Auto Scaling
        - Namespace: aws:autoscaling:asg
          OptionName: MinSize
          Value: '1'
          
        - Namespace: aws:autoscaling:asg
          OptionName: MaxSize
          Value: '3'
          
        # Instance Configuration
        - Namespace: aws:autoscaling:launchconfiguration
          OptionName: InstanceType
          Value: t3.micro
          
        - Namespace: aws:autoscaling:launchconfiguration
          OptionName: IamInstanceProfile
          Value: !Ref EC2InstanceProfile
          
        # Load Balancer
        - Namespace: aws:elasticbeanstalk:environment
          OptionName: LoadBalancerType
          Value: application
          
        - Namespace: aws:elasticbeanstalk:environment
          OptionName: ServiceRole
          Value: !Ref ElasticBeanstalkServiceRole
          
        # Process Settings
        - Namespace: aws:elasticbeanstalk:environment:process:default
          OptionName: HealthCheckPath
          Value: "/"
          
        - Namespace: aws:elasticbeanstalk:environment:process:default
          OptionName: Port
          Value: '8080'
          
        - Namespace: aws:elasticbeanstalk:environment:process:default
          OptionName: Protocol
          Value: HTTP
          
        # HTTP Listener
        - Namespace: aws:elbv2:listener:80
          OptionName: ListenerEnabled
          Value: 'true'
          
        - Namespace: aws:elbv2:listener:80
          OptionName: Protocol
          Value: HTTP
          
        - Namespace: aws:elbv2:listener:80
          OptionName: DefaultProcess
          Value: default

Outputs:
  DatabaseEndpoint:
    Description: Endpoint of the RDS Database
    Value: !GetAtt RDSInstance.Endpoint.Address
    
  DatabasePort:
    Description: Port of the RDS Database
    Value: !GetAtt RDSInstance.Endpoint.Port
    
  ApplicationURL:
    Description: URL of the Elastic Beanstalk environment
    Value: !Sub "http://\${ElasticBeanstalkEnvironment}.${AWS::Region}.elasticbeanstalk.com"
    
  VPCId:
    Description: ID of the VPC
    Value: !Ref VPC
EOF

# Create deployment bucket policy file
cat << EOF > "$TEMP_DIR/bucket-policy.json"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowElasticBeanstalkAccessToS3Bucket",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectAcl",
        "s3:GetObjectVersion",
        "s3:GetObjectVersionAcl"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${S3_BUCKET}/*",
      "Principal": {
        "Service": "elasticbeanstalk.amazonaws.com"
      }
    }
  ]
}
EOF

# Apply bucket policy
echo -e "${YELLOW}Setting S3 bucket policy...${NC}"
aws s3api put-bucket-policy --bucket "$S3_BUCKET" --policy file://"$TEMP_DIR/bucket-policy.json"

# Create the infrastructure stack
echo -e "${YELLOW}Creating CloudFormation stack for infrastructure...${NC}"
aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://"$TEMP_DIR/infrastructure.yaml" \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=DBUsername,ParameterValue="$DB_USERNAME" \
    ParameterKey=DBPassword,ParameterValue="$DB_PASSWORD" \
    ParameterKey=DBName,ParameterValue="$DB_NAME" \
    ParameterKey=AppName,ParameterValue="$APP_NAME" \
    ParameterKey=Environment,ParameterValue="$ENV_NAME" \
    ParameterKey=SessionSecret,ParameterValue="$SESSION_SECRET" \
    ParameterKey=EmailServiceEnabled,ParameterValue="$EMAIL_SERVICE_ENABLED" \
    ParameterKey=SolutionStackName,ParameterValue="$SOLUTION_STACK"

echo -e "${GREEN}Infrastructure stack creation initiated:${NC} $STACK_NAME"
echo -e "${YELLOW}Waiting for infrastructure stack to be created...${NC}"
aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"

# Get outputs from the stack
echo -e "${YELLOW}Retrieving outputs from stack...${NC}"
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" --output text)
DB_PORT=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='DatabasePort'].OutputValue" --output text)
APP_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ApplicationURL'].OutputValue" --output text)

echo -e "${GREEN}Infrastructure created successfully!${NC}"
echo "Database Endpoint: $DB_ENDPOINT"
echo "Database Port: $DB_PORT"
echo "Application URL: $APP_URL"

# Create application deployment package
echo -e "${YELLOW}Preparing application deployment package...${NC}"
DEPLOY_DIR=$(mktemp -d)
echo -e "${YELLOW}Created temporary deployment directory: ${DEPLOY_DIR}${NC}"

# Copy application files to deployment directory
echo "Copying application files..."
cp -r ../{*.js,*.json,Procfile,.platform,.ebextensions,next.js-frontend,src} "$DEPLOY_DIR"

# Create a package.json with a start script if it doesn't exist or doesn't have one
if [ ! -f "$DEPLOY_DIR/package.json" ] || ! grep -q '"start"' "$DEPLOY_DIR/package.json"; then
    echo "Adding start script to package.json..."
    # Add start script without losing existing content
    if [ -f "$DEPLOY_DIR/package.json" ]; then
        # Extract JSON content
        cat "$DEPLOY_DIR/package.json" | \
        sed '/"scripts":/,/}/{ /"test":/a\    "start": "node server.js", }' > "$DEPLOY_DIR/package.json.new"
        mv "$DEPLOY_DIR/package.json.new" "$DEPLOY_DIR/package.json"
    else
        # Create a new package.json
        cat << EOF > "$DEPLOY_DIR/package.json"
{
  "name": "visitor-sign-in-app",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "body-parser": "^1.19.0",
    "cors": "^2.8.5",
    "express": "^4.17.1",
    "nodemailer": "^6.7.0",
    "pg": "^8.7.1"
  }
}
EOF
    fi
fi

# Create deployment zip
echo "Creating deployment zip file..."
cd "$DEPLOY_DIR"
zip -r "../deploy.zip" .

# Upload to S3
echo -e "${YELLOW}Uploading deployment package to S3...${NC}"
aws s3 cp "$DEPLOY_DIR/../deploy.zip" "s3://${S3_BUCKET}/deploy.zip"

# Create application version
echo -e "${YELLOW}Creating application version...${NC}"
aws elasticbeanstalk create-application-version \
  --application-name "$APP_NAME" \
  --version-label "v1-$(date +%Y%m%d%H%M%S)" \
  --source-bundle S3Bucket="$S3_BUCKET",S3Key="deploy.zip"

# Update environment with the new version
echo -e "${YELLOW}Deploying application version to Elastic Beanstalk environment...${NC}"
aws elasticbeanstalk update-environment \
  --environment-name "$ENV_NAME" \
  --version-label "v1-$(date +%Y%m%d%H%M%S)"

echo -e "${GREEN}Deployment initiated. Check the AWS Elastic Beanstalk console for deployment status.${NC}"
echo "Application should be available soon at: $APP_URL"

# Clean up temporary directories
echo -e "${YELLOW}Cleaning up temporary files...${NC}"
rm -rf "$TEMP_DIR"
rm -rf "$DEPLOY_DIR"

echo -e "${GREEN}Deployment completed!${NC}"
echo "Note: It may take a few minutes for the application to be fully available."
echo "      You can monitor the deployment status in the AWS Console."