import http from 'k6/http';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const res = http.get('http://[::1]:8080/health');
  console.log(`status=${res.status} body=${res.body}`);
}