# CORS and API security deployment

## Trusted browser origin

The production UI origin is `https://eventflowak.vercel.app`. The Go API allows
that exact origin and any additional exact HTTPS origins listed in
`CORS_ALLOWED_ORIGINS`. Do not use `*`, a wildcard Vercel domain, a path, or an
untrusted preview deployment. Localhost origins are enabled only when
`APP_ENV=development`.

On the VM, keep this in the untracked `Backend/.env`:

```env
APP_ENV=production
CORS_ALLOWED_ORIGINS=https://eventflowak.vercel.app
```

If a preview deployment must call the API, add its exact `https://` origin only
while that preview is trusted, then remove it afterwards. Recreate the backend
after changing the file:

```sh
docker compose up -d --force-recreate backend
```

The Go router installs one CORS middleware before all routes. It handles
preflight before authentication, allows the `Authorization` header used by JWT
clients, and keeps credential support enabled. Authentication middleware and
role-based authorization remain on the API routes.

The old Vercel `/api/*` Supabase service-role handlers have been retired: they
used wildcard CORS and bypassed the Go API's JWT/RBAC checks. These paths now
return `410 Gone`; the Vercel catch-all routes unknown `/api/*` paths to a
not-found handler instead of the SPA.

Vercel serves the frontend's security headers from `Frontend/vercel.json`;
Gin sets headers on the API. Its CSP permits the current API IP, Cloudinary
images, Google Fonts, and the existing inline bootstrap scripts by exact
SHA-256 hash. Update the CSP if the API host or an inline bootstrap script
changes.

## Nginx reverse proxy

There is no Nginx configuration in this repository; inspect the VM's effective
configuration with `sudo nginx -T`. The API's own CORS middleware must be the
single source of CORS response headers. In particular, Nginx must not reject
`OPTIONS`, add a second `Access-Control-Allow-Origin`, or return its own
preflight response. Pass the preflight request and origin through to Gin:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Do not add an `if`/`return 403` for `OPTIONS`, a `limit_except` that omits
`OPTIONS`, or Nginx `Access-Control-*` headers. Keep TLS termination and
certificate configuration in the existing HTTPS server block. Gin sets HSTS
for API responses when `APP_ENV=production`; Vercel sets it for the frontend.
Avoid adding duplicate CORS or security response headers in Nginx.

Once the retired routes are deployed, remove the unused
`SUPABASE_SERVICE_ROLE_KEY` from Vercel project environment variables. Do not
print or share its value.

An `OPTIONS` 403 for an unlisted origin is expected. A 403 for
`https://eventflowak.vercel.app` is not: verify the actual browser `Origin`,
`CORS_ALLOWED_ORIGINS` in the running container, and the Nginx location/proxy
rules. An Nginx `Server` response header alone does not establish whether Gin
or Nginx generated the status; compare the forwarded API logs and
`sudo nginx -T`.

## Deployment

The `backend-ci.yml` workflow builds and tests pushes to
`frontend/role-based-dashboards` and publishes GHCR tags including an immutable
`sha-<commit>` tag. Check CI before deploying:

```sh
git push origin frontend/role-based-dashboards
gh run list --workflow backend-ci.yml --branch frontend/role-based-dashboards --limit 5
gh run watch <successful-run-id>
```

Deploy a specific successful image without changing the VM's secrets:

```sh
export EVENTFLOW_API_IMAGE=ghcr.io/akshatshrivastava0104/eventflow-api:sha-<commit-sha>
docker compose pull backend
docker compose up -d --no-deps --force-recreate backend
docker compose ps backend
docker compose logs --tail=100 backend
```

## Verification

Run these from the VM after deployment. The trusted origin must receive 204 and
its exact allow-origin value; an untrusted origin must not receive CORS
permission. Production health responses must include the security headers.

```sh
curl -i -X OPTIONS https://20.205.136.249/api/v1/events/2/media \
  -H 'Origin: https://eventflowak.vercel.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type'

curl -i -X OPTIONS https://20.205.136.249/api/v1/events/2/media \
  -H 'Origin: https://untrusted.example' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type'

curl -i https://20.205.136.249/health
docker compose exec backend printenv APP_ENV CORS_ALLOWED_ORIGINS
```

Do not print or share the full container environment: it contains secrets.

## Rollback

Use the previous known-good immutable SHA tag:

```sh
export EVENTFLOW_API_IMAGE=ghcr.io/akshatshrivastava0104/eventflow-api:sha-<previous-good-commit-sha>
docker compose pull backend
docker compose up -d --no-deps --force-recreate backend
docker compose ps backend
docker compose logs --tail=100 backend
```
