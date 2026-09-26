#!/usr/bin/env python3
"""
NovaPay demo seed script.

Populates a fresh SynQ database with the full NovaPay demo dataset:
  - 1 admin user  (admin@novapay.com  / novapay2026)
  - 1 project     (NovaPay Platform)
  - 9 services
  - 8 ADRs  (with full context/decision/consequences text)
  - 4 reference documents (plain-text, embedded via Gemini)

Usage
-----
    # From the backend/ directory with .env populated:
    python scripts/seed_demo.py

    # Skip embedding (useful when GOOGLE_API_KEY is not yet set):
    python scripts/seed_demo.py --no-embed

The script is idempotent: if the admin user already exists it stops early.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

# ── ensure backend/ is on sys.path when run directly ──────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import hash_password
from app.models import *  # noqa: F401,F403 — registers all ORM metadata
from app.models.adr import Adr, adr_services
from app.models.document import Document
from app.models.project import Project
from app.models.service import Service
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("seed")

# ─── Admin credentials ────────────────────────────────────────────────────────
ADMIN_EMAIL = "admin@novapay.com"
ADMIN_PASSWORD = "novapay2026"
ADMIN_NAME = "Alex Morgan"

# ─── Services ─────────────────────────────────────────────────────────────────
SERVICES = [
    {
        "name": "Payment Service",
        "description": (
            "Core payment processing engine responsible for initiating, validating, "
            "and settling payment transactions. Integrates with Stripe and Adyen via "
            "circuit-breaker wrappers. Publishes payment lifecycle events to Kafka. "
            "PCI DSS Level 1 compliant. Handles ~2,400 TPS at peak."
        ),
        "tech_stack": "Node.js, PostgreSQL, Redis, Kafka, Stripe SDK, Adyen SDK",
        "tags": ["payments", "pci", "kafka", "critical"],
    },
    {
        "name": "Auth Gateway",
        "description": (
            "Rust-based authentication and authorisation gateway. Validates JWTs, "
            "performs Redis session lookups, and enforces RBAC on every API request. "
            "p99 latency: 2.3 ms. Rewrote from Node.js per ADR-038."
        ),
        "tech_stack": "Rust (Axum), Redis, JWT, PostgreSQL",
        "tags": ["auth", "security", "rust", "critical"],
    },
    {
        "name": "Order Service",
        "description": (
            "Manages the full order lifecycle: creation, state transitions "
            "(pending → confirmed → fulfilled → cancelled), and order history queries. "
            "Consumes payment-events from Kafka. Migration to PostgreSQL proposed in ADR-051."
        ),
        "tech_stack": "Go, MongoDB, Kafka",
        "tags": ["orders", "kafka", "state-machine"],
    },
    {
        "name": "User Profile Service",
        "description": (
            "Stores and serves customer profile data including KYC status, "
            "preferences, saved payment methods (tokenised), and communication opt-ins."
        ),
        "tech_stack": "Node.js, PostgreSQL, Redis",
        "tags": ["profiles", "kyc", "pii"],
    },
    {
        "name": "Notification Service",
        "description": (
            "Dispatches transactional emails and push notifications for payment "
            "confirmations, fraud alerts, and order updates. "
            "Built on an event-driven architecture consuming from Kafka."
        ),
        "tech_stack": "Python, Kafka, SendGrid, Firebase Cloud Messaging",
        "tags": ["notifications", "kafka", "email", "push"],
    },
    {
        "name": "Fraud Detection Service",
        "description": (
            "Real-time fraud scoring for every payment initiation. "
            "Replaced heuristic rule engine with gradient-boosted ML model (ADR-049). "
            "False positive rate reduced from 12% to 1.8%. "
            "Model retrained bi-weekly on 18 months of transaction history."
        ),
        "tech_stack": "Python, scikit-learn, Redis, Kafka, PostgreSQL",
        "tags": ["fraud", "ml", "payments", "critical"],
    },
    {
        "name": "Analytics Pipeline",
        "description": (
            "Real-time and batch analytics pipeline. "
            "Streams payment and order events from Kafka into ClickHouse for OLAP queries. "
            "ClickHouse adopted per ADR-033. "
            "Powers the merchant dashboard and finance reporting."
        ),
        "tech_stack": "Python (Kafka Streams), ClickHouse, Apache Spark, PostgreSQL",
        "tags": ["analytics", "clickhouse", "kafka", "spark"],
    },
    {
        "name": "API Gateway",
        "description": (
            "Public-facing reverse proxy and rate-limiter. "
            "Terminates TLS, enforces rate limits, routes to internal services, "
            "and integrates with Auth Gateway for token validation."
        ),
        "tech_stack": "Go, Nginx, Redis",
        "tags": ["gateway", "rate-limiting", "routing"],
    },
    {
        "name": "Merchant Dashboard",
        "description": (
            "React SPA providing merchants with real-time transaction analytics, "
            "dispute management, refund initiation, and settlement reporting. "
            "Backed by Analytics Pipeline and Payment Service APIs."
        ),
        "tech_stack": "React, TypeScript, Node.js (BFF), PostgreSQL",
        "tags": ["frontend", "merchant", "analytics"],
    },
]

# ─── ADRs ─────────────────────────────────────────────────────────────────────
ADRS = [
    {
        "ref": "ADR-042",
        "title": "Use Kafka for async payment event streaming instead of REST callbacks",
        "status": "accepted",
        "decided_at": datetime(2026, 7, 14, tzinfo=timezone.utc),
        "services": ["Payment Service", "Order Service", "Analytics Pipeline"],
        "context": textwrap.dedent("""\
            REST callbacks introduced synchronous coupling between Payment Service
            and Order Service. During INC-127, a 2-second Stripe webhook timeout
            cascaded into a 23% checkout failure rate across the platform.

            Direct synchronous calls also made it impossible to replay events after
            a consumer outage, leading to lost order-state transitions that required
            manual reconciliation.
        """),
        "decision": textwrap.dedent("""\
            Adopt Kafka as the event bus for all payment lifecycle events.

            - Payment Service publishes to the 'payment-events' topic upon every
              state transition (initiated, authorised, captured, failed, refunded).
            - Order Service and Analytics Pipeline consume asynchronously.
            - Dead-Letter Queue (DLQ) configured for failed consumers with 3-retry
              exponential backoff.
            - Replay capability via topic retention of 7 days.
        """),
        "consequences": textwrap.dedent("""\
            Operational complexity increases — Kafka cluster management,
            consumer lag monitoring, and DLQ handling all become required capabilities.

            Eventual consistency window of 50–200 ms introduced for order status
            updates downstream. This is acceptable for the merchant dashboard
            use case but must be documented for SLA purposes.

            All new inter-service payment flows MUST use the Kafka event bus.
            Synchronous REST callbacks to order-related services are prohibited.
        """),
    },
    {
        "ref": "ADR-038",
        "title": "Adopt Rust for Auth Gateway to reduce p99 latency below 5 ms",
        "status": "accepted",
        "decided_at": datetime(2026, 6, 3, tzinfo=timezone.utc),
        "services": ["Auth Gateway"],
        "context": textwrap.dedent("""\
            Auth Gateway sits in the hot path of every authenticated API request.
            The existing Node.js implementation was contributing 40 ms+ to p99
            latency under load, primarily due to GC pauses in V8.

            Profiling showed ~60% of p99 variance came from GC stop-the-world
            events, not from business logic or I/O.
        """),
        "decision": textwrap.dedent("""\
            Rewrite Auth Gateway in Rust using the Axum framework.

            - JWT validation and Redis session lookup are the primary hot paths.
            - Memory allocations in the hot path eliminated via arena allocators.
            - Process is always-warm (no cold starts).
            - Deployable as a single statically-linked binary.
        """),
        "consequences": textwrap.dedent("""\
            The team must maintain Rust expertise — at least two engineers must be
            comfortable with Rust ownership and async patterns (tokio).

            p99 latency achieved: 2.3 ms (down from 43 ms).
            Memory footprint reduced 8x vs the Node.js predecessor.

            Future contributors must not introduce heap allocations in the JWT
            validation hot path without a performance review.
        """),
    },
    {
        "ref": "ADR-051",
        "title": "Migrate Order Service from MongoDB to PostgreSQL",
        "status": "proposed",
        "decided_at": datetime(2026, 9, 10, tzinfo=timezone.utc),
        "services": ["Order Service"],
        "context": textwrap.dedent("""\
            MongoDB's flexible schema allowed inconsistent order documents to be
            persisted, causing failures in the order state machine during high
            concurrency. Three incidents in Q3 2026 were directly attributable to
            missing required fields on order documents.

            Multi-document transactions in MongoDB add 30–50% latency overhead
            due to WiredTiger locking behaviour under our write patterns.
        """),
        "decision": textwrap.dedent("""\
            Migrate Order Service to PostgreSQL with a strictly typed schema.

            - Use PostgreSQL advisory locks for order state transitions to prevent
              concurrent invalid state changes.
            - Migration plan: dual-write phase (8 weeks) → read from PostgreSQL
              → decommission MongoDB.
            - All ORDER state machine transitions must go through a single
              idempotent state-change stored procedure.
        """),
        "consequences": textwrap.dedent("""\
            Estimated migration effort: 3 sprints (6 weeks).
            Dual-write phase introduces temporary write amplification.

            PostgreSQL provides ACID guarantees for state transitions,
            eliminating the class of incident caused by partial document writes.

            MongoDB cluster can be decommissioned after successful migration,
            reducing infrastructure cost by ~$800/month.
        """),
    },
    {
        "ref": "ADR-029",
        "title": "Implement circuit breaker pattern for all external payment providers",
        "status": "accepted",
        "decided_at": datetime(2026, 4, 22, tzinfo=timezone.utc),
        "services": ["Payment Service"],
        "context": textwrap.dedent("""\
            Direct calls to Stripe and Adyen had no failure isolation.
            During a 30-second Stripe provider outage in February 2026,
            the entire checkout flow became unavailable because every request
            blocked waiting for Stripe timeouts.

            No fallback routing existed — Adyen was available during the outage
            but was not attempted.
        """),
        "decision": textwrap.dedent("""\
            Implement a circuit breaker wrapper around all external payment provider calls.

            - Half-open state probes every 30 s after a trip.
            - Fallback routing: if Stripe circuit is open, route to Adyen.
            - Exponential backoff with jitter on retries before circuit trips.
            - All new payment provider integrations MUST use the wrapper.
            - Bypassing the circuit breaker is a blocking PR review comment.
        """),
        "consequences": textwrap.dedent("""\
            During the next provider outage (INC-134), fallback routing to Adyen
            was triggered automatically and checkout failure rate remained below 0.5%.
            Circuit breaker pattern reduced blast radius by 94%.

            Adds ~2 ms overhead per payment call due to state checks.
            Provider-level circuit metrics must be added to the payments Grafana dashboard.
        """),
    },
    {
        "ref": "ADR-055",
        "title": "Standardise service-to-service authentication on mTLS",
        "status": "draft",
        "decided_at": datetime(2026, 9, 18, tzinfo=timezone.utc),
        "services": ["Auth Gateway", "Payment Service", "Order Service"],
        "context": textwrap.dedent("""\
            API keys are currently used for service-to-service authentication.
            Keys are rotated manually on a 90-day schedule.

            Two incidents (INC-138, INC-142) involved leaked API keys causing
            unauthorised access attempts. Manual rotation is operationally
            error-prone and creates a long window of exposure.
        """),
        "decision": textwrap.dedent("""\
            Deploy cert-manager to Kubernetes to issue short-lived mTLS certificates
            (24-hour TTL) for all internal service communication.

            - All new inter-service calls must use mTLS from day 1 of rollout.
            - Existing API keys deprecated over a 6-month sunset window.
            - Certificate issuance automated via cert-manager + Let's Encrypt (internal CA).
        """),
        "consequences": textwrap.dedent("""\
            All services must be updated to present client certificates.
            Certificate rotation is automatic — no manual intervention required.

            Zero-trust posture: even a compromised internal network cannot spoof
            service identities without a valid certificate signed by our CA.

            6-month dual-run period required while API keys are phased out.
        """),
    },
    {
        "ref": "ADR-033",
        "title": "Use ClickHouse as OLAP store for analytics workloads",
        "status": "accepted",
        "decided_at": datetime(2026, 5, 8, tzinfo=timezone.utc),
        "services": ["Analytics Pipeline"],
        "context": textwrap.dedent("""\
            Analytics aggregations were running directly against the primary
            PostgreSQL replica, causing lock contention and query times exceeding
            30 seconds for cross-day revenue aggregations.

            The analytics team's workload characteristics (high column cardinality,
            large scans, GROUP BY aggregations) are a poor fit for row-oriented storage.
        """),
        "decision": textwrap.dedent("""\
            Introduce ClickHouse as the dedicated OLAP store.

            - Kafka Streams pipeline materialises payment and order events into
              ClickHouse tables in near-real-time (target lag <500 ms).
            - All analytics queries routed to ClickHouse exclusively.
            - PostgreSQL replica relieved of analytics workload entirely.
        """),
        "consequences": textwrap.dedent("""\
            Analytics queries now complete in under 500 ms (down from 30+ s).
            Reports are near-real-time with <500 ms replication lag from PostgreSQL.

            ClickHouse cluster requires dedicated operational expertise.
            Schema changes require coordinated migration across both PostgreSQL
            and ClickHouse schemas.
        """),
    },
    {
        "ref": "ADR-047",
        "title": "Use idempotency keys for payment deduplication instead of DB locks",
        "status": "accepted",
        "decided_at": datetime(2026, 8, 5, tzinfo=timezone.utc),
        "services": ["Payment Service"],
        "context": textwrap.dedent("""\
            Database-level locking for payment deduplication caused deadlocks
            under concurrent retry storms — specifically when clients retried
            on network failures while the original request was still processing.

            PCI DSS requires idempotent payment processing to prevent double charges.
        """),
        "decision": textwrap.dedent("""\
            Require clients to supply a UUID idempotency key per payment initiation.

            - Keys expire after 24 hours.
            - Responses for duplicate submissions are returned unchanged from cache.
            - SDK updated with automatic idempotency key generation using UUID v4.
            - Idempotency keys stored in Redis with 24-hour TTL.
        """),
        "consequences": textwrap.dedent("""\
            Clients must generate and persist idempotency keys before initiating payment.
            SDK handles this transparently for standard integrations.

            Deadlock rate dropped to zero after rollout.
            Redis dependency introduced for idempotency key storage — must be
            treated as a critical dependency with appropriate HA configuration.
        """),
    },
    {
        "ref": "ADR-049",
        "title": "Fraud Detection migrates from rule engine to ML model",
        "status": "accepted",
        "decided_at": datetime(2026, 8, 22, tzinfo=timezone.utc),
        "services": ["Fraud Detection Service", "Payment Service"],
        "context": textwrap.dedent("""\
            The heuristic rule engine for fraud detection had a 12% false positive
            rate, flagging legitimate transactions and causing significant customer
            churn. INC-141 confirmed that the rule engine's geo-anomaly heuristic
            was responsible for blocking transactions from legitimate international
            customers.

            Rules required manual tuning by domain experts and could not adapt to
            evolving fraud patterns without a deployment.
        """),
        "decision": textwrap.dedent("""\
            Deploy gradient-boosted ML model trained on 18 months of transaction history.

            - Feature set: transaction amount, velocity, geo-distance, device fingerprint,
              merchant category, time-of-day patterns.
            - Rollout via feature flag: 5% → 25% → 100% over 3 weeks.
            - Shadow-mode evaluation for 2 weeks before cutover to validate parity.
            - Model retrained bi-weekly on rolling 18-month window.
        """),
        "consequences": textwrap.dedent("""\
            False positive rate reduced from 12% to 1.8%.
            Model requires bi-weekly retraining pipeline with automated validation gates.

            Cold-start problem during feature flag rollout mitigated by shadow-mode
            evaluation. If model performance degrades below 3% false positive rate,
            automatic rollback to rule engine triggers via feature flag.

            Explainability requirement: every fraud block must produce a human-readable
            reason code for customer support use.
        """),
    },
]

# ─── Reference documents ─────────────────────────────────────────────────────
DOCUMENTS = [
    {
        "filename": "payments-engineering-runbook.md",
        "content": textwrap.dedent("""\
            # Payments Engineering On-Call Runbook

            ## Scope
            This runbook covers common Payment Service incidents, triage procedures,
            and escalation paths for the on-call engineer.

            ## High-Priority Alerts

            ### PAY-001: Payment Success Rate < 95%
            **Severity**: Critical
            **First response**: Check Stripe/Adyen circuit breaker status in Grafana.
            If circuit is open, confirm fallback routing to secondary provider is active.
            Escalate to Payments Engineering lead within 15 minutes if failure rate
            continues declining.

            ### PAY-002: Kafka Consumer Lag > 10,000 messages
            **Severity**: High
            **First response**: Check consumer group `payment-events-order-svc` lag.
            Restart consumer pods if lag is growing. If topic offset is stale,
            check for DLQ overflow and notify platform team.

            ### PAY-003: Idempotency Redis OOM
            **Severity**: High
            **First response**: Check Redis memory utilisation dashboard.
            Trigger manual eviction of expired keys if memory > 85%.
            Escalate to Infrastructure team if eviction does not reduce memory within 10 minutes.

            ## Rollback Procedures

            ### Feature Flag Rollback (Fraud ML Model)
            1. Open LaunchDarkly dashboard → `fraud-ml-model` flag.
            2. Set flag to 0% targeting to revert to rule engine.
            3. Notify Fraud Detection team lead immediately.
            4. Open incident if customer-facing impact confirmed.

            ## Escalation Contacts
            - Payments Engineering Lead: Alex Morgan (PagerDuty: alex-morgan)
            - Platform Security: James Wu (PagerDuty: james-wu)
            - Infrastructure On-Call: (PagerDuty rotation: infra-oncall)
        """),
    },
    {
        "filename": "kafka-cluster-configuration-guide.md",
        "content": textwrap.dedent("""\
            # Kafka Cluster Configuration Guide

            ## Topic Naming Convention
            All topics follow the pattern: `{domain}-{entity}-{event-type}`

            Examples:
            - payment-events          (all payment lifecycle events)
            - order-state-changes     (order state machine transitions)
            - fraud-scores            (fraud model output)
            - notification-dispatch   (notification requests)

            ## Partition Strategy
            - payment-events: 24 partitions (keyed by customer_id for ordering)
            - order-state-changes: 12 partitions (keyed by order_id)
            - All other topics: 6 partitions unless volume analysis indicates otherwise

            ## Retention Policies
            - payment-events: 7 days (replay window for Order Service recovery)
            - fraud-scores: 3 days
            - notification-dispatch: 1 day

            ## Consumer Group Management
            Consumer group IDs must follow: `{service-name}-{topic-name}-consumer`
            Example: `order-svc-payment-events-consumer`

            Never share consumer groups across services — it creates hidden coupling.

            ## Dead Letter Queue (DLQ)
            All consumers must configure a DLQ topic: `{original-topic}-dlq`
            DLQ messages are retried with 3x exponential backoff (1s, 2s, 4s).
            Unprocessed DLQ messages after 48 hours trigger PagerDuty alert.

            ## Monitoring
            Key metrics to watch in Grafana:
            - consumer_lag (per consumer group)
            - producer_error_rate
            - partition_leader_election_rate (should be near 0 in normal operation)
        """),
    },
    {
        "filename": "service-ownership-charter.md",
        "content": textwrap.dedent("""\
            # Service Ownership Charter

            ## Principles
            Every service in the NovaPay platform must have a designated owning team
            and a named on-call rotation. Unowned services are a reliability risk.

            ## Owner Responsibilities
            1. **Availability SLA**: Own the uptime target and be accountable for SLO breaches.
            2. **On-call rotation**: Maintain a functional PagerDuty rotation.
            3. **Documentation**: Keep the service runbook current (review quarterly).
            4. **Dependency changes**: Notify downstream consumers 2 weeks before
               breaking interface changes.
            5. **Incident response**: First responder for P1/P2 incidents affecting
               owned service, available within 15 minutes during business hours.

            ## Handover Protocol
            When an engineer leaves or transfers teams:
            1. Update service ownership in the SynQ registry within 5 business days.
            2. Shadow on-call with new owner for one full rotation.
            3. Review and update runbook with new owner.
            4. Transfer PagerDuty schedule.

            ## Escalation Matrix
            - P1 (Critical): 15 min response, VP Engineering notified at 30 min.
            - P2 (High): 1 hour response.
            - P3 (Medium): Next business day.
            - P4 (Low): Best effort within sprint.

            ## Service Tiers
            - **Tier 1 (Critical)**: Payment Service, Auth Gateway, Fraud Detection Service
            - **Tier 2 (Core)**: Order Service, API Gateway, User Profile Service
            - **Tier 3 (Supporting)**: Analytics Pipeline, Notification Service, Merchant Dashboard
        """),
    },
    {
        "filename": "zero-trust-network-architecture-spec.md",
        "content": textwrap.dedent("""\
            # Zero-Trust Network Architecture Specification

            ## Objective
            Eliminate implicit trust between internal services. All service-to-service
            communication must be authenticated and encrypted using mTLS by end of Q1 2027.

            ## Current State
            - API keys for service-to-service auth (90-day manual rotation)
            - No mutual authentication — services cannot verify caller identity
            - Two incidents in 2026 involved leaked API keys (INC-138, INC-142)

            ## Target Architecture

            ### Certificate Infrastructure
            - cert-manager deployed to Kubernetes cluster
            - Internal CA issued by HashiCorp Vault PKI secrets engine
            - Certificate TTL: 24 hours (automatic rotation)
            - Leaf certificates identify each service by SPIFFE ID:
              `spiffe://novapay.internal/ns/production/sa/{service-name}`

            ### mTLS Configuration
            - All Kubernetes services annotated with cert-manager issuer
            - Istio service mesh enforces mTLS in STRICT mode per namespace
            - External traffic terminates at API Gateway (TLS only, not mTLS)

            ### Migration Timeline
            | Sprint | Action |
            |--------|--------|
            | Q4 2026 Sprint 1 | Deploy cert-manager + internal CA |
            | Q4 2026 Sprint 2 | Auth Gateway + Payment Service mTLS |
            | Q4 2026 Sprint 3 | Order Service + Fraud Detection mTLS |
            | Q1 2027 Sprint 1 | Remaining services + API key sunset begins |
            | Q1 2027 Sprint 4 | API key sunset complete, mTLS enforced cluster-wide |

            ## Security Controls
            - Certificate revocation via OCSP stapling
            - Anomalous certificate usage triggers automatic revocation
            - All mTLS handshake failures logged and alerted on
        """),
    },
]


# ─── Seed logic ───────────────────────────────────────────────────────────────

async def seed(embed: bool) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as db:
        # ── Idempotency check ──────────────────────────────────────────────
        existing = await db.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if existing:
            log.info("Admin user already exists — seed already applied. Exiting.")
            return

        # ── 1. Create admin user ───────────────────────────────────────────
        log.info("Creating admin user: %s", ADMIN_EMAIL)
        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_NAME,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.flush()

        # ── 2. Create project ──────────────────────────────────────────────
        log.info("Creating project: NovaPay Platform")
        project = Project(
            name="NovaPay Platform",
            description=(
                "Core payment processing and commerce platform for NovaPay. "
                "Handles payment initiation, fraud detection, order management, "
                "and real-time analytics for merchant customers."
            ),
            owner_id=admin.id,
        )
        db.add(project)
        await db.flush()

        # ── 3. Create services ─────────────────────────────────────────────
        log.info("Creating %d services...", len(SERVICES))
        service_map: dict[str, Service] = {}
        for s in SERVICES:
            svc = Service(
                name=s["name"],
                description=s["description"],
                tech_stack=s["tech_stack"],
                tags=s["tags"],
                project_id=project.id,
            )
            db.add(svc)
            await db.flush()
            service_map[s["name"]] = svc
            log.info("  + Service: %s", s["name"])

        # ── 4. Create ADRs + link to services ──────────────────────────────
        log.info("Creating %d ADRs...", len(ADRS))
        for a in ADRS:
            adr = Adr(
                title=a["title"],
                status=a["status"],
                context=a["context"],
                decision=a["decision"],
                consequences=a["consequences"],
                decided_at=a["decided_at"],
                project_id=project.id,
            )
            db.add(adr)
            await db.flush()

            # link to services via join table
            for svc_name in a["services"]:
                if svc_name in service_map:
                    await db.execute(
                        adr_services.insert().values(
                            adr_id=adr.id,
                            service_id=service_map[svc_name].id,
                        )
                    )
            log.info("  + ADR: %s", a["ref"])

        # ── 5. Create documents (+ embed if requested) ─────────────────────
        log.info("Creating %d reference documents...", len(DOCUMENTS))
        for d in DOCUMENTS:
            content_bytes = d["content"].encode("utf-8")

            if embed:
                from app.ingestion.pipeline import ingest_document
                doc = await ingest_document(
                    db=db,
                    project_id=project.id,
                    filename=d["filename"],
                    mime_type="text/plain",
                    data=content_bytes,
                )
                log.info("  + Document (embedded): %s  [%s]", d["filename"], doc.id)
            else:
                doc = Document(
                    filename=d["filename"],
                    mime_type="text/plain",
                    project_id=project.id,
                )
                db.add(doc)
                await db.flush()
                log.info("  + Document (no embed): %s  [%s]", d["filename"], doc.id)

        await db.commit()
        log.info("✅  Seed complete.")
        log.info("   Project ID : %s", project.id)
        log.info("   Admin email: %s", ADMIN_EMAIL)
        log.info("   Password   : %s", ADMIN_PASSWORD)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed SynQ with NovaPay demo data.")
    parser.add_argument(
        "--no-embed",
        action="store_true",
        help="Skip Gemini embedding (useful when GOOGLE_API_KEY is not set)",
    )
    args = parser.parse_args()

    asyncio.run(seed(embed=not args.no_embed))


if __name__ == "__main__":
    main()
