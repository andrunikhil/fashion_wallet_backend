import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

/**
 * Stress test configuration
 * Gradually increases load beyond normal capacity to find breaking point
 */
export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Warm up
    { duration: '2m', target: 200 },   // Normal load
    { duration: '2m', target: 400 },   // Above normal
    { duration: '2m', target: 600 },   // Stress load
    { duration: '2m', target: 800 },   // Heavy stress
    { duration: '2m', target: 1000 },  // Breaking point
    { duration: '3m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests < 1s
    errors: ['rate<0.05'],              // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1/catalog';

export default function() {
  // Random endpoint selection
  const endpoints = [
    `${BASE_URL}${API_PREFIX}/items?limit=24`,
    `${BASE_URL}${API_PREFIX}/search?q=summer&limit=24`,
    `${BASE_URL}${API_PREFIX}/items?category=tops&limit=24`,
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

  const response = http.get(endpoint);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
  });

  responseTime.add(response.timings.duration);
  errorRate.add(!success);

  sleep(0.5); // Minimal think time for stress testing
}
