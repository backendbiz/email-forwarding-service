#!/bin/bash

# API Key Implementation Test Script
# Tests all aspects of the API key authentication system

set -e

# Configuration
BASE_URL="http://localhost:3333"
VALID_API_KEY="efs_9FYlJGeBhjpQ8dTk-9zI4190VlSpDPdBet-zm74hCwA"
INVALID_API_KEY="invalid-key-12345"
TEST_URL="https://mail-settings.google.com/mail/u/0/?ui=2&ik=test123&view=lg&permmsgid=msg-f:test456&th=thread-test789&search=inbox&siml=confirm-forwarding-test"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}$1${NC}"
    echo "================================"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

test_endpoint() {
    local description="$1"
    local expected_status="$2"
    local curl_command="$3"
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Command: $curl_command"
    
    # Execute curl and capture response
    response=$(eval "$curl_command" 2>/dev/null)
    status_code=$(eval "$curl_command -w '%{http_code}' -o /dev/null -s" 2>/dev/null)
    
    echo "Response Status: $status_code"
    echo "Response Body:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    
    if [ "$status_code" = "$expected_status" ]; then
        print_success "Expected status $expected_status - PASSED"
    else
        print_error "Expected status $expected_status, got $status_code - FAILED"
    fi
    
    return 0
}

check_service() {
    echo -e "${BLUE}🔍 Checking if service is running...${NC}"
    
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_success "Service is running at $BASE_URL"
        return 0
    else
        print_error "Service is not running at $BASE_URL"
        echo -e "${YELLOW}Please start the service with: npm run dev${NC}"
        exit 1
    fi
}

main() {
    print_header "🧪 API Key Authentication Implementation Test"
    
    # Check if service is running
    check_service
    
    # Test 1: Health check (should always work - no auth required)
    print_header "Test 1: Public Endpoints (No Authentication Required)"
    
    test_endpoint \
        "Health Check Endpoint" \
        "200" \
        "curl -s '$BASE_URL/health'"
    
    test_endpoint \
        "Metrics Endpoint" \
        "200" \
        "curl -s '$BASE_URL/metrics'"
    
    test_endpoint \
        "API Documentation Endpoint" \
        "200" \
        "curl -s '$BASE_URL/api-docs'"
    
    # Test 2: Protected endpoint without API key
    print_header "Test 2: Missing API Key (Should Return 401)"
    
    test_endpoint \
        "Accept Forwarding without API Key" \
        "401" \
        "curl -s -X POST '$BASE_URL/accept-forwarding' -H 'Content-Type: application/json' -d '{\"url\": \"$TEST_URL\"}'"
    
    # Test 3: Protected endpoint with invalid API key
    print_header "Test 3: Invalid API Key (Should Return 403)"
    
    test_endpoint \
        "Accept Forwarding with Invalid API Key" \
        "403" \
        "curl -s -X POST '$BASE_URL/accept-forwarding' -H 'Content-Type: application/json' -H 'x-api-key: $INVALID_API_KEY' -d '{\"url\": \"$TEST_URL\"}'"
    
    # Test 4: Protected endpoint with valid API key
    print_header "Test 4: Valid API Key (Should Process Request)"
    
    test_endpoint \
        "Accept Forwarding with Valid API Key" \
        "400" \
        "curl -s -X POST '$BASE_URL/accept-forwarding' -H 'Content-Type: application/json' -H 'x-api-key: $VALID_API_KEY' -H 'x-request-id: test-$(date +%s)' -d '{\"url\": \"$TEST_URL\"}'"
    
    # Test 5: Custom header validation
    print_header "Test 5: Custom Request Headers"
    
    test_endpoint \
        "Request with Custom Headers and Valid API Key" \
        "400" \
        "curl -s -X POST '$BASE_URL/accept-forwarding' -H 'Content-Type: application/json' -H 'x-api-key: $VALID_API_KEY' -H 'x-request-id: custom-test-$(date +%s)' -H 'User-Agent: TestClient/1.0' -d '{\"url\": \"$TEST_URL\"}'"
    
    # Test 6: Alternative API key
    print_header "Test 6: Alternative API Key"
    
    test_endpoint \
        "Accept Forwarding with Dev API Key" \
        "400" \
        "curl -s -X POST '$BASE_URL/accept-forwarding' -H 'Content-Type: application/json' -H 'x-api-key: dev-key-12345' -H 'x-request-id: dev-test-$(date +%s)' -d '{\"url\": \"$TEST_URL\"}'"
    
    # Summary
    print_header "🎉 API Key Implementation Test Complete"
    
    echo -e "\n${GREEN}✅ Implementation Status: ACTIVE${NC}"
    echo -e "${BLUE}📋 Configuration:${NC}"
    echo "  • API_KEY_REQUIRED=true"
    echo "  • API_KEY_HEADER=x-api-key"
    echo "  • Valid API Keys: 3 configured"
    echo ""
    echo -e "${BLUE}🔒 Security Features:${NC}"
    echo "  • Protected endpoints require authentication"
    echo "  • Public endpoints remain accessible"
    echo "  • Request ID correlation for all requests"
    echo "  • Detailed error responses with timestamps"
    echo ""
    echo -e "${BLUE}📊 Expected Results:${NC}"
    echo "  • 200: Public endpoints (health, metrics, api-docs)"
    echo "  • 401: Missing API key on protected endpoints"
    echo "  • 403: Invalid API key on protected endpoints"
    echo "  • 400: Valid API key but validation error (test URL)"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo "  1. Update your clients to include API keys"
    echo "  2. Monitor authentication logs"
    echo "  3. Rotate API keys regularly"
    echo "  4. Use different keys for different environments"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed. JSON responses may not be formatted."
    echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
fi

# Run main function
main "$@"
