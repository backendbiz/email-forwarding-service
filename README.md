# Email Forwarding Service

A production-grade TypeScript service that automatically accepts Gmail forwarding confirmation requests using Puppeteer. Built with enterprise-level security, monitoring, and reliability features.

## 🚀 Features

### Core Functionality
- **Automated Gmail Forwarding**: Automatically accepts Gmail forwarding confirmation requests
- **Intelligent Error Handling**: Comprehensive error detection and recovery mechanisms
- **URL Extraction**: Robust parsing of confirmation URLs from email bodies
- **Multiple Selector Support**: Fallback mechanisms for different Gmail UI variations

### Production Features
- **🔒 Security**: Helmet security headers, rate limiting, input validation, CORS protection
- **📊 Monitoring**: Prometheus metrics, structured logging, health checks with system metrics
- **🛡️ Reliability**: Graceful shutdown, request timeouts, circuit breakers
- **🔍 Observability**: Request tracing, performance metrics, error tracking
- **📈 Scalability**: Horizontal scaling support, resource optimization
- **🧪 Testing**: Comprehensive test suite with 80%+ coverage
- **🏗️ CI/CD**: Automated testing, security scanning, multi-stage deployments

## 📁 Project Structure

```
.
├── src/
│   ├── config/              # Environment configuration
│   ├── middleware/          # Express middleware (security, logging, etc.)
│   ├── utils/              # Utilities (logger, metrics)
│   ├── validation/         # Request validation schemas
│   ├── emailService.ts     # Core email forwarding logic
│   └── index.ts           # Express server setup
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── setup.ts          # Test configuration
├── k8s/                   # Kubernetes deployment manifests
├── monitoring/            # Prometheus & Grafana configuration
├── .github/workflows/     # CI/CD pipelines
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Development & production compose
└── README.md            # This file
```

## 🚀 Quick Start

### API Key Authentication (Optional)
This service supports token-based authentication using API keys:

```bash
# Generate secure API keys
node scripts/generate-api-key.js 3

# Enable authentication in .env
API_KEY_REQUIRED=true
API_KEYS=efs_your-generated-key-1,efs_your-generated-key-2
API_KEY_HEADER=x-api-key
```

**Usage with API Keys:**
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_your-generated-key-1" \
  -d '{"url": "https://mail-settings.google.com/..."}'
```

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd email-forwarding-service

# Copy environment variables
cp .env.example .env

# Start the service
docker-compose up --build

# With monitoring stack (Prometheus + Grafana)
docker-compose --profile monitoring up --build

# With caching (Redis)
docker-compose --profile cache up --build
```

