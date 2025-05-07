#!/bin/bash
# Script to list all available Node.js Elastic Beanstalk solution stacks

# Exit on error
set -e

# Specify the region
REGION="us-east-1"

echo "Listing all available Node.js Elastic Beanstalk solution stacks in region: $REGION"
echo ""

# List only Node.js solution stacks
aws elasticbeanstalk list-available-solution-stacks --region $REGION --query "SolutionStacks[?contains(@, 'Node.js')]" --output text

echo ""
echo "Use one of these exact stack names in your CloudFormation template."