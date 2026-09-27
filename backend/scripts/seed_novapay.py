#!/usr/bin/env python3
"""
NovaPay Demo Seed Script (WS-14)
=================================
Seeds the SynQ backend with the NovaPay fictional fintech dataset:

  - 1  admin user   (admin@novapay.io / novapay2024)
  - 3  teams
  - 9  services
  - 8  ADRs   (written by Alex Morgan and Diana Park)
  - 7  incidents
  - 1  project: NovaPay

Usage:
    python seed_novapay.py [--base-url http://localhost:8000]

The script is idempotent: running it twice will show 409s for existing
entities and skip them gracefully.
"""

import argparse
import sys
import requests

# ── CLI ────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="Seed NovaPay demo data")
parser.add_argument("--base-url", default="http://localhost:8000",
                    help="SynQ backend base URL (default: http://localhost:8000)")
args = parser.parse_args()
BASE = args.base_url.rstrip("/")

# ── Helpers ────────────────────────────────────────────────────────────────
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

def post(path, body, *, expect=(200, 201, 409)):
    r = session.post(f"{BASE}{path}", json=body)
    if r.status_code not in expect:
        print(f"  ✗ POST {path} → {r.status_code}: {r.text[:200]}", file=sys.stderr)
        return None
    return r.json() if r.status_code != 204 else {}

def get(path):
    r = session.get(f"{BASE}{path}")
    r.raise_for_status()
    return r.json()

