# Catalog Service Load Testing

This directory contains k6 load testing scripts for the catalog service.

## Prerequisites

1. Install k6:
   ```bash
   # macOS
   brew install k6

   # Linux
   sudo apt-get install k6

   # Windows
   choco install k6
   ```

2. Ensure the application is running:
   ```bash
   npm run start:prod
   ```

## Test Scenarios

### 1. Load Test (`catalog-load-test.js`)
**Purpose**: Simulate realistic user traffic patterns

**Duration**: ~7 minutes

**Peak Load**: 200 concurrent users

**Scenarios**:
- 40% - Browse catalog
- 30% - Search operations
- 20% - Get recommendations
- 10% - View specific items

**Performance Targets**:
- Catalog fetch: p90 < 50ms
- Search: p90 < 200ms
- Recommendations: p90 < 500ms
- Error rate: < 1%

**Run**:
```bash
k6 run tests/load/catalog-load-test.js
```

### 2. Stress Test (`catalog-stress-test.js`)
**Purpose**: Find the breaking point of the system

**Duration**: ~14 minutes

**Peak Load**: 1000 concurrent users

**What it tests**: System behavior under extreme load

**Run**:
```bash
k6 run tests/load/catalog-stress-test.js
```

### 3. Spike Test (`catalog-spike-test.js`)
**Purpose**: Test system resilience to sudden traffic spikes

**Duration**: ~4 minutes

**Traffic Pattern**: Sudden spike from 50 to 1000 users in 10 seconds

**What it tests**: Auto-scaling, circuit breakers, rate limiting

**Run**:
```bash
k6 run tests/load/catalog-spike-test.js
```

### 4. Soak Test (`catalog-soak-test.js`)
**Purpose**: Identify memory leaks and performance degradation over time

**Duration**: ~34 minutes

**Load**: Sustained 100 concurrent users

**What it tests**: Memory leaks, connection pool exhaustion, cache issues

**Run**:
```bash
k6 run tests/load/catalog-soak-test.js
```

## Running Tests

### Basic Usage

```bash
# Run with default settings (localhost:3000)
k6 run tests/load/catalog-load-test.js

# Run against different environment
BASE_URL=https://staging-api.example.com k6 run tests/load/catalog-load-test.js

# Run with specific VU count
k6 run --vus 100 --duration 60s tests/load/catalog-load-test.js

# Save results to file
k6 run --out json=results.json tests/load/catalog-load-test.js
```

### Advanced Options

```bash
# Run with custom thresholds
k6 run --thresholds 'http_req_duration{p(95)}<300' tests/load/catalog-load-test.js

# Run with Prometheus output
k6 run --out prometheus tests/load/catalog-load-test.js

# Run with InfluxDB output (for Grafana visualization)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/catalog-load-test.js
```

## Interpreting Results

### Key Metrics

1. **http_req_duration**: Request duration times
   - p(90): 90th percentile - 90% of requests faster than this
   - p(95): 95th percentile
   - p(99): 99th percentile

2. **http_req_failed**: Percentage of failed requests

3. **errors**: Custom error rate metric

4. **iterations**: Number of test iterations completed

### Sample Output

```
✓ catalog status is 200
✓ catalog response time < 100ms
✓ search status is 200

http_req_duration..............: avg=125ms p(95)=250ms p(99)=450ms
http_req_failed................: 0.05%
errors.........................: 0.05%
iterations.....................: 12450
```

## Performance Targets

Based on Phase 5 requirements:

| Operation | p90 Target | p95 Target | p99 Target |
|-----------|-----------|-----------|-----------|
| Catalog item fetch | < 50ms | < 100ms | < 200ms |
| Search | < 200ms | < 400ms | < 800ms |
| Visual search | < 2s | < 3s | < 5s |
| Recommendations | < 500ms | < 1s | < 2s |

**System-wide**:
- Throughput: > 1000 req/s
- Error rate: < 1%
- CPU usage: < 70%
- Memory growth: < 5% per hour

## Monitoring During Load Tests

While running load tests, monitor:

1. **Application Metrics** (Prometheus):
   ```bash
   # View metrics endpoint
   curl http://localhost:3000/metrics
   ```

2. **Cache Hit Rates**:
   - L1 cache: > 80%
   - L2 cache (Redis): > 60%

3. **Database Performance**:
   - Connection pool usage
   - Query execution times
   - Lock contention

4. **System Resources**:
   - CPU usage
   - Memory usage
   - Network I/O
   - Disk I/O

## Troubleshooting

### High Error Rates

1. Check application logs
2. Verify database connections
3. Check Redis connectivity
4. Review rate limiting settings

### Slow Response Times

1. Check cache hit rates
2. Review database query performance
3. Check for N+1 queries
4. Verify materialized views are refreshed

### Memory Leaks (Soak Test)

1. Take heap snapshots before/after
2. Check for connection leaks
3. Review cache eviction policies
4. Monitor garbage collection

## Best Practices

1. **Run tests in isolated environment** - Don't run on production
2. **Baseline first** - Establish baseline metrics before optimizations
3. **One change at a time** - Test impact of each optimization separately
4. **Monitor system resources** - Watch CPU, memory, disk, network
5. **Check logs** - Review application logs during tests
6. **Document results** - Keep track of what works and what doesn't

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Load Tests
  run: |
    docker-compose up -d
    sleep 10
    k6 run tests/load/catalog-load-test.js --out json=results.json

- name: Check Performance Thresholds
  run: |
    # Parse results.json and fail if thresholds not met
    node scripts/check-performance.js results.json
```

## Next Steps

After running load tests:

1. Review and document bottlenecks
2. Optimize based on findings
3. Re-run tests to verify improvements
4. Update performance targets as needed
5. Set up continuous performance monitoring
