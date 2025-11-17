import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const catalogTrend = new Trend('catalog_duration');
const searchTrend = new Trend('search_duration');
const recommendationTrend = new Trend('recommendation_duration');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 200 },  // Spike to 200 users
    { duration: '2m', target: 100 },  // Scale down to 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(90)<200', 'p(95)<500', 'p(99)<1000'], // 90% of requests must complete below 200ms
    'http_req_duration{endpoint:catalog}': ['p(90)<50'],        // Catalog fetch < 50ms (p90)
    'http_req_duration{endpoint:search}': ['p(90)<200'],        // Search < 200ms (p90)
    'http_req_duration{endpoint:recommendation}': ['p(90)<500'], // Recommendations < 500ms (p90)
    errors: ['rate<0.01'],                                       // Error rate < 1%
    http_req_failed: ['rate<0.01'],                              // Failed requests < 1%
  },
};

// Base URL (can be overridden via environment variable)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1/catalog';

// Test data
const CATEGORIES = ['tops', 'bottoms', 'dresses', 'outerwear', 'accessories'];
const SEARCH_QUERIES = ['casual', 'formal', 'summer', 'winter', 'party'];

/**
 * Setup function - runs once per VU before the main function
 */
export function setup() {
  // Get some real item IDs from the catalog
  const response = http.get(`${BASE_URL}${API_PREFIX}/items?limit=20`);

  if (response.status === 200) {
    const data = JSON.parse(response.body);
    const itemIds = data.items?.map(item => item.id) || [];
    return { itemIds };
  }

  return { itemIds: [] };
}

/**
 * Main test scenario
 */
export default function(data) {
  const itemIds = data.itemIds || [];

  // Scenario 1: Browse catalog (40% of traffic)
  if (Math.random() < 0.4) {
    browseCatalog();
  }

  // Scenario 2: Search catalog (30% of traffic)
  else if (Math.random() < 0.7) {
    searchCatalog();
  }

  // Scenario 3: Get recommendations (20% of traffic)
  else if (Math.random() < 0.9) {
    getRecommendations(itemIds);
  }

  // Scenario 4: View specific item (10% of traffic)
  else {
    viewItem(itemIds);
  }

  // Think time between requests
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

/**
 * Scenario 1: Browse catalog
 */
function browseCatalog() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const page = Math.floor(Math.random() * 5) + 1;

  const response = http.get(
    `${BASE_URL}${API_PREFIX}/items?category=${category}&page=${page}&limit=24`,
    {
      tags: { endpoint: 'catalog' },
    }
  );

  const success = check(response, {
    'catalog status is 200': (r) => r.status === 200,
    'catalog response time < 100ms': (r) => r.timings.duration < 100,
    'catalog has items': (r) => {
      const body = JSON.parse(r.body);
      return body.items && body.items.length > 0;
    },
  });

  catalogTrend.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    failedRequests.add(1);
  }
}

/**
 * Scenario 2: Search catalog
 */
function searchCatalog() {
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const response = http.get(
    `${BASE_URL}${API_PREFIX}/search?q=${query}&limit=24`,
    {
      tags: { endpoint: 'search' },
    }
  );

  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 300ms': (r) => r.timings.duration < 300,
    'search has results': (r) => {
      const body = JSON.parse(r.body);
      return body.items !== undefined;
    },
  });

  searchTrend.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    failedRequests.add(1);
  }
}

/**
 * Scenario 3: Get recommendations
 */
function getRecommendations(itemIds) {
  if (itemIds.length === 0) {
    return;
  }

  const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];

  const response = http.get(
    `${BASE_URL}${API_PREFIX}/recommendations/${itemId}?limit=12`,
    {
      tags: { endpoint: 'recommendation' },
    }
  );

  const success = check(response, {
    'recommendation status is 200': (r) => r.status === 200,
    'recommendation response time < 600ms': (r) => r.timings.duration < 600,
    'recommendation has items': (r) => {
      const body = JSON.parse(r.body);
      return body.recommendations && body.recommendations.length > 0;
    },
  });

  recommendationTrend.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    failedRequests.add(1);
  }
}

/**
 * Scenario 4: View specific item
 */
function viewItem(itemIds) {
  if (itemIds.length === 0) {
    return;
  }

  const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];

  const response = http.get(
    `${BASE_URL}${API_PREFIX}/items/${itemId}`,
    {
      tags: { endpoint: 'catalog' },
    }
  );

  const success = check(response, {
    'item view status is 200': (r) => r.status === 200,
    'item view response time < 100ms': (r) => r.timings.duration < 100,
    'item has valid data': (r) => {
      const body = JSON.parse(r.body);
      return body.id && body.name;
    },
  });

  catalogTrend.add(response.timings.duration);
  errorRate.add(!success);

  if (!success) {
    failedRequests.add(1);
  }
}

/**
 * Teardown function - runs once after all VUs complete
 */
export function teardown(data) {
  console.log('Load test completed');
}
