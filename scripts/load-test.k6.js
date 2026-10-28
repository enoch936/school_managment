import http from 'k6/http';
import { check, sleep } from 'k6';

// Concurrency profile modeling 100,000 registered users with 1,000 to 2,500 active concurrent sessions
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Warm up
    { duration: '1m',  target: 200 },   // Normal load
    { duration: '2m',  target: 500 },   // High load peak
    { duration: '1m',  target: 1000 },  // Stress peak
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<800'], // 95% of requests under 300ms
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000/api/v1';

export default function () {
  // 1. Health check probe
  const healthRes = http.get(`${BASE_URL}/monitoring/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. High-traffic read: student listings
  const listRes = http.get(`${BASE_URL}/students?pageSize=20&page=1`, {
    headers: {
      'Accept': 'application/json',
    },
  });
  check(listRes, {
    'read status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
