# Client Usage Examples - API Key Authentication

This guide shows how different types of clients can integrate with the Email Forwarding Service using API key authentication.

## 🔧 Configuration Setup

First, ensure your service is configured with API keys:

```bash
# In your .env file
API_KEY_REQUIRED=true
API_KEYS=efs_prod_abc123,efs_staging_def456,efs_dev_xyz789
API_KEY_HEADER=x-api-key
```

## 📋 Quick Reference

| Scenario | API Key Required | Status Code | Notes |
|----------|------------------|-------------|-------|
| Missing API key | Yes | 401 | Authentication required |
| Invalid API key | Yes | 403 | Authentication failed |
| Valid API key | Yes | 200/400 | Processes request |
| Any request | No | 200/400 | Auth bypassed |

---

## 🌐 HTTP Clients

### cURL Examples

```bash
# Basic request with API key
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_prod_abc123" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
  }'

# With custom request ID
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_prod_abc123" \
  -H "x-request-id: client-req-$(date +%s)" \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
  }'

# Verbose output for debugging
curl -X POST http://localhost:3333/accept-forwarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: efs_prod_abc123" \
  -v \
  -d '{
    "url": "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
  }'
```

### HTTPie Examples

```bash
# Basic request
http POST localhost:3333/accept-forwarding \
  Content-Type:application/json \
  x-api-key:efs_prod_abc123 \
  url="https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"

# With custom headers
http POST localhost:3333/accept-forwarding \
  Content-Type:application/json \
  x-api-key:efs_prod_abc123 \
  x-request-id:client-12345 \
  User-Agent:"EmailClient/1.0" \
  url="https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
```

---

## 🟨 JavaScript/Node.js

### Using Fetch API (Modern)

```javascript
class EmailForwardingClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async acceptForwarding(url, requestId = null) {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };

    if (requestId) {
      headers['x-request-id'] = requestId;
    }

    try {
      const response = await fetch(`${this.baseUrl}/accept-forwarding`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || data.error}`);
      }

      return data;
    } catch (error) {
      console.error('Email forwarding failed:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Usage
const client = new EmailForwardingClient('http://localhost:3333', 'efs_prod_abc123');

// Accept forwarding
try {
  const result = await client.acceptForwarding(
    'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789',
    'client-req-12345'
  );
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error.message);
}

// Health check
const health = await client.healthCheck();
console.log('Service health:', health);
```

### Using Axios

```javascript
const axios = require('axios');

class EmailForwardingClient {
  constructor(baseUrl, apiKey) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const { status, data } = error.response;
          console.error(`HTTP ${status}:`, data.message || data.error);
        }
        return Promise.reject(error);
      }
    );
  }

  async acceptForwarding(url, requestId = null) {
    const headers = {};
    if (requestId) {
      headers['x-request-id'] = requestId;
    }

    const response = await this.client.post('/accept-forwarding', 
      { url }, 
      { headers }
    );
    return response.data;
  }

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Usage
const client = new EmailForwardingClient('http://localhost:3333', 'efs_prod_abc123');

