# EventFlow — Product Requirements Document (PRD) & Technical Specification

**Version:** 1.0.0-PROD  
**Document Status:** Approved / Ready for Implementation  
**Product Name:** EventFlow  
**Tagline:** High-Throughput Event Orchestration & Real-Time Admission Engine  
**Target Backend:** Go (Gin) + PostgreSQL + Redis (FIFO & Gate Caching)  
**Target Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand  

---

## 1. Executive Summary & Vision

**EventFlow** is an enterprise-grade, high-throughput event lifecycle and ticket orchestration platform engineered for tech summits, developer conferences, and large-scale venues. It bridges the gap between modern public event discovery, instant friction-free attendee checkout with automated waitlists, enterprise organizer governance, and sub-millisecond, conflict-free gate turnstile validation.

Unlike legacy ticketing systems plagued by checkout race conditions, static counterfeit-vulnerable PDF tickets, and brittle gate scanners, EventFlow features:
- **Sub-millisecond turnstile validation** powered by Go/Gin and Redis edge caching.
- **Dynamic anti-fraud QR passes** with HMAC-SHA256 rotating time-based tokens.
- **Strict HTTP 409 Collision Guards** preventing duplicate or simultaneous badge scans across different gates.
- **FIFO waitlist pipelines** with automated release triggers upon registration dropouts or capacity expansions.
- **Unified responsive multi-device experience**: 11 desktop administrative/attendee surfaces and 2 specialized mobile field terminals (Attendee Wallet Pass & Staff Gate Scanner).

---

## 2. Core User Personas

| Persona | Role & Context | Primary Jobs to Be Done (JTBD) | Key Pain Points Solved |
| :--- | :--- | :--- | :--- |
| **Event Organizer / Executive** | Tech conference leads, venue owners, ops directors managing multi-day summits. | Monitor aggregate sales velocity, review gate admissions, configure multi-tier ticket quotas, enforce RBAC roles. | Lack of real-time visibility during peak rush; slow badge reprints; complex pricing tiers. |
| **On-Site Gate Operator / Staff** | Door staff, turnstile managers with handheld scanners or entrance laptops. | Admit attendees in <0.5s, detect counterfeit/duplicate tickets, switch cameras, handle manual lookup fallbacks. | Slow camera autofocus; turnstile race conditions (badge pass-backs); network drops. |
| **Summit Attendee / VIP** | Engineers, keynote speakers, enterprise delegates attending in-person summits. | Discover sessions, purchase tickets with instant receipts, store digital pass in Apple/Google Wallet, navigate concourses. | Frustrating waitlists; lost PDF tickets; poor cellular signal at venue gates making QR codes fail to load. |
| **System / Security Admin** | Enterprise IT managers maintaining compliance and integration pipelines. | Rotate API keys, configure webhooks, enforce FIDO2/TOTP 2FA, inspect security audit logs. | Weak auditability; API secret leaks; unauthorized scanner devices. |

---

## 3. System Architecture & Tech Stack

### 3.1 Frontend Architecture
- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **Language**: TypeScript 5.5+ (Strict Mode)
- **Styling**: Tailwind CSS v3.4+ configured with the *EventFlow Precision Canvas* design tokens
- **State Management**:
  - Server State: `@tanstack/react-query` (with aggressive cache invalidation & optimistic updates)
  - Client / UI State: `zustand` (gate scanner active session, wallet brightness mode, auth tokens)
- **Hardware & Media APIs**:
  - `@zxing/browser` & native `BarcodeDetector` for continuous 60fps camera feed parsing
  - Web Vibration API (`navigator.vibrate`) for tactile pass/fail haptics
  - Screen Wake Lock API (`navigator.wakeLock`) to prevent scanner screen dimming
- **Real-Time Transport**: Server-Sent Events (SSE) & WebSockets for live turnstile collision telemetry and waitlist promotion alerts

### 3.2 Backend Engine (Go / Gin Contract)
- **REST Engine**: Gin Web Framework (`github.com/gin-gonic/gin`)
- **Persistence**: PostgreSQL 16 with Row-Level Security (RLS) and multi-tenant schema partitioning
- **Memory & Ingestion Layer**: Redis 7.2 Clusters
  - Distributed locks (`Redlock`) for ticket tier quota decrementing
  - Sorted sets (`ZSET`) for millisecond-accurate FIFO registration waitlists
  - Key-value stores for ECDSA token revocation and active scanner terminal heartbeats

---

## 4. Complete Screen Inventory & Route Specifications

The EventFlow platform encompasses 13 production-ready screens spanning attendee, organizer, gate operational, and authentication flows:

### 4.1 Authentication & Security (`/login`, `/register`, `/settings`)
1. **Authentication & Enterprise Gateway (`SCREEN_6`)**
   - **Route**: `/login` & `/register`
   - **Layout**: Split-screen with enterprise telemetry panel (`14,290+ Active Registrations`, `99.8% Gate Validation`, `0.2ms Turnstile Engine`, SOC2/ISO badges) on the left and interactive auth portal on the right.
   - **Capabilities**: Dual-tab toggle (Sign In vs. Create Workspace), Google & GitHub SSO, enterprise domain verification, FIDO2 WebAuthn / TOTP challenge challenge toggles, and token refresh status.
2. **Settings & Enterprise Security (`SCREEN_14`)**
   - **Route**: `/settings`
   - **Capabilities**: API secret generation and rotation, webhook endpoint dispatch management, active scanner token terminal management, session revocation.

### 4.2 Organizer & Management Operations (`/admin`, `/events/*`, `/organizations`)
3. **Owner Operations Dashboard (`SCREEN_26`)**
   - **Route**: `/admin`
   - **Capabilities**: High-level platform KPIs (Revenue, Admissions, Capacity, Active Gates), SVG admissions velocity chart, live event table, system health monitor.
4. **Event Details & Lifecycle Management (`SCREEN_24`)**
   - **Route**: `/events/:id`
   - **Capabilities**: Real-time capacity utilization bar, searchable attendee roster, status filtering (Checked In, Pending, Cancelled), FIFO waitlist promotion pipeline, event status controls.
5. **Create & Publish Event Studio (`SCREEN_10`)**
   - **Route**: `/events/new`
   - **Capabilities**: 4-stage wizard (Details, Ticket Tiers, Venue & Logistics, Review & Publish), dynamic ticket tier builder with early-bird thresholds, live desktop/mobile preview pane.
6. **Organization & Member Governance (`SCREEN_16`)**
   - **Route**: `/organizations`
   - **Capabilities**: Multi-tenant workspace switcher, RBAC membership roster (Owner, Admin, Gate Staff), role assignment modals, pending invites, immutable audit trail.
7. **Notification Center & System Dispatch Hub (`SCREEN_12`)**
   - **Route**: `/notifications`
   - **Capabilities**: Priority alert stream (Critical, Warning, Info), turnstile collision intercepts, waitlist trigger dispatches, bulk mark-as-read controls.

### 4.3 Attendee Experience (`/events`, `/events/:slug`, `/tickets`)
8. **Browse & Discover Events (`SCREEN_22`)**
   - **Route**: `/events`
   - **Capabilities**: Public catalog with real-time seat scarcity badges, category & date filters, keyword search, venue previews.
9. **Public Attendee Event & Checkout Experience (`SCREEN_8`)**
   - **Route**: `/events/:slug`
   - **Capabilities**: High-impact summit header, faculty keynote roster, interactive 3-day multi-track agenda tabs, sticky real-time checkout drawer with tier selection (Sold Out FIFO Waitlist vs Standard vs VIP), payment inputs, and venue transit guide.
10. **My Tickets & Digital Passes (`SCREEN_20`)**
    - **Route**: `/tickets`
    - **Capabilities**: Attendee pass hub, QR stubs, Apple/Google Wallet export buttons, offline cache status pills, live waitlist queue status tracker.

### 4.4 Gate Operations & Field Terminals (`/check-in`, `/scanner-mobile`, `/tickets/:id/pass`)
11. **Operational Check-in Terminal (`SCREEN_18`)**
    - **Route**: `/check-in` (Desktop / Tablet)
    - **Capabilities**: High-throughput split-screen gate workstation, camera viewfinder with targeting grid, manual ticket ID input with instant autocomplete, recent check-in feed, HTTP 409 collision alert modal.
12. **Mobile Attendee Digital Pass & Wallet (`SCREEN_2`)**
    - **Route**: `/tickets/:id/pass` (Mobile 390px)
    - **Capabilities**: Offline-validated pass view, high-contrast QR stub with 45-second HMAC token rotation, one-tap screen brightness boost, Apple/Google Wallet buttons, Moscone West interactive floor route.
13. **Mobile Staff Gate Scanner Terminal (`SCREEN_4`)**
    - **Route**: `/scanner-mobile` (Mobile 390px)
    - **Capabilities**: Fullscreen camera scanner with targeting reticle, flashlight/camera toggle, instant admission card with attendee avatar and zone privileges, 1-tap badge print, duplicate collision guard, shift metrics (admissions/hour, sync latency).

---

## 5. Backend REST API & Data Schema Contract

### 5.1 Endpoints Specification

| Method | Endpoint | Description | Key Request / Response Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user | `{ email, password, totp_code? }` → `{ token, refresh_token, user }` |
| `POST` | `/api/v1/auth/refresh` | Rotate access token | Headers: `ef_jwt` → `{ token }` |
| `GET` | `/api/v1/events` | List events | `?status=published&limit=20` → `[{ id, title, capacity, claimed }]` |
| `POST` | `/api/v1/events` | Create new event | `{ title, slug, starts_at, venue, tiers: [...] }` |
| `GET` | `/api/v1/events/:id` | Event detail & roster | Returns event metadata, tiers, registrations, and waitlist counts |
| `POST` | `/api/v1/events/:id/register` | Purchase / Claim ticket | Headers: `Idempotency-Key` • `{ tier_id, attendee_name, email, payment_token }` |
| `POST` | `/api/v1/events/:id/waitlist` | Enroll in FIFO queue | `{ tier_id, email, full_name }` → `{ queue_position: 19 }` |
| `POST` | `/api/v1/events/:id/checkin` | Turnstile badge admission | `{ ticket_id, gate_id, timestamp, nonce }` → `200 OK` or `409 Conflict` |
| `GET` | `/api/v1/registrations/me` | Attendee tickets | Returns active passes with rotating HMAC seed |
| `GET` | `/api/v1/notifications/stream`| Real-time SSE channel | Dispatches `gate_collision` and `waitlist_promotion` |

### 5.2 Core Data Models

#### Registration / Pass
```typescript
interface RegistrationPass {
  id: string; // e.g. "TKT-8842-SF-VIP-998"
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  tierName: "Early Bird" | "Standard Delegate" | "Executive VIP";
  designatedGate: string; // e.g. "Gate 2A"
  reservedSeat?: string; // e.g. "Seat #A-108"
  zoneAccess: string[]; // ["Stages A-D", "Backstage Lounge", "VIP Dinner"]
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInGate?: string;
  hmacSecret: string;
}
```

#### Gate Admission Payload
```typescript
interface GateScanRequest {
  ticketId: string;
  gateId: string;
  operatorId: string;
  scannedAt: string;
  tokenDigest: string; // ECDSA/HMAC hash to prevent replayed QR screenshots
}
```

---

## 6. Non-Functional & Security Requirements

1. **Gate Latency SLA**: Turnstile API responses (`POST /events/:id/checkin`) must return within `< 50ms P99` under a concurrency of 500 scans/second per gate cluster.
2. **Offline Resilience**: Mobile attendee passes cache signed ECDSA manifests locally in IndexedDB / Web Storage, allowing turnstiles with cached public keys to admit attendees even during cellular congestion.
3. **Idempotency & Race Condition Guard**: Ticket purchase requests must enforce UUIDv4 `Idempotency-Key` headers in the Go/Gin middleware to prevent double charges.
4. **Collision Detection (HTTP 409)**: If a badge is presented at Gate 2A and subsequently presented at Gate 4B within 180 minutes, the second scanner immediately triggers an audio/visual `409 Collision Flag` and notifies the dispatch hub.
5. **Security Compliance**: SOC2 Type II compliance controls, TLS 1.3 encryption, Argon2id password hashing, and encrypted-at-rest credential stores.

---

## 7. Implementation Roadmap

- **Milestone 1: Auth & Multi-Tenant Core (Weeks 1–2)**: Next.js auth layout, JWT rotation client, RBAC organizations management.
- **Milestone 2: Organizer Console & Studio (Weeks 3–4)**: Executive dashboard, 4-step event creation wizard, roster and waitlist management.
- **Milestone 3: Attendee Discovery & Sticky Checkout (Weeks 5–6)**: Public discovery catalog, event landing page, multi-tier agenda tabs, Stripe Elements integration.
- **Milestone 4: Turnstile Engine & Offline Wallets (Weeks 7–8)**: Dynamic rotating QR pass component, mobile staff optical scanner terminal with BarcodeDetector, HTTP 409 collision dispatch handlers.
- **Milestone 5: Load Testing & Venue Dry-Run (Weeks 9–10)**: 5,000 req/sec gate ingress simulation with Go turnstiles, Moscone West field tests.
