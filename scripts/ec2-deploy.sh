#!/bin/bash

# Configuration
EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST}"
PEM_PATH="${PEM_PATH}"
REMOTE_DIR="/home/${EC2_USER}/soulspace"

# Check required variables
if [ -z "$EC2_HOST" ] || [ -z "$PEM_PATH" ]; then
    echo "Error: Please set EC2_HOST and PEM_PATH environment variables"
    echo "Example: EC2_HOST=user@ec2-xx-xx-xx-xx.compute-1.amazonaws.com PEM_PATH=/path/to/key.pem ./scripts/ec2-deploy.sh"
    exit 1
fi

# Create deployment package
echo "Creating deployment package..."
tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf deploy.tar.gz .

# Ensure remote directory exists
echo "Setting up remote directory..."
ssh -i "$PEM_PATH" "$EC2_HOST" "mkdir -p $REMOTE_DIR"

# Copy files to server
echo "Copying files to server..."
scp -i "$PEM_PATH" deploy.tar.gz "$EC2_HOST:$REMOTE_DIR/"

# Deploy on server
echo "Deploying on server..."
ssh -i "$PEM_PATH" "$EC2_HOST" "cd $REMOTE_DIR && \
    tar xzf deploy.tar.gz && \
    rm deploy.tar.gz && \
    docker build -t soulspace . && \
    docker stop soulspace || true && \
    docker rm soulspace || true && \
    docker run -d \
        --name soulspace \
        -p 3000:3000 \
        -e NEXT_PUBLIC_SUPABASE_URL='${NEXT_PUBLIC_SUPABASE_URL}' \
        -e NEXT_PUBLIC_SUPABASE_ANON_KEY='${NEXT_PUBLIC_SUPABASE_ANON_KEY}' \
        --restart unless-stopped \
        soulspace"

# Cleanup local files
echo "Cleaning up..."
rm deploy.tar.gz

echo "Deployment completed! Your app should be running at http://$EC2_HOST:3000" 