async function main() {
  try {
    const result = await client.acceptForwarding(
      'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789'
    );
    console.log('Forwarding result:', result);
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

main();
```

---

## 🐍 Python

### Using Requests Library

```python
import requests
import json
import uuid
from typing import Optional, Dict, Any

class EmailForwardingClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'x-api-key': api_key
        })
        self.session.timeout = 30

    def accept_forwarding(self, url: str, request_id: Optional[str] = None) -> Dict[Any, Any]:
        """Accept Gmail forwarding confirmation"""
        headers = {}
        if request_id:
            headers['x-request-id'] = request_id
        else:
            headers['x-request-id'] = f"python-client-{uuid.uuid4().hex[:8]}"

        payload = {'url': url}
        
        try:
            response = self.session.post(
                f'{self.base_url}/accept-forwarding',
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.HTTPError as e:
            error_data = response.json() if response.content else {}
            raise Exception(f"HTTP {response.status_code}: {error_data.get('message', str(e))}")
        
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")

    def health_check(self) -> Dict[Any, Any]:
        """Check service health"""
        response = self.session.get(f'{self.base_url}/health')
        response.raise_for_status()
        return response.json()

# Usage
client = EmailForwardingClient('http://localhost:3333', 'efs_prod_abc123')

try:
    # Accept forwarding
    result = client.accept_forwarding(
        'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789'
    )
    print(f"Success: {result}")
    
    # Health check
    health = client.health_check()
    print(f"Service health: {health}")
    
except Exception as e:
    print(f"Error: {e}")
```

### Using aiohttp (Async)

```python
import aiohttp
import asyncio
import json
import uuid
from typing import Optional, Dict, Any

class AsyncEmailForwardingClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key
        }

    async def accept_forwarding(self, url: str, request_id: Optional[str] = None) -> Dict[Any, Any]:
        """Accept Gmail forwarding confirmation"""
        headers = self.headers.copy()
        if request_id:
            headers['x-request-id'] = request_id
        else:
            headers['x-request-id'] = f"async-python-{uuid.uuid4().hex[:8]}"

        payload = {'url': url}
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
            try:
                async with session.post(
                    f'{self.base_url}/accept-forwarding',
                    json=payload,
                    headers=headers
                ) as response:
                    data = await response.json()
                    
                    if response.status >= 400:
                        raise Exception(f"HTTP {response.status}: {data.get('message', 'Unknown error')}")
                    
                    return data
                    
            except aiohttp.ClientError as e:
                raise Exception(f"Request failed: {str(e)}")

    async def health_check(self) -> Dict[Any, Any]:
        """Check service health"""
        async with aiohttp.ClientSession() as session:
            async with session.get(f'{self.base_url}/health') as response:
                return await response.json()

# Usage
async def main():
    client = AsyncEmailForwardingClient('http://localhost:3333', 'efs_prod_abc123')
    
    try:
        # Accept forwarding
        result = await client.accept_forwarding(
            'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789'
        )
        print(f"Success: {result}")
        
        # Health check
        health = await client.health_check()
        print(f"Service health: {health}")
        
    except Exception as e:
        print(f"Error: {e}")

