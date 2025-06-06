#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with the following variables:"
    echo "NEXT_PUBLIC_SUPABASE_URL="
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY="
    echo "OPENAI_API_KEY="
    exit 1
fi

# Build the Docker images
echo "🏗️  Building Docker images..."
docker-compose build

# Stop any running containers
echo "🛑 Stopping running containers..."
docker-compose down

# Start the containers
echo "🚀 Starting containers..."
docker-compose up -d

# Check container health
echo "🏥 Checking container health..."
sleep 10
if [ "$(docker-compose ps -q | wc -l)" -eq "1" ]; then
    echo "✅ Container is running!"
    echo "🌐 Application is now available at http://localhost:3000"
else
    echo "❌ Container failed to start. Checking logs..."
    docker-compose logs
    exit 1
fi

echo "✨ Deployment complete!" 