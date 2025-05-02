#!/bin/bash

# Simple wrapper for setup-codepipeline.sh with AWS SSO support

# First, handle AWS SSO login
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up AWS SSO authentication...${NC}"
source "$SCRIPT_DIR/aws-sso-login.sh"

if [ $? -ne 0 ]; then
    echo -e "${RED}AWS SSO login failed. Cannot continue.${NC}"
    exit 1
fi

# Check for required AWS permissions
echo -e "${YELLOW}Checking AWS permissions...${NC}"
"$SCRIPT_DIR/check-aws-permissions.sh"

if [ $? -ne 0 ]; then
    echo -e "${RED}Permission check failed. See deploy/TROUBLESHOOTING.md for solutions.${NC}"
    exit 1
fi

# Now run the actual setup script
echo -e "${YELLOW}Running CodePipeline setup...${NC}"
"$SCRIPT_DIR/setup-codepipeline.sh"