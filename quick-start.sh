#!/bin/bash

# Quick Start Script for Email Forwarding Service
# This script helps you get the service running quickly

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Email Forwarding Service - Quick Start${NC}"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js >= 18${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version is $node_version. Please upgrade to Node.js >= 18${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Check if .env exists, if not copy from .env.example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${YELLOW}📝 Creating default .env file...${NC}"
        cat > .env << EOF
# Environment Configuration
NODE_ENV=development
PORT=3333

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Puppeteer Configuration
PUPPETEER_TIMEOUT=30000
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# CORS Configuration
CORS_ORIGIN=*

# Metrics Configuration
ENABLE_METRICS=true
METRICS_PORT=9090

# Server Configuration
REQUEST_TIMEOUT=30000
BODY_LIMIT=10mb
HEALTH_CHECK_TIMEOUT=5000
EOF
        echo -e "${GREEN}✅ Default .env file created${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Check if TypeScript is compiled
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
    npm run build
    echo -e "${GREEN}✅ TypeScript compiled${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Choose how to start the service:${NC}"
echo "1. Development mode (with hot reload) - Recommended for development"
echo "2. Production mode (compiled) - For testing production build"
echo "3. Docker mode - Using Docker Compose"
echo "4. Just show me the commands"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "${YELLOW}🚀 Starting in development mode...${NC}"
        echo -e "${BLUE}Service will be available at: http://localhost:3333${NC}"
        echo -e "${BLUE}Press Ctrl+C to stop${NC}"
        echo ""
        npm run dev:watch
        ;;
    2)
        echo -e "${YELLOW}🚀 Starting in production mode...${NC}"
        npm run build
        echo -e "${BLUE}Service will be available at: http://localhost:3333${NC}"
        echo -e "${BLUE}Press Ctrl+C to stop${NC}"
        echo ""
        npm start
        ;;
    3)
        if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
            echo -e "${YELLOW}🐳 Starting with Docker Compose...${NC}"
            echo -e "${BLUE}Service will be available at: http://localhost:3333${NC}"
            echo -e "${BLUE}Grafana will be available at: http://localhost:3000${NC}"
            echo -e "${BLUE}Press Ctrl+C to stop${NC}"
            echo ""
            docker-compose up --build
        else
            echo -e "${RED}❌ Docker or Docker Compose not found${NC}"
            echo "Please install Docker and Docker Compose first"
            exit 1
        fi
        ;;
    4)
        echo -e "${BLUE}📋 Available Commands:${NC}"
        echo ""
        echo -e "${YELLOW}Development:${NC}"
        echo "  npm run dev          # Start with ts-node"
        echo "  npm run dev:watch    # Start with hot reload (nodemon)"
        echo ""
        echo -e "${YELLOW}Production:${NC}"
        echo "  npm run build        # Compile TypeScript"
        echo "  npm start            # Start compiled version"
        echo ""
        echo -e "${YELLOW}Docker:${NC}"
        echo "  npm run docker:build # Build Docker image"
        echo "  npm run docker:run   # Run Docker container"
        echo "  npm run compose:up   # Start with Docker Compose"
        echo "  npm run compose:down # Stop Docker Compose"
        echo ""
        echo -e "${YELLOW}Testing:${NC}"
        echo "  npm test             # Run tests"
        echo "  npm run test:watch   # Run tests in watch mode"
        echo "  npm run test:coverage # Run tests with coverage"
        echo "  ./test-api.sh        # Test API endpoints"
        echo ""
        echo -e "${YELLOW}Linting & Formatting:${NC}"
        echo "  npm run lint         # Check code style"
        echo "  npm run lint:fix     # Fix code style issues"
        echo "  npm run format       # Format code with Prettier"
        echo ""
        echo -e "${BLUE}🌐 Service URLs (when running):${NC}"
        echo "  Main API: http://localhost:3333"
        echo "  Health: http://localhost:3333/health"
        echo "  Metrics: http://localhost:3333/metrics"
        echo "  API Docs: http://localhost:3333/api-docs"
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac
