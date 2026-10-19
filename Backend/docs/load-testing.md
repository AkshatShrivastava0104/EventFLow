# Load testing the deployed API

`loadtest.js` uses k6 to send read-only GET requests at a controlled,
configurable rate. It defaults to `http://localhost:8080/ready`, one request
per second, for one minute. It does not attempt login, token refresh, uploads,
or other write operations.

## Install k6

On Windows, install k6 with:

```powershell
winget install k6
```

Restart the terminal if `k6` is not found after installation.

## Start with a readiness smoke test

From the `Backend` directory:

```powershell
$env:BASE_URL = "https://YOUR_API_HOST"
$env:TARGET_PATH = "/ready"
$env:TARGET_RPS = "1"
$env:DURATION = "1m"
k6 run .\loadtest.js
```

The readiness endpoint checks PostgreSQL and Redis. Check the k6 summary for
request rate, failure rate, and p95 response time. The script fails its
thresholds if HTTP failures (including 429s) reach 1% or p95 latency reaches
one second.

## Exercise an authenticated, read-only API route

To include API routing and authentication, use the read-only events endpoint
and a short-lived access token. Do not test by repeatedly calling login or
refresh: refresh rotates tokens and both endpoints have a separate
10-requests-per-minute limit.

In PowerShell, the token prompt is masked and the environment variable is
cleared after the run:

```powershell
$env:BASE_URL = "https://YOUR_API_HOST"
$env:TARGET_PATH = "/api/v1/events"
$env:TARGET_RPS = "1"
$env:DURATION = "1m"
$secureToken = Read-Host "Short-lived access token" -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $env:AUTH_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    k6 run .\loadtest.js
}
finally {
    Remove-Item Env:AUTH_TOKEN -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    $secureToken.Dispose()
}
```

The global API limit is 100 requests per minute per client IP, shared with
ordinary users behind the same NAT/proxy. The default one request per second
produces up to 60 requests per minute, leaving a small margin; run only when
you have checked current traffic. Do not raise `TARGET_RPS` above one against
the production API without coordinating a maintenance window and accounting
for other requests from the same IP. A 429 indicates the limit was reached,
not necessarily that the service is unhealthy.

Optional settings are `PREALLOCATED_VUS` (default `2`), `MAX_VUS` (default
`10`), and `EXPECTED_STATUS` (default `200`). Raising VUs alone does not raise
the configured request rate. Rates above one request per second require
`ALLOW_HIGH_LOAD=true` as an explicit safeguard; only set that for an approved
staging/dedicated environment, not the shared production API.

Run larger stress tests against staging or a dedicated environment with
permission. Monitor Azure VM CPU/memory, container restarts, Redis/PostgreSQL
health, and API latency while testing. Stop the run with `Ctrl+C` if health
checks fail or production traffic degrades.