# Run async code
asyncio.run(main())
```

---

## ☕ Java

### Using OkHttp

```java
import okhttp3.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class EmailForwardingClient {
    private final OkHttpClient client;
    private final String baseUrl;
    private final String apiKey;
    private final ObjectMapper objectMapper;

    public EmailForwardingClient(String baseUrl, String apiKey) {
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.apiKey = apiKey;
        this.client = new OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .build();
        this.objectMapper = new ObjectMapper();
    }

    public JsonNode acceptForwarding(String url, String requestId) throws IOException {
        Map<String, String> payload = new HashMap<>();
        payload.put("url", url);

        RequestBody body = RequestBody.create(
            objectMapper.writeValueAsString(payload),
            MediaType.get("application/json")
        );

        Request.Builder requestBuilder = new Request.Builder()
            .url(baseUrl + "/accept-forwarding")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("x-api-key", apiKey);

        if (requestId != null) {
            requestBuilder.addHeader("x-request-id", requestId);
        } else {
            requestBuilder.addHeader("x-request-id", "java-client-" + UUID.randomUUID().toString().substring(0, 8));
        }

        Request request = requestBuilder.build();

        try (Response response = client.newCall(request).execute()) {
            String responseBody = response.body().string();
            JsonNode jsonResponse = objectMapper.readTree(responseBody);

            if (!response.isSuccessful()) {
                throw new IOException("HTTP " + response.code() + ": " + 
                    jsonResponse.path("message").asText("Unknown error"));
            }

            return jsonResponse;
        }
    }

    public JsonNode acceptForwarding(String url) throws IOException {
        return acceptForwarding(url, null);
    }

    public JsonNode healthCheck() throws IOException {
        Request request = new Request.Builder()
            .url(baseUrl + "/health")
            .get()
            .build();

        try (Response response = client.newCall(request).execute()) {
            return objectMapper.readTree(response.body().string());
        }
    }

    // Usage example
    public static void main(String[] args) {
        EmailForwardingClient client = new EmailForwardingClient(
            "http://localhost:3333", 
            "efs_prod_abc123"
        );

        try {
            // Accept forwarding
            JsonNode result = client.acceptForwarding(
                "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
            );
            System.out.println("Success: " + result.toPrettyString());

            // Health check
            JsonNode health = client.healthCheck();
            System.out.println("Service health: " + health.toPrettyString());

        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
```

---

## 🔷 C#

### Using HttpClient

```csharp
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class EmailForwardingClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private readonly string _apiKey;

    public EmailForwardingClient(string baseUrl, string apiKey)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _apiKey = apiKey;
        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(30)
        };
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
    }

    public async Task<JsonDocument> AcceptForwardingAsync(string url, string requestId = null)
    {
        var payload = new { url = url };
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/accept-forwarding")
        {
            Content = content
        };

        if (!string.IsNullOrEmpty(requestId))
        {
            request.Headers.Add("x-request-id", requestId);
        }
        else
        {
            request.Headers.Add("x-request-id", $"csharp-client-{Guid.NewGuid().ToString("N")[..8]}");
        }

        var response = await _httpClient.SendAsync(request);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            var errorData = JsonSerializer.Deserialize<JsonElement>(responseContent);
            var message = errorData.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown error";
            throw new HttpRequestException($"HTTP {(int)response.StatusCode}: {message}");
        }

        return JsonDocument.Parse(responseContent);
    }

    public async Task<JsonDocument> HealthCheckAsync()
    {
        var response = await _httpClient.GetAsync($"{_baseUrl}/health");
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}

// Usage
class Program
{
    static async Task Main(string[] args)
    {
        var client = new EmailForwardingClient("http://localhost:3333", "efs_prod_abc123");

        try
        {
            // Accept forwarding
            var result = await client.AcceptForwardingAsync(
                "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789"
            );
            Console.WriteLine($"Success: {result.RootElement}");

            // Health check
            var health = await client.HealthCheckAsync();
            Console.WriteLine($"Service health: {health.RootElement}");
        }
        catch (Exception e)
        {
            Console.WriteLine($"Error: {e.Message}");
        }
        finally
        {
            client.Dispose();
        }
    }
}
```

---

## 🦀 Rust

### Using reqwest

```rust
use reqwest::{Client, Error};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Serialize)]
struct ForwardingRequest {
    url: String,
}

pub struct EmailForwardingClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl EmailForwardingClient {
    pub fn new(base_url: String, api_key: String) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key,
        }
    }

    pub async fn accept_forwarding(
        &self,
        url: &str,
        request_id: Option<&str>,
    ) -> Result<Value, Box<dyn std::error::Error>> {
        let payload = ForwardingRequest {
            url: url.to_string(),
        };

        let request_id = request_id
            .map(|id| id.to_string())
            .unwrap_or_else(|| format!("rust-client-{}", &Uuid::new_v4().to_string()[..8]));

        let response = self
            .client
            .post(&format!("{}/accept-forwarding", self.base_url))
            .header("Content-Type", "application/json")
            .header("x-api-key", &self.api_key)
            .header("x-request-id", request_id)
            .json(&payload)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await?;
            let error_json: Value = serde_json::from_str(&error_text)?;
            let message = error_json["message"].as_str().unwrap_or("Unknown error");
            return Err(format!("HTTP {}: {}", response.status(), message).into());
        }

        let result: Value = response.json().await?;
        Ok(result)
    }

    pub async fn health_check(&self) -> Result<Value, Error> {
        let response = self
            .client
            .get(&format!("{}/health", self.base_url))
            .send()
            .await?;

        let result: Value = response.json().await?;
        Ok(result)
    }
}

