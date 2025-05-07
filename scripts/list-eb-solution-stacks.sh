#!/bin/bash
# Script to list all available Elastic Beanstalk solution stacks

# Exit on error
set -e

# Specify the region
REGION="us-east-1"

echo "Listing all available Elastic Beanstalk solution stacks in region: $REGION"
echo "This will help identify the exact solution stack name to use in templates."
echo ""

# List all solution stacks
aws elasticbeanstalk list-available-solution-stacks --region $REGION --query "SolutionStacks" --output text

echo ""
echo "To filter for Node.js stacks only, run:"
echo "aws elasticbeanstalk list-available-solution-stacks --region $REGION --query \"SolutionStacks[?contains(@, 'Node.js')]\" --output text"