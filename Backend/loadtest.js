import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const baseURL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const targetPath = __ENV.TARGET_PATH || '/ready';
const targetRate = Number(__ENV.TARGET_RPS || 1);
const testDuration = __ENV.DURATION || '1m';
const preAllocatedVUs = Number(__ENV.PREALLOCATED_VUS || 2);
const maxVUs = Number(__ENV.MAX_VUS || 10);
const expectedStatus = Number(__ENV.EXPECTED_STATUS || 200);
const rateLimited = new Rate('rate_limited');

if (!/^https?:\/\//i.test(baseURL)) {
    throw new Error('BASE_URL must be an absolute http:// or https:// URL');
}
if (!targetPath.startsWith('/') || targetPath.startsWith('//')) {
    throw new Error('TARGET_PATH must be a path beginning with one slash');
}
if (!Number.isInteger(targetRate) || targetRate < 1) {
    throw new Error('TARGET_RPS must be a positive integer');
}
if (targetRate > 1 && __ENV.ALLOW_HIGH_LOAD !== 'true') {
    throw new Error('TARGET_RPS above 1 requires ALLOW_HIGH_LOAD=true; use higher rates only in an approved test environment');
}
if (!Number.isInteger(preAllocatedVUs) || preAllocatedVUs < 1 ||
    !Number.isInteger(maxVUs) || maxVUs < preAllocatedVUs) {
    throw new Error('MAX_VUS must be an integer greater than or equal to positive PREALLOCATED_VUS');
}
if (!Number.isInteger(expectedStatus) || expectedStatus < 100 || expectedStatus > 599) {
    throw new Error('EXPECTED_STATUS must be an HTTP status code');
}

const headers = {};
if (__ENV.AUTH_TOKEN) {
    headers.Authorization = `Bearer ${__ENV.AUTH_TOKEN}`;
}

export const options = {
    scenarios: {
        steady_load: {
            executor: 'constant-arrival-rate',
            rate: targetRate,
            timeUnit: '1s',
            duration: testDuration,
            preAllocatedVUs,
            maxVUs,
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
        rate_limited: ['rate<0.01'],
    },
};

export default function () {
    const response = http.get(`${baseURL}${targetPath}`, {
        headers,
        tags: { endpoint: targetPath },
        timeout: '10s',
    });

    const isRateLimited = response.status === 429;
    rateLimited.add(isRateLimited);
    check(response, {
        [`status is ${expectedStatus}`]: (res) => res.status === expectedStatus,
    });

    sleep(0.1);
}
