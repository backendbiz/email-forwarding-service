# Email Forwarding Service - API Setup & Testing Guide

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm or yarn
- Chromium browser (for Puppeteer)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

The service will run on port **3333** by default (as configured in your .env file).

### 3. Start the Service

#### Development Mode (with hot reload)
```bash
npm run dev:watch
```

#### Production Mode
```bash
npm run build
npm start
```

#### Using Docker
```bash
# Build and run with Docker Compose
npm run compose:up

# Or build and run manually
npm run docker:build
npm run docker:run
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:3333
```

---

## 🧪 cURL Examples

### 1. Health Check (Basic)
```bash
curl -X GET http://localhost:3333/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-20T10:30:00.000Z",
  "service": "email-forwarding-service",
  "version": "1.0.0",
  "environment": "development"
}
```

### 2. Health Check (Detailed)
```bash
curl -X GET "http://localhost:3333/health?detailed=true"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-20T10:30:00.000Z",
  "service": "email-forwarding-service",
  "version": "1.0.0",
  "environment": "development",
  "system": {
    "uptime": 123.456,
    "memory": {
      "used": 45,
      "total": 67,
      "external": 12
    },
    "cpu": {
      "user": 123456,
      "system": 78910
    },
    "nodeVersion": "v18.17.0",
    "platform": "darwin"
  }
}
```

### 3. API Documentation
```bash
curl -X GET http://localhost:3333/api-docs
```

### 4. Prometheus Metrics
```bash
curl -X GET http://localhost:3333/metrics
```

### 5. Email Forwarding Request (Main Endpoint)

#### Valid Request
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-request-123" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-123&th=thread-456&search=inbox&siml=confirm-forwarding-789"
  }'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Email forwarding confirmed successfully",
  "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-123&th=thread-456&search=inbox&siml=confirm-forwarding-789",
  "responseTime": 2500,
  "alreadyConfirmed": false,
  "requestId": "test-request-123",
  "timestamp": "2025-09-20T10:30:00.000Z"
}
```

#### Invalid Request (Invalid URL)
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{
    "url": "not-a-valid-url"
  }'
```

**Expected Error Response:**
```json
{
  "error": "Validation error",
  "message": "Request body validation failed",
  "details": [
    {
      "field": "url",
      "message": "URL must be a valid HTTP or HTTPS URL",
      "value": "not-a-valid-url"
    }
  ],
  "requestId": null,
  "timestamp": "2025-09-20T10:30:00.000Z"
}
```

---

## 🧪 Test Scripts

### Create Test Script
Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3333"
REQUEST_ID="test-$(date +%s)"

echo "🧪 Testing Email Forwarding Service API"
echo "========================================"

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s -X GET "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Detailed Health Check  
echo "2. Testing Detailed Health Check..."
curl -s -X GET "$BASE_URL/health?detailed=true" | jq '.'
echo ""

# Test 3: API Documentation
echo "3. Testing API Documentation..."
curl -s -X GET "$BASE_URL/api-docs" | jq '.'
echo ""

# Test 4: Valid Email Forwarding Request
echo "4. Testing Valid Email Forwarding Request..."
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-123&th=thread-456&search=inbox&siml=confirm-forwarding-789"
  }' | jq '.'
echo ""

# Test 5: Invalid Request (validation error)
echo "5. Testing Invalid Request (Validation Error)..."
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "invalid-url"
  }' | jq '.'
echo ""

# Test 6: Rate Limiting (send multiple requests quickly)
echo "6. Testing Rate Limiting..."
for i in {1..5}; do
  echo "Request $i:"
  curl -s -X GET "$BASE_URL/health" -w "Status: %{http_code}\n" -o /dev/null
done
echo ""

echo "✅ API Testing Complete!"
```

Make it executable:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 🐳 Docker Setup

### Using Docker Compose (Recommended)
```bash
# Start all services (app + monitoring)
docker-compose up --build

# Run in background
docker-compose up -d --build

# Stop services
docker-compose down
```

### Manual Docker Commands
```bash
# Build image
docker build -t email-forwarding-service .

# Run container
docker run -p 3333:3333 --env-file .env email-forwarding-service

# Run with custom environment
docker run -p 3333:3333 \
  -e NODE_ENV=production \
  -e PORT=3333 \
  -e LOG_LEVEL=info \
  email-forwarding-service
```

---

## 📊 Monitoring & Metrics

### Prometheus Metrics
Access metrics at: `http://localhost:3333/metrics`

### Grafana Dashboard
If using Docker Compose, Grafana is available at: `http://localhost:3000`

---

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env`:

```bash
# Server
NODE_ENV=development
PORT=3333

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Puppeteer
PUPPETEER_TIMEOUT=30000
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Metrics
ENABLE_METRICS=true
METRICS_PORT=9090
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using port 3333
   lsof -i :3333
   
   # Kill the process or change PORT in .env
   ```

2. **Puppeteer/Chromium issues**
   ```bash
   # Install Chromium (Ubuntu/Debian)
   sudo apt-get install chromium-browser
   
   # Install Chromium (macOS)
   brew install chromium
   
   # Or set different executable path in .env
   PUPPETEER_EXECUTABLE_PATH=/path/to/your/chrome
   ```

3. **Permission denied for test script**
   ```bash
   chmod +x test-api.sh
   ```

### Logs
Check application logs for detailed error information:
```bash
# Development mode logs
npm run dev:watch

# Docker logs
docker-compose logs -f app
```

---

## 📝 Request/Response Examples

### Successful Email Processing
```json
{
  "success": true,
  "message": "Email forwarding confirmed successfully",
  "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-123&th=thread-456&search=inbox&siml=confirm-forwarding-789",
  "responseTime": 2500,
  "alreadyConfirmed": false,
  "requestId": "req-123",
  "timestamp": "2025-09-20T10:30:00.000Z"
}
```

### Already Confirmed
```json
{
  "success": true,
  "message": "Email forwarding already confirmed",
  "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-123&th=thread-456&search=inbox&siml=confirm-forwarding-789",
  "responseTime": 1200,
  "alreadyConfirmed": true,
  "requestId": "req-124",
  "timestamp": "2025-09-20T10:31:00.000Z"
}
```

### Validation Error
```json
{
  "error": "Validation error",
  "message": "Request body validation failed",
  "details": [
    {
      "field": "url",
      "message": "URL is required"
    }
  ],
  "requestId": "req-125",
  "timestamp": "2025-09-20T10:32:00.000Z"
}
```

---

## 🎯 Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Setup
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn
ENABLE_METRICS=true
```

### Health Checks
The service provides health endpoints for load balancers:
- `GET /health` - Basic health check
- `GET /health?detailed=true` - Detailed system info

---

Ready to test your Email Forwarding Service! 🚀
