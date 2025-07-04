# CI/CD Pipeline Setup Guide

This guide explains how to set up a complete CI/CD pipeline for the SoulSpace journaling app using GitHub Actions and Docker.

## Overview

The CI/CD pipeline consists of two main workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`): Runs on every push and pull request
2. **Deploy Workflow** (`.github/workflows/deploy.yml`): Runs on pushes to main branch

## Prerequisites

### 1. GitHub Repository Secrets

You need to set up the following secrets in your GitHub repository:

Go to your repository → Settings → Secrets and variables → Actions, then add:

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token
- `EC2_HOST`: Your EC2 instance public IP or domain
- `EC2_USERNAME`: SSH username (usually `ubuntu`)
- `EC2_SSH_KEY`: Your private SSH key for EC2 access
- `EC2_PORT`: SSH port (usually `22`)

### 2. Docker Hub Setup

1. Create a Docker Hub account if you don't have one
2. Create a repository named `whispr`
3. Generate an access token for CI/CD

### 3. EC2 Instance Setup

Your EC2 instance should have:

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /home/ubuntu/soulspace
cd /home/ubuntu/soulspace

# Create .env file with your environment variables
touch .env
```

### 4. Environment Variables

Create a `.env` file on your EC2 instance with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

## Workflow Details

### CI Workflow (ci.yml)

This workflow runs on every push and pull request:

1. **Test Job**: Runs linting, type checking, and builds the application
2. **Security Job**: Runs npm audit for security vulnerabilities
3. **Docker Build Test**: Builds Docker image and tests it locally
4. **Dependency Review**: Reviews dependencies for security issues (PR only)

### Deploy Workflow (deploy.yml)

This workflow runs only on pushes to the main branch:

1. **Build and Push**: Builds Docker image and pushes to Docker Hub
2. **Deploy to EC2**: SSH into EC2 and deploys the new image

## Files Created

### 1. GitHub Actions Workflows

- `.github/workflows/ci.yml`: Continuous Integration workflow
- `.github/workflows/deploy.yml`: Deployment workflow

### 2. Docker Files

- `Dockerfile`: Multi-stage Docker build (already exists)
- `docker-compose.prod.yml`: Production Docker Compose configuration
- `.dockerignore`: Excludes unnecessary files from Docker build

### 3. Deployment Scripts

- `scripts/deploy-ec2.sh`: EC2 deployment script

### 4. Package.json Updates

Added new scripts:
- `type-check`: Runs TypeScript type checking
- `test`: Placeholder for tests
- `test:coverage`: Placeholder for test coverage

## How It Works

1. **Push to main branch**:
   - CI workflow runs first (linting, type checking, security audit)
   - If CI passes, deploy workflow runs
   - Docker image is built and pushed to Docker Hub
   - EC2 instance pulls the new image and restarts the container

2. **Pull Request**:
   - Only CI workflow runs
   - No deployment occurs
   - Ensures code quality before merging

## Monitoring and Troubleshooting

### Check Workflow Status

1. Go to your GitHub repository
2. Click on "Actions" tab
3. View workflow runs and their status

### Check EC2 Deployment

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Check container status
docker ps

# Check container logs
docker logs soulspace-app

# Check health endpoint
curl http://localhost:3000/api/health
```

### Common Issues

1. **Docker Hub Authentication**: Ensure your Docker Hub credentials are correct
2. **EC2 SSH Access**: Verify your SSH key and EC2 security group settings
3. **Environment Variables**: Make sure your `.env` file on EC2 has all required variables
4. **Port Access**: Ensure port 3000 is open in your EC2 security group

## Security Considerations

1. **Secrets Management**: Never commit secrets to your repository
2. **Docker Images**: Use specific image tags, not just `latest`
3. **SSH Keys**: Use dedicated SSH keys for CI/CD, not your personal keys
4. **Environment Variables**: Keep sensitive data in GitHub secrets and EC2 `.env` files

## Customization

### Adding Tests

When you add tests to your project:

1. Update the `test` script in `package.json`
2. Add test coverage reporting
3. Update the CI workflow to run actual tests

### Adding More Environments

To deploy to staging or other environments:

1. Create new workflow files for each environment
2. Use different Docker image tags
3. Set up separate EC2 instances or use different deployment strategies

### Performance Optimization

1. **Docker Layer Caching**: The workflow uses GitHub Actions cache for faster builds
2. **Multi-stage Builds**: The Dockerfile already uses multi-stage builds for smaller images
3. **Parallel Jobs**: CI jobs run in parallel where possible

## Next Steps

1. Set up the GitHub secrets
2. Configure your EC2 instance
3. Push to main branch to trigger the first deployment
4. Monitor the workflows and adjust as needed
5. Add tests to improve code quality
6. Set up monitoring and alerting for your application 