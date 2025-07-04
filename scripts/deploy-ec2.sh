#!/bin/bash

# Deploy script for SoulSpace on EC2
set -e

# Configuration
IMAGE_NAME="seeyara96/soulspace:latest"
CONTAINER_NAME="soulspace-app"
ENV_FILE="/home/ubuntu/soulspace/.env"

echo "🚀 Starting deployment of SoulSpace..."

# Pull the latest image
echo "📥 Pulling latest Docker image..."
docker pull $IMAGE_NAME

# Stop and remove existing container
echo "🛑 Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Clean up old images to save space
echo "🧹 Cleaning up old images..."
docker image prune -f

# Run the new container
echo "🏃 Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file $ENV_FILE \
  --health-cmd="curl -f http://localhost:3000/api/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  --memory=1g \
  --memory-reservation=512m \
  $IMAGE_NAME

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
  if docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null | grep -q "healthy"; then
    echo "✅ Container is healthy!"
    break
  fi
  echo "⏳ Waiting for health check... ($counter/$timeout)"
  sleep 5
  counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
  echo "❌ Container failed to become healthy within $timeout seconds"
  docker logs $CONTAINER_NAME
  exit 1
fi

# Verify the container is running
echo "🔍 Verifying deployment..."
docker ps | grep $CONTAINER_NAME

# Health check
echo "🏥 Performing health check..."
sleep 10
if curl -f http://localhost:3000/api/health; then
  echo "✅ Deployment successful! Application is running on port 3000"
else
  echo "❌ Health check failed"
  docker logs $CONTAINER_NAME
  exit 1
fi

echo "🎉 Deployment completed successfully!" 