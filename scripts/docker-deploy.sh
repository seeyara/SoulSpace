#!/bin/bash

# Default values
REGISTRY="docker.io"
IMAGE_NAME="soulspace"
TAG="${TAG:-latest}"
CONTAINER_NAME="soulspace-prod"
PORT="${PORT:-3000}"

# Pull the latest image
echo "Pulling latest image..."
docker pull ${REGISTRY}/${IMAGE_NAME}:${TAG}

# Stop and remove existing container if it exists
if docker ps -a | grep -q ${CONTAINER_NAME}; then
    echo "Stopping and removing existing container..."
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
fi

# Run the new container
echo "Starting new container..."
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:3000 \
    -e NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    -e NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    --restart unless-stopped \
    ${REGISTRY}/${IMAGE_NAME}:${TAG}

echo "Deployment completed successfully"

# Check if container is running
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo "Container is running on port ${PORT}"
    echo "Health check URL: http://localhost:${PORT}/api/health"
else
    echo "Error: Container failed to start"
    docker logs ${CONTAINER_NAME}
    exit 1
fi 