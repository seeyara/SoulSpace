#!/bin/bash

# AWS Region and account details
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_NAME="soulspace"
IMAGE_TAG="${TAG:-latest}"

# Create ECR repository if it doesn't exist
echo "Checking ECR repository..."
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPO_NAME}

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build the image
echo "Building Docker image..."
docker build \
    -t ${ECR_REPO_NAME}:${IMAGE_TAG} .

# Tag the image for ECR
echo "Tagging image for ECR..."
docker tag ${ECR_REPO_NAME}:${IMAGE_TAG} ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}

# Push to ECR
echo "Pushing image to ECR..."
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}

# Create App Runner service if it doesn't exist
SERVICE_NAME="soulspace-service"
ECR_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "Checking if App Runner service exists..."
if ! aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}']" --output text | grep -q "${SERVICE_NAME}"; then
    echo "Creating new App Runner service..."
    aws apprunner create-service \
        --service-name ${SERVICE_NAME} \
        --source-configuration "{
            \"AuthenticationConfiguration\": {
                \"AccessRoleArn\": \"${AWS_APP_RUNNER_ROLE_ARN}\"
            },
            \"AutoDeploymentsEnabled\": true,
            \"ImageRepository\": {
                \"ImageIdentifier\": \"${ECR_IMAGE}\",
                \"ImageRepositoryType\": \"ECR\",
                \"ImageConfiguration\": {
                    \"Port\": \"3000\"
                }
            }
        }"
else
    echo "Updating existing App Runner service..."
    SERVICE_ARN=$(aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='${SERVICE_NAME}'].ServiceArn" --output text)
    aws apprunner update-service \
        --service-arn ${SERVICE_ARN} \
        --source-configuration "{
            \"AuthenticationConfiguration\": {
                \"AccessRoleArn\": \"${AWS_APP_RUNNER_ROLE_ARN}\"
            },
            \"AutoDeploymentsEnabled\": true,
            \"ImageRepository\": {
                \"ImageIdentifier\": \"${ECR_IMAGE}\",
                \"ImageRepositoryType\": \"ECR\",
                \"ImageConfiguration\": {
                    \"Port\": \"3000\"
                }
            }
        }"
fi

echo "Deployment process completed. Please check AWS Console for service status." 