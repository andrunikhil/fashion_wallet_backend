import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const memoryLeaks = new Trend('memory_leaks_indicator');

/**
 * Soak test configuration
 * Extended duration test to identify memory leaks and degradation
 */
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '30m', target: 100 },  // Sustained load for 30 minutes
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms throughout
    errors: ['rate<0.01'],              // Error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1/catalog';

let requestCount = 0;

export default function() {
  requestCount++;

  // Mix of different operations
  const operations = [
    () => http.get(`${BASE_URL}${API_PREFIX}/items?limit=24`),
    () => http.get(`${BASE_URL}${API_PREFIX}/search?q=casual&limit=24`),
    () => http.get(`${BASE_URL}${API_PREFIX}/items?category=tops&limit=12`),
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  const response = operation();

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'performance not degrading': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);

  // Track response time trend to detect degradation
  memoryLeaks.add(response.timings.duration);

  // Log every 1000 requests to monitor trends
  if (requestCount % 1000 === 0) {
    console.log(`Completed ${requestCount} requests`);
  }

  sleep(Math.random() * 2 + 1); // 1-3 seconds think time
}

export function teardown(data) {
  console.log('Soak test completed - Check for memory leaks and performance degradation');
}
