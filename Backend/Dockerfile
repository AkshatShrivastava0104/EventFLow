# ================================
# Stage 1: Build
# ================================
FROM golang:1.25.5-bookworm AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

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

LABEL org.opencontainers.image.source="https://github.com/AkshatShrivastava0104/EventFlow"

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN useradd \
    --system \
    --create-home \
    --uid 10001 \
    --shell /usr/sbin/nologin \
    eventflow

COPY --from=builder /app/eventflow-api /app/eventflow-api

USER eventflow

EXPOSE 8080

ENTRYPOINT ["/app/eventflow-api"]