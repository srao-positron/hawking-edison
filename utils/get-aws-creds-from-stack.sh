#!/bin/bash
# Get AWS credentials from the deployed CloudFormation stack

echo "🔍 Retrieving AWS credentials from CloudFormation..."
echo ""

# Get the access key ID from CloudFormation outputs
ACCESS_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name hawking-edison-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`EdgeFunctionAccessKeyId`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$ACCESS_KEY_ID" ]; then
  echo "❌ Could not find EdgeFunctionAccessKeyId in stack outputs"
  echo "   The stack might still be updating or the output might not exist"
  echo ""
  echo "Try looking in:"
  echo "1. AWS Console > CloudFormation > hawking-edison-dev > Outputs"
  echo "2. AWS Console > IAM > Users > Search for 'EdgeFunction'"
  exit 1
fi

# Get the topic ARN
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name hawking-edison-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`OrchestrationTopicArn`].OutputValue' \
  --output text 2>/dev/null)

# Get the secret ARN
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name hawking-edison-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`EdgeFunctionCredsSecretArn`].OutputValue' \
  --output text 2>/dev/null)

echo "✅ Found AWS resources:"
echo "   Access Key ID: ${ACCESS_KEY_ID:0:10}..."
echo "   Topic ARN: $TOPIC_ARN"
echo "   Secret ARN: $SECRET_ARN"
echo ""

# Try to get the secret value
if [ ! -z "$SECRET_ARN" ]; then
  echo "🔐 Retrieving secret from Secrets Manager..."
  SECRET_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_ARN" \
    --region us-east-1 \
    --query 'SecretString' \
    --output text 2>/dev/null)
  
  if [ ! -z "$SECRET_VALUE" ]; then
    # Parse the JSON to get the secret access key
    SECRET_ACCESS_KEY=$(echo "$SECRET_VALUE" | jq -r '.secretAccessKey' 2>/dev/null)
    
    if [ ! -z "$SECRET_ACCESS_KEY" ]; then
      echo "✅ Retrieved secret access key"
      echo ""
      echo "📋 Ready to store in Vault! Run:"
      echo ""
      echo "npx tsx utils/quick-store-aws-creds.ts \\"
      echo "  $ACCESS_KEY_ID \\"
      echo "  $SECRET_ACCESS_KEY \\"
      echo "  us-east-1 \\"
      echo "  $TOPIC_ARN"
    else
      echo "❌ Could not parse secret access key from secret"
    fi
  else
    echo "❌ Could not retrieve secret from Secrets Manager"
    echo "   You may need to check permissions or use the AWS Console"
  fi
else
  echo "❓ Secret ARN not found in outputs"
  echo "   Check AWS Console > Secrets Manager for 'hawking-edison/edge-function-creds'"
fi