The service will be available at:
- **API**: http://localhost:3000
- **Health**: http://localhost:3000/health
- **Metrics**: http://localhost:3000/metrics
- **API Docs**: http://localhost:3000/api-docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run in development mode with hot reload
npm run dev:watch

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint:fix
npm run format
```

## 📚 API Documentation

### Health Check
```http
GET /health?detailed=true
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "email-forwarding-service",
  "version": "1.0.0",
  "environment": "production",
  "system": {
    "uptime": 3600,
    "memory": { "used": 45, "total": 128 },
    "nodeVersion": "v18.17.0"
  }
}
```

### Accept Email Forwarding
```http
POST /accept-forwarding
Content-Type: application/json
```

**Request Body:**
```json
{
  "data": {
    "object": {
      "snippet": "test@example.com has requested to automatically forward mail to your email address",
      "body": "Please confirm by clicking: https://mail-settings.google.com/mail/confirm?token=abc123"
    }
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email forwarding confirmed successfully",
  "email": "test@example.com",
  "url": "https://mail-settings.google.com/mail/confirm?token=abc123",
  "responseTime": 2340,
  "alreadyConfirmed": false,
  "requestId": "req_123456789",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid forwarding request format",
  "email": "test@example.com",
  "responseTime": 150,
  "requestId": "req_123456789",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Metrics Endpoint
```http
GET /metrics
```
Returns Prometheus-formatted metrics for monitoring.

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (development/production/test) |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (error/warn/info/debug) |
| `LOG_FORMAT` | `json` | Log format (json/simple) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `PUPPETEER_TIMEOUT` | `30000` | Puppeteer operation timeout |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium-browser` | Chromium path |
| `CORS_ORIGIN` | `*` | CORS allowed origins |
| `ENABLE_METRICS` | `true` | Enable Prometheus metrics |
| `REQUEST_TIMEOUT` | `30000` | HTTP request timeout |
| `BODY_LIMIT` | `10mb` | Request body size limit |

### Security Configuration

- **Rate Limiting**: 100 requests per 15-minute window
- **Request Size**: 10MB maximum body size
- **Timeouts**: 30-second request timeout
- **CORS**: Configurable origin restrictions
- **Headers**: Comprehensive security headers via Helmet
- **Validation**: Joi schema validation for all inputs

## 🐳 Docker & Deployment

### Multi-stage Docker Build
```bash
# Build production image
docker build -t email-forwarding-service .

# Run with custom environment
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  email-forwarding-service
```

### Kubernetes Deployment
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yml

# Check deployment status
kubectl get pods -l app=email-forwarding-service

# View logs
kubectl logs -f deployment/email-forwarding-service
```

### Production Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Monitoring stack deployed
- [ ] Log aggregation configured
- [ ] Backup strategy implemented
- [ ] Security scanning completed
- [ ] Performance testing done
- [ ] Disaster recovery plan ready

## 📊 Monitoring & Observability

### Metrics Available
- HTTP request metrics (count, duration, status codes)
- Email forwarding metrics (success/failure rates, response times)
- System metrics (memory, CPU, uptime)
- Puppeteer metrics (active browsers, operation duration)
- Custom business metrics

### Logging
- Structured JSON logging in production
- Request/response logging with correlation IDs
- Error tracking with stack traces
- Performance metrics logging
- Security event logging

### Health Checks
- Basic health endpoint (`/health`)
- Detailed system information (`/health?detailed=true`)
- Docker health checks
- Kubernetes liveness/readiness probes

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- emailService.test.ts

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- **Target**: 80%+ coverage across all metrics
- **Unit Tests**: Core business logic
- **Integration Tests**: API endpoints and middleware
- **Security Tests**: Input validation and error handling

### Test Structure
```
tests/
├── unit/
│   ├── emailService.test.ts    # Core service tests
│   └── utils/                  # Utility function tests
├── integration/
│   └── api.test.ts            # API endpoint tests
└── setup.ts                   # Test configuration
```

## 🔧 Development

### Code Quality Tools
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks
- **Jest**: Testing framework
- **TypeScript**: Type checking

### Development Workflow
```bash
# Start development server
npm run dev:watch

# Run linting
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npx tsc --noEmit

# Build for production
npm run build
```

### Git Hooks
- **Pre-commit**: Lint and format staged files
- **Pre-push**: Run tests and type checking

## 🚨 Troubleshooting

### Common Issues

#### Puppeteer Issues
```bash
# Check Chromium installation
docker exec -it email-forwarding-service chromium-browser --version

# Increase memory limits
docker-compose up --build -d --scale email-forwarding-service=1
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats email-forwarding-service

# Check logs for errors
docker-compose logs -f email-forwarding-service

# View metrics
curl http://localhost:3000/metrics
```

#### Network Issues
```bash
# Test connectivity
curl -f http://localhost:3000/health

# Check Docker network
docker network ls
docker network inspect email-forwarding-service_email-forwarding-network
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# Or with Docker
docker-compose up -e LOG_LEVEL=debug
```

### Monitoring Alerts
Common alerts to set up:
- High error rate (>5% in 5 minutes)
- High response time (>5s average)
- Memory usage >80%
- CPU usage >80%
- Service unavailable

## 🔐 Security

### Security Features
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Express rate limit middleware
- **Security Headers**: Helmet.js protection
- **CORS**: Configurable cross-origin policies
- **Container Security**: Non-root user, read-only filesystem
- **Dependency Scanning**: Automated vulnerability checks

### Security Best Practices
- Regular dependency updates
- Container image scanning
- Secrets management
- Network segmentation
- Access logging
- Security monitoring

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README and inline code comments
- **Monitoring**: Grafana dashboards and Prometheus alerts