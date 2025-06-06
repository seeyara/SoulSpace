#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
    exit 1
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
fi

# Check if docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker first."
fi

print_status "Docker environment check passed"

# Build the Docker image
print_status "Building Docker image..."
if ! docker build -t soulspace-prod .; then
    print_error "Docker build failed"
fi

print_status "Docker image built successfully"

# Optional: Run basic tests in the container
print_status "Running basic build check..."
if ! docker run --rm soulspace-prod npm run build; then
    print_error "Build check failed"
fi

print_status "Build check passed"

# Print success message
echo -e "\n${GREEN}=== Deployment Ready ===${NC}"
echo "You can now push the image to your container registry"
echo "Run: docker tag soulspace-prod <your-registry>/soulspace-prod"
echo "Then: docker push <your-registry>/soulspace-prod" 