# JWT and refresh-token security

The API requires `JWT_SECRET` to be configured with at least 32 non-whitespace
bytes. Use a cryptographically random value, keep it outside source control, and
provide the same value to every backend instance. Startup fails if it is missing
or too short.

Access and refresh JWTs are both signed with HS256, but carry distinct
`token_type` claims. Protected API routes accept only `access` tokens.
`/auth/refresh` accepts only `refresh` tokens and also checks the persisted
refresh-token record and the user's current `auth_version`. Refresh tokens are
rotated after use; logout removes the submitted refresh-token record.

Deploying this change invalidates previously issued tokens that lack the
`token_type` claim. Users with existing sessions will need to sign in again.
Do not use different `JWT_SECRET` values across replicas; rotating the secret
also invalidates all existing tokens.

## API rate limits

The API applies Redis-backed fixed-window limits per client IP: 100 requests per
minute across `/api/v1`, and a shared 10 requests per minute across the login
and refresh endpoints. Requests over the limit receive `429 Too Many Requests`
and a `Retry-After` header. If Redis cannot serve a counter, the request fails
with `503 Service Unavailable`; the API does not silently bypass the limit.

Gin trusts only `127.0.0.1` and `::1` as forwarding proxies by default.
`TRUSTED_PROXIES` can contain a comma-separated list of exact proxy IPs or
specific CIDRs. When Nginx runs on the Docker host, configure the exact Docker
bridge gateway address that the backend sees as its remote peer. Do not trust
all addresses or allow untrusted clients to set `X-Forwarded-For`.
