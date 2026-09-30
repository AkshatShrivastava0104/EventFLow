# ================================
# Stage 1: Build
# ================================
FROM golang:1.25.5-bookworm AS builder

WORKDIR /app

# Download dependencies first for better Docker layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy backend source
COPY . .

# Build API binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /app/eventflow-api \
    ./cmd/api


# ================================
# Stage 2: Production
# ================================
FROM debian:bookworm-slim

WORKDIR /app

# CA certificates are required for outbound HTTPS calls
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user
RUN useradd \
    --system \
    --create-home \
    --uid 10001 \
    --shell /usr/sbin/nologin \
    eventflow

# Copy only the compiled application
COPY --from=builder /app/eventflow-api /app/eventflow-api

# Application runs as non-root
USER eventflow

# The Go server listens on 8080 inside the container
EXPOSE 8080

ENTRYPOINT ["/app/eventflow-api"]