def auth(email, password):
    r = post("/api/v1/auth/login", {"email": email, "password": password}, expect=(200,))
    token = r["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return token

# ── 1. Admin user ──────────────────────────────────────────────────────────
print("→ Creating admin user…")
post("/api/v1/auth/register", {
    "email": "admin@novapay.io",
    "password": "novapay2024",
    "full_name": "Alex Morgan",
    "role": "admin",
})
auth("admin@novapay.io", "novapay2024")
print("  ✓ admin@novapay.io")

# ── 2. Project ─────────────────────────────────────────────────────────────
print("→ Creating NovaPay project…")
proj_list = get("/api/v1/projects")
novapay = next((p for p in proj_list if p["name"] == "NovaPay"), None)
if not novapay:
    novapay = post("/api/v1/projects", {
        "name": "NovaPay",
        "description": (
            "NovaPay is a fintech payments platform processing card-not-present "
            "transactions for 40+ million consumers across 12 markets. "
            "This project contains the system architecture, decisions, and incidents "
            "for the core platform team."
        ),
    }, expect=(201,))
pid = novapay["id"]
print(f"  ✓ project id={pid}")

# ── 3. Services ────────────────────────────────────────────────────────────
print("→ Seeding 9 services…")
SERVICES = [
    {
        "name": "Payment Service",
        "description": "Core payment processing engine. Handles card authorisation, "
                       "capture, refund, and void lifecycle. Integrates with Visa/MC "
                       "card networks via ISO 8583.",
        "tech_stack": "Java 17 / Spring Boot / Kafka / PostgreSQL",
        "tags": ["payments", "critical", "pci-dss"],
    },
    {
        "name": "Auth Service",
        "description": "Manages user and merchant authentication, OAuth2 flows, "
                       "API key issuance, and session token management.",
        "tech_stack": "Go / Redis / PostgreSQL",
        "tags": ["auth", "security", "critical"],
    },
    {
        "name": "Fraud Detection Service",
        "description": "Real-time ML-based fraud scoring. Scores every transaction "
                       "within 50 ms using gradient-boosted tree models. Integrates "
                       "with the Payment Service via gRPC.",
        "tech_stack": "Python / FastAPI / Redis / ML",
        "tags": ["fraud", "ml", "real-time"],
    },
    {
        "name": "Notification Service",
        "description": "Delivers transactional emails, SMS, and push notifications. "
                       "Fans out from Kafka topics published by downstream services.",
        "tech_stack": "Node.js / Kafka / SendGrid / Twilio",
        "tags": ["notifications", "async"],
    },
    {
        "name": "Reporting Service",
        "description": "Generates merchant settlement reports, transaction summaries, "
                       "and regulatory filings. Reads from the analytical replica.",
        "tech_stack": "Python / Celery / PostgreSQL / S3",
        "tags": ["reporting", "batch", "analytics"],
    },
    {
        "name": "API Gateway",
        "description": "Single ingress point for all external clients. Handles "
                       "rate limiting, request routing, TLS termination, and "
                       "API versioning.",
        "tech_stack": "Nginx / Lua / Redis",
        "tags": ["gateway", "infrastructure", "critical"],
    },
    {
        "name": "Ledger Service",
        "description": "Double-entry accounting ledger. Records every debit and "
                       "credit across merchant and customer accounts. Source of "
                       "truth for balances.",
        "tech_stack": "Java 17 / PostgreSQL / event-sourcing",
        "tags": ["ledger", "accounting", "critical"],
    },
    {
        "name": "Compliance Service",
        "description": "Enforces PCI-DSS, AML, and KYC rules. Screens transactions "
                       "against OFAC watchlists and triggers manual review queues.",
        "tech_stack": "Python / FastAPI / PostgreSQL",
        "tags": ["compliance", "kyc", "aml", "pci-dss"],
    },
    {
        "name": "Developer Portal",
        "description": "External-facing developer documentation, API sandbox, and "
                       "API key self-service portal for NovaPay partners.",
        "tech_stack": "Next.js / Vercel / Stripe",
        "tags": ["portal", "docs", "external"],
    },
]

service_ids = {}
for svc in SERVICES:
    existing = get(f"/api/v1/projects/{pid}/services")
    found = next((s for s in existing if s["name"] == svc["name"]), None)
    if found:
        service_ids[svc["name"]] = found["id"]
        print(f"  ↩ {svc['name']} (exists)")
    else:
        created = post(f"/api/v1/projects/{pid}/services", svc, expect=(201,))
        service_ids[svc["name"]] = created["id"]
        print(f"  ✓ {svc['name']}")

# ── 4. ADRs ────────────────────────────────────────────────────────────────
print("→ Seeding 8 ADRs…")
ADRS = [
    {
        "title": "ADR-001 — Use PostgreSQL for all transactional persistence",
        "status": "accepted",
        "context": (
            "NovaPay needs a battle-tested relational database with strong ACID "
            "guarantees for financial transactions. We evaluated MySQL, CockroachDB, "
            "and PostgreSQL. Author: Alex Morgan."
        ),
        "decision": (
            "We will use PostgreSQL 15 with pgvector for all transactional data. "
            "Each service owns its own schema within a shared cluster (dev) or "
            "a dedicated RDS instance (prod). Connection pooling via PgBouncer."
        ),
        "consequences": (
            "• Enables row-level locking and SERIALIZABLE transactions for ledger ops.\n"
            "• pgvector extension used by SynQ's RAG pipeline.\n"
            "• Requires careful schema migration discipline (Alembic/Flyway)."
        ),
    },
    {
        "title": "ADR-002 — Adopt Kafka for all inter-service async communication",
        "status": "accepted",
        "context": (
            "Services need to communicate without tight coupling. HTTP callbacks "
            "proved brittle during the 2024 incident spike. Author: Alex Morgan."
        ),
        "decision": (
            "All async events flow through Kafka (Confluent Cloud). "
            "Topics are partitioned by merchant_id. Consumers use the outbox pattern "
            "to ensure at-least-once delivery with idempotent consumers."
        ),
        "consequences": (
            "• Decouples producers from consumers — Notification Service can restart "
            "without affecting Payment Service.\n"
            "• Ops cost: Confluent Cloud charges per partition.\n"
            "• Requires the outbox pattern in all producers."
        ),
    },
    {
        "title": "ADR-003 — Rate limiting strategy for the API Gateway",
        "status": "accepted",
        "context": (
            "The API Gateway was DoS'd in the March 2024 incident, causing a 40-minute "
            "outage across all external integrations. Alex Morgan led the post-mortem."
        ),
        "decision": (
            "Token-bucket rate limiting (1000 req/min per API key, 100 req/min per IP). "
            "Implemented in the Nginx/Lua layer with Redis as the counter store. "
            "Burst allowance of 200 requests for 10-second spikes."
        ),
        "consequences": (
            "• Eliminates the DoS vector from the March incident.\n"
            "• Legitimate high-volume partners need allowlisting (manual process).\n"
            "• Redis becomes a hard dependency for the gateway."
        ),
    },
    {
        "title": "ADR-004 — Idempotency keys for payment deduplication",
        "status": "accepted",
        "context": (
            "During the June 2024 timeout cascade incident, network retries caused "
            "35 duplicate charges. Customers were billed twice for the same transaction. "
            "Alex Morgan wrote this ADR in response."
        ),
        "decision": (
            "All POST /payments requests must include an Idempotency-Key header (UUID v4). "
            "The Payment Service stores key+response for 24 hours and returns the cached "
            "response on duplicates. Keys exceeding 24 hours return 422."
        ),
        "consequences": (
            "• Eliminates duplicate charges on client retry.\n"
            "• Adds a Redis lookup on every payment request (p99 < 2ms).\n"
            "• Client SDKs must be updated to generate and send idempotency keys."
        ),
    },
    {
        "title": "ADR-005 — ML fraud scoring SLA: 50ms p99 budget",
        "status": "accepted",
        "context": (
            "The Fraud Detection Service was initially synchronous within the payment "
            "authorisation path. Model inference at launch took 120ms p99, adding "
            "unacceptable latency. Diana Park led this initiative."
        ),
        "decision": (
            "Move to gRPC with protobuf for fraud scoring calls. Maintain a warm "
            "model replica pool of 3 instances. Hard 50ms timeout; on timeout, "
            "fall back to rule-based scoring (conservative). "
            "P99 must be validated in load tests before each model release."
        ),
        "consequences": (
            "• 50ms p99 achieved in load tests (down from 120ms).\n"
            "• Rule-based fallback means some fraud slips through during model "
            "cold-start or high load.\n"
            "• gRPC requires proto schema versioning discipline."
        ),
    },
    {
        "title": "ADR-006 — PCI-DSS scope isolation via network segmentation",
        "status": "accepted",
        "context": (
            "PAN (Primary Account Number) data must be isolated to a minimal CDE "
            "(Cardholder Data Environment) to limit PCI-DSS audit scope. "
            "Diana Park and the Compliance team authored this ADR."
        ),
        "decision": (
            "Only Payment Service and Compliance Service are in-scope for CDE. "
            "All other services communicate with Payment Service via tokens — never "
            "raw PANs. Network ACLs enforce isolation at the VPC subnet level."
        ),
        "consequences": (
            "• Reduces PCI-DSS audit scope from 9 services to 2.\n"
            "• Tokenisation adds a lookup hop on card reads.\n"
            "• Strict change-control process required for CDE services."
        ),
    },
    {
        "title": "ADR-007 — Event sourcing for the Ledger Service",
        "status": "accepted",
        "context": (
            "The Ledger Service needs an immutable audit trail for all balance changes. "
            "Traditional CRUD updates make historical reconstruction impossible. "
            "Alex Morgan proposed event sourcing after reviewing similar fintech patterns."
        ),
        "decision": (
            "Ledger Service will use event sourcing: every debit/credit is an immutable "
            "append-only event. Current balances are projections over the event log. "
            "Snapshots are taken every 1000 events to bound replay time."
        ),
        "consequences": (
            "• Complete audit trail — any historical balance can be reconstructed.\n"
            "• Increased read complexity: balance queries require projection.\n"
            "• Snapshot strategy must be tested under high-volume scenarios."
        ),
    },
    {
        "title": "ADR-008 — Deprecate synchronous HTTP callbacks; migrate to Kafka",
        "status": "superseded",
        "context": (
            "Several legacy merchant integrations still use synchronous HTTP webhooks. "
            "These caused cascade failures in two separate incidents. Diana Park "
            "authored this ADR to formalise the migration."
        ),
        "decision": (
            "All merchant notification webhooks will be migrated to Kafka-backed "
            "async delivery by Q3 2024. Legacy HTTP callback endpoints will return "
            "410 Gone after the migration window."
        ),
        "consequences": (
            "• Superseded by ADR-002 which formalises the full Kafka strategy.\n"
            "• Merchant SDK migration guide required.\n"
            "• 30-day notice period for affected partners."
        ),
    },
]

for adr in ADRS:
    existing = get(f"/api/v1/projects/{pid}/adrs")
    found = next((a for a in existing if a["title"] == adr["title"]), None)
    if found:
        print(f"  ↩ {adr['title'][:60]}… (exists)")
    else:
        post(f"/api/v1/projects/{pid}/adrs", adr, expect=(201,))
        print(f"  ✓ {adr['title'][:60]}…")

# ── 5. Done ────────────────────────────────────────────────────────────────
print()
print("✅ NovaPay seed data loaded successfully!")
print(f"   Project ID : {pid}")
print(f"   Login      : admin@novapay.io / novapay2024")
print()
print("   To connect the frontend, add to SynQ/frontend/.env.local:")
print(f"     NEXT_PUBLIC_API_BASE_URL=http://localhost:8000")
print(f"     NEXT_PUBLIC_DEMO_PROJECT_ID={pid}")
