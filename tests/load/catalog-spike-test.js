import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

/**
 * Spike test configuration
 * Sudden burst of traffic to test system resilience
 */
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Normal load
    { duration: '10s', target: 1000 },  // Sudden spike
    { duration: '1m', target: 1000 },   // Sustain spike
    { duration: '30s', target: 50 },    // Drop back to normal
    { duration: '1m', target: 50 },     // Recovery period
    { duration: '10s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% < 2s even during spike
    errors: ['rate<0.1'],               // Error rate < 10% during spike
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1/catalog';

export default function() {
  const response = http.get(`${BASE_URL}${API_PREFIX}/items?limit=24`);

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);

  sleep(0.5);
}
