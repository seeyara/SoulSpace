#!/bin/bash

# Default Docker registry (can be changed to private registry)
REGISTRY="docker.io"
IMAGE_NAME="soulspace"
TAG="${TAG:-latest}"

# Check if .env.prod exists and source it
if [ -f .env.prod ]; then
    echo "Loading environment variables from .env.prod"
    export $(cat .env.prod | xargs)
fi

# Build the Docker image with environment variables
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://your-project.supabase.co}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-your-anon-key}" \
    -t ${REGISTRY}/${IMAGE_NAME}:${TAG} .

echo "Docker image built successfully"

# Push to registry if PUSH=true
if [ "${PUSH}" = "true" ]; then
    echo "Pushing image to registry..."
    docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}
    echo "Image pushed successfully"
fi 