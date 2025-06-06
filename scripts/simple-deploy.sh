#!/bin/bash

# Configuration
EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST}"
PEM_PATH="${PEM_PATH}"
REMOTE_DIR="/home/${EC2_USER}/soulspace"

# Check required variables
if [ -z "$EC2_HOST" ] || [ -z "$PEM_PATH" ]; then
    echo "Error: Please set EC2_HOST and PEM_PATH environment variables"
    echo "Example: EC2_HOST=user@ec2-xx-xx-xx-xx.compute-1.amazonaws.com PEM_PATH=/path/to/key.pem ./scripts/simple-deploy.sh"
    exit 1
fi

# Ensure remote directory exists
echo "Setting up remote directory..."
ssh -i "$PEM_PATH" "$EC2_HOST" "mkdir -p $REMOTE_DIR"

# Copy all necessary files to server
echo "Copying files to server..."
scp -i "$PEM_PATH" -r \
    src \
    public \
    package.json \
    package-lock.json \
    next.config.js \
    Dockerfile \
    .dockerignore \
    .env.prod \
    tailwind.config.ts \
    tsconfig.json \
    postcss.config.js \
    "$EC2_HOST:$REMOTE_DIR/"

# Build and run on server
echo "Building and running Docker container..."
ssh -i "$PEM_PATH" "$EC2_HOST" "cd $REMOTE_DIR && \
    docker build -t soulspace . && \
    docker stop soulspace || true && \
    docker rm soulspace || true && \
    docker run -d \
        --name soulspace \
        -p 3000:3000 \
        --env-file .env.prod \
        --restart unless-stopped \
        soulspace"

echo "Deployment completed! Your app should be running at http://$EC2_HOST:3000" 