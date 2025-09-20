# cURL Examples for Email Forwarding Service

## Base Configuration
```bash
BASE_URL="http://localhost:3333"
REQUEST_ID="req-$(date +%s)"
```

## 1. Health Check Endpoints

### Basic Health Check
```bash
curl -X GET http://localhost:3333/health
```

### Detailed Health Check
```bash
curl -X GET "http://localhost:3333/health?detailed=true"
```

### Health Check with Custom Headers
```bash
curl -X GET http://localhost:3333/health \
  -H "User-Agent: HealthChecker/1.0" \
  -H "x-request-id: health-check-123"
```

## 2. API Documentation
```bash
curl -X GET http://localhost:3333/api-docs \
  -H "Accept: application/json"
```

## 3. Prometheus Metrics
```bash
curl -X GET http://localhost:3333/metrics \
  -H "Accept: text/plain"
```

## 4. Email Forwarding Requests

### Valid Request - Gmail Forwarding Confirmation
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: forwarding-$(date +%s)" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123def456&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
  }'
```

### Valid Request - Alternative Format
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: alt-forwarding-$(date +%s)" \
  -H "User-Agent: EmailProcessor/2.0" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=xyz789abc123&view=lg&permmsgid=msg-f:9876543210&th=thread-def456&search=inbox&siml=confirm-forwarding-abc123"
  }'
```

### Request with Verbose Output
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: verbose-test-$(date +%s)" \
  -v \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=service123&view=lg&permmsgid=msg-f:1357924680&th=thread-service456&search=inbox&siml=confirm-forwarding-service789"
  }'
```

## 5. Error Testing

### Validation Error - Invalid URL
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{
    "url": "not-a-valid-url"
  }'
```

### Validation Error - Missing URL
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{
    "invalid": "field"
  }'
```

### Validation Error - Non-Gmail URL
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/not-gmail"
  }'
```

### Validation Error - Empty Request
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Invalid Content Type
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: text/plain" \
  -d "This is not JSON"
```

## 6. Rate Limiting Tests

### Single Request with Timing
```bash
curl -X GET http://localhost:3333/health \
  -w "Time: %{time_total}s, Status: %{http_code}\n" \
  -o /dev/null \
  -s
```

### Multiple Requests to Test Rate Limiting
```bash
for i in {1..10}; do
  echo "Request $i:"
  curl -X GET http://localhost:3333/health \
    -w "Status: %{http_code}, Time: %{time_total}s\n" \
    -o /dev/null \
    -s
  sleep 0.1
done
```

### Burst Test (Fast Requests)
```bash
for i in {1..20}; do
  curl -X GET http://localhost:3333/health \
    -w "$i: %{http_code} " \
    -o /dev/null \
    -s &
done
wait
echo ""
```

## 7. Error Endpoint Tests

### 404 Not Found
```bash
curl -X GET http://localhost:3333/nonexistent-endpoint \
  -H "Accept: application/json"
```

### Method Not Allowed
```bash
curl -X PUT http://localhost:3333/health \
  -H "Accept: application/json"
```

### Large Payload Test (should be rejected)
```bash
# Create a very long URL (over reasonable limits)
long_url="https://mail-settings.google.com/mail/u/0/?ui=2&ik=$(printf 'A%.0s' {1..5000})&view=lg"
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$long_url\"
  }"
```

## 8. Advanced Testing

### Test with Custom User Agent
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "User-Agent: EmailBot/1.0 (Testing)" \
  -H "x-request-id: custom-agent-test" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=test123&view=lg&permmsgid=msg-f:test456&th=thread-test789&search=inbox&siml=confirm-forwarding-test"
  }'
```

### Test with Additional Headers
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: headers-test-$(date +%s)" \
  -H "x-forwarded-for: 192.168.1.100" \
  -H "x-real-ip: 203.0.113.1" \
  -H "Authorization: Bearer fake-token-for-testing" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=headers123&view=lg&permmsgid=msg-f:headers456&th=thread-headers789&search=inbox&siml=confirm-forwarding-headers"
  }'
```

### Concurrent Requests Test
```bash
# Test concurrent processing
for i in {1..5}; do
  (
    curl -X POST http://localhost:3333/accept-forwarding \
      -H "Content-Type: application/json" \
      -H "x-request-id: concurrent-$i-$(date +%s)" \
      -d "{
        \"url\": \"https://mail-settings.google.com/mail/u/0/?ui=2&ik=concurrent$i&view=lg&permmsgid=msg-f:concurrent$i&th=thread-concurrent$i&search=inbox&siml=confirm-forwarding-concurrent$i\"
      }" \
      -w "Request $i: %{http_code} in %{time_total}s\n" \
      -o /dev/null \
      -s
  ) &
done
wait
```

## 9. Monitoring and Debugging

### Check Response Headers
```bash
curl -X GET http://localhost:3333/health \
  -I
```

### Full Response with Headers
```bash
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-request-id: debug-test" \
  -i \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=debug123&view=lg&permmsgid=msg-f:debug456&th=thread-debug789&search=inbox&siml=confirm-forwarding-debug"
  }'
```

### Trace Request
```bash
curl -X GET http://localhost:3333/health \
  --trace-ascii trace.log \
  -o response.json
cat trace.log
cat response.json
rm trace.log response.json
```

## 10. Performance Testing

### Simple Load Test
```bash
echo "Running simple load test..."
start_time=$(date +%s)
for i in {1..50}; do
  curl -X GET http://localhost:3333/health \
    -o /dev/null \
    -s \
    -w "%{http_code} " &
  if (( i % 10 == 0 )); then
    wait
    echo ""
    echo "Completed $i requests..."
  fi
done
wait
end_time=$(date +%s)
echo ""
echo "Load test completed in $((end_time - start_time)) seconds"
```

### Response Time Test
```bash
echo "Testing response times..."
for i in {1..10}; do
  time=$(curl -X GET http://localhost:3333/health \
    -o /dev/null \
    -s \
    -w "%{time_total}")
  echo "Request $i: ${time}s"
done
```

---

## Quick Test Script

Save this as `quick-test.sh`:

```bash
#!/bin/bash
BASE_URL="http://localhost:3333"

echo "🧪 Quick API Test"
echo "================"

# Health check
echo "1. Health Check:"
curl -s "$BASE_URL/health" | jq '.status' || echo "Failed"

# Valid request
echo "2. Valid Email Request:"
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=test&view=lg&permmsgid=msg-f:test&th=thread-test&search=inbox&siml=confirm-forwarding-test"
  }' | jq '.success' || echo "Failed"

echo "✅ Quick test complete!"
```

Make it executable: `chmod +x quick-test.sh && ./quick-test.sh`