// Usage
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = EmailForwardingClient::new(
        "http://localhost:3333".to_string(),
        "efs_prod_abc123".to_string(),
    );

    // Accept forwarding
    match client
        .accept_forwarding(
            "https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789",
            None,
        )
        .await
    {
        Ok(result) => println!("Success: {}", serde_json::to_string_pretty(&result)?),
        Err(e) => println!("Error: {}", e),
    }

    // Health check
    match client.health_check().await {
        Ok(health) => println!("Service health: {}", serde_json::to_string_pretty(&health)?),
        Err(e) => println!("Health check error: {}", e),
    }

    Ok(())
}
```

---

## 🔄 Error Handling Best Practices

### Common Error Scenarios

```javascript
// JavaScript example with comprehensive error handling
async function handleEmailForwarding(url) {
  try {
    const result = await client.acceptForwarding(url);
    return { success: true, data: result };
  } catch (error) {
    // Handle different error types
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return { 
            success: false, 
            error: 'AUTHENTICATION_REQUIRED',
            message: 'API key is missing or invalid',
            action: 'Check your API key configuration'
          };
        
        case 403:
          return { 
            success: false, 
            error: 'AUTHENTICATION_FAILED',
            message: 'Invalid API key',
            action: 'Verify your API key is correct'
          };
        
        case 400:
          return { 
            success: false, 
            error: 'VALIDATION_ERROR',
            message: data.message || 'Invalid request',
            details: data.details || [],
            action: 'Check your request format'
          };
        
        case 429:
          return { 
            success: false, 
            error: 'RATE_LIMITED',
            message: 'Too many requests',
            retryAfter: data.retryAfter,
            action: 'Wait before retrying'
          };
        
        case 500:
          return { 
            success: false, 
            error: 'SERVER_ERROR',
            message: 'Internal server error',
            requestId: data.requestId,
            action: 'Contact support with request ID'
          };
        
        default:
          return { 
            success: false, 
            error: 'UNKNOWN_ERROR',
            message: `HTTP ${status}: ${data.message || 'Unknown error'}`,
            action: 'Check service status'
          };
      }
    } else {
      // Network or other errors
      return { 
        success: false, 
        error: 'NETWORK_ERROR',
        message: error.message,
        action: 'Check network connectivity'
      };
    }
  }
}
```

---

## 🧪 Testing Your Integration

### Test Script Template

```bash
#!/bin/bash

# Test script for API key integration
API_KEY="efs_prod_abc123"
BASE_URL="http://localhost:3333"
TEST_URL="https://mail-settings.google.com/mail/u/0/?ui=2&ik=test123&view=lg&permmsgid=msg-f:test456&th=thread-test789&search=inbox&siml=confirm-forwarding-test"

echo "🧪 Testing API Key Integration"
echo "================================"

# Test 1: Health check (no auth required)
echo "1. Health Check (no auth required):"
curl -s -X GET "$BASE_URL/health" | jq '.'
echo ""

# Test 2: Missing API key
echo "2. Missing API Key (should return 401 if auth enabled):"
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\"}" | jq '.'
echo ""

# Test 3: Invalid API key
echo "3. Invalid API Key (should return 403 if auth enabled):"
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key-123" \
  -d "{\"url\": \"$TEST_URL\"}" | jq '.'
echo ""

# Test 4: Valid API key
echo "4. Valid API Key (should process request):"
curl -s -X POST "$BASE_URL/accept-forwarding" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -H "x-request-id: test-$(date +%s)" \
  -d "{\"url\": \"$TEST_URL\"}" | jq '.'
echo ""

echo "✅ Integration tests completed!"
```

This comprehensive guide shows how clients across different programming languages and platforms can integrate with your API key authentication system. Each example includes proper error handling, request ID generation, and follows best practices for HTTP client implementation.

