#!/usr/bin/env python3
"""Seed company-linked project, employee, and incident demo data.

Run from the backend container with:
    python scripts/seed_company_data.py

The script is idempotent and does not create authentication accounts for
employee profiles.
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import Company, Employee, Incident, Project, Service, User


COMPANIES = [
    {
        "name": "NovaPay",
        "industry": "Financial Technology",
        "description": "Digital payments platform for merchants, including payment processing, fraud controls, settlement, and analytics.",
        "projects": [
            {
                "name": "NovaPay Platform",
                "description": "Core fintech payments platform for payment processing, fraud detection, authentication, and reporting.",
                "services": [
                    ("Payment Service", "Processes and settles merchant payments.", "Node.js, PostgreSQL, Kafka", ["payments", "critical"]),
                    ("Analytics Pipeline", "Consumes payment events and builds operational analytics.", "Python, Kafka, ClickHouse", ["analytics", "events"]),
                ],
            },
            {
                "name": "NovaPay Merchant Operations",
                "description": "Merchant onboarding, account operations, and settlement reconciliation.",
                "services": [
                    ("Merchant Portal", "Manages merchant onboarding and account profiles.", "Next.js, FastAPI, PostgreSQL", ["merchant", "onboarding"]),
                    ("Settlement Service", "Calculates settlement batches and reconciles payout status.", "Python, PostgreSQL, Kafka", ["settlement", "payments"]),
                ],
            },
        ],
        "employees": [
            ("Alex Morgan", "alex.morgan@novapay.com", "Senior Backend Engineer", "Payments Engineering", "Node.js, Kafka, PostgreSQL, Stripe", True),
            ("Priya Nair", "priya.nair@novapay.com", "Staff Engineer", "Commerce Platform", "Go, PostgreSQL, Redis, architecture", True),
            ("James Wu", "james.wu@novapay.com", "Principal Security Engineer", "Platform Security", "Rust, zero trust, mTLS, JWT", False),
            ("Sofia Reyes", "sofia.reyes@novapay.com", "Backend Engineer", "Merchant Operations", "Python, settlement, PostgreSQL", True),
            ("Liam Foster", "liam.foster@novapay.com", "Fraud Platform Engineer", "Risk Engineering", "Python, machine learning, Redis", False),
            ("Nina Park", "nina.park@novapay.com", "Payments SRE", "Platform Reliability", "Kubernetes, observability, PostgreSQL", True),
            ("Ethan Cole", "ethan.cole@novapay.com", "Frontend Engineer", "Merchant Experience", "React, TypeScript, accessibility", False),
            ("Ravi Menon", "ravi.menon@novapay.com", "Data Engineer", "Payment Analytics", "Kafka, Python, ClickHouse", True),
        ],
    },
    {
        "name": "Acme Health",
        "industry": "Healthcare Technology",
        "description": "Healthcare software company focused on patient care coordination, clinical records, and secure provider interoperability.",
        "projects": [
            {
                "name": "Acme Care Platform",
                "description": "Clinical workflows and patient care coordination for provider organizations.",
                "services": [
                    ("Patient Records", "Maintains longitudinal patient records and care plans.", "Java, PostgreSQL, FHIR", ["clinical", "patient-data"]),
                    ("Appointment Service", "Schedules visits and coordinates provider availability.", "Python, Redis, PostgreSQL", ["scheduling", "care"]),
                ],
            },
            {
                "name": "Acme Clinical Data Exchange",
                "description": "Secure exchange of clinical data with partner providers.",
                "services": [
                    ("FHIR Gateway", "Validates and routes FHIR resources to connected providers.", "Java, Kafka, PostgreSQL", ["fhir", "interop"]),
                    ("Consent Manager", "Tracks patient permissions for clinical data sharing.", "Go, PostgreSQL", ["privacy", "consent"]),
                ],
            },
        ],
        "employees": [
            ("Maya Chen", "maya.chen@acmehealth.example", "Clinical Systems Architect", "Care Platform", "FHIR, Java, clinical workflows", True),
            ("Daniel Brooks", "daniel.brooks@acmehealth.example", "Staff Backend Engineer", "Data Exchange", "PostgreSQL, Kafka, interoperability", True),
            ("Aisha Patel", "aisha.patel@acmehealth.example", "Privacy Engineer", "Trust and Compliance", "consent, HIPAA controls, audit systems", False),
            ("Omar Hassan", "omar.hassan@acmehealth.example", "Site Reliability Engineer", "Platform Operations", "Kubernetes, observability, incident response", True),
            ("Sienna Wright", "sienna.wright@acmehealth.example", "Clinical Product Engineer", "Care Platform", "FHIR, Java, care coordination", False),
            ("Lucas Martin", "lucas.martin@acmehealth.example", "Data Exchange Engineer", "Interoperability", "HL7, FHIR, Kafka", True),
            ("Fatima Noor", "fatima.noor@acmehealth.example", "Security Analyst", "Trust and Compliance", "threat modeling, audit, privacy", False),
            ("Ben Carter", "ben.carter@acmehealth.example", "Platform Engineer", "Platform Operations", "Kubernetes, Terraform, monitoring", True),
        ],
    },
    {
        "name": "Northstar Retail",
        "industry": "Retail and E-commerce",
        "description": "Omnichannel retailer building digital commerce, inventory visibility, and demand forecasting systems.",
        "projects": [
            {
                "name": "Northstar Commerce Platform",
                "description": "Digital storefront, catalog, cart, and order processing for retail customers.",
                "services": [
                    ("Catalog Service", "Manages product listings, pricing, and availability.", "Node.js, PostgreSQL, Redis", ["catalog", "commerce"]),
                    ("Checkout Service", "Coordinates cart validation, payment authorization, and order placement.", "Go, PostgreSQL, Kafka", ["checkout", "orders"]),
                ],
            },
            {
                "name": "Northstar Inventory Intelligence",
                "description": "Inventory visibility and replenishment planning across stores and warehouses.",
                "services": [
                    ("Inventory Service", "Tracks stock levels across stores and warehouses.", "Java, PostgreSQL, Kafka", ["inventory", "supply-chain"]),
                    ("Forecasting Pipeline", "Produces demand forecasts from sales and seasonal signals.", "Python, Spark, object storage", ["forecasting", "analytics"]),
                ],
            },
        ],
        "employees": [
            ("Erin Cole", "erin.cole@northstar.example", "Commerce Engineering Lead", "Digital Commerce", "e-commerce, Node.js, catalog systems", True),
            ("Marcus Lee", "marcus.lee@northstar.example", "Senior Backend Engineer", "Order Processing", "Go, Kafka, payment integrations", True),
            ("Talia Brooks", "talia.brooks@northstar.example", "Data Engineer", "Inventory Intelligence", "Python, Spark, forecasting", False),
            ("Dev Shah", "dev.shah@northstar.example", "Inventory Platform Engineer", "Supply Chain Systems", "Java, PostgreSQL, event streaming", True),
            ("Olivia Price", "olivia.price@northstar.example", "Pricing Engineer", "Digital Commerce", "Java, pricing systems, Redis", False),
            ("Andre Wilson", "andre.wilson@northstar.example", "Retail SRE", "Platform Reliability", "Kubernetes, Kafka, observability", True),
            ("Mei Lin", "mei.lin@northstar.example", "Applied Scientist", "Inventory Intelligence", "forecasting, Python, experimentation", False),
            ("Caleb Ross", "caleb.ross@northstar.example", "Fulfillment Engineer", "Order Processing", "Go, distributed systems, PostgreSQL", True),
        ],
    },
    {
        "name": "Contoso Logistics",
        "industry": "Transportation and Logistics",
        "description": "Logistics provider operating fleet, dispatch, and shipment tracking systems for business customers.",
        "projects": [
            {
                "name": "Contoso Fleet Operations",
                "description": "Fleet health, dispatch, driver operations, and vehicle maintenance workflows.",
                "services": [
                    ("Fleet Registry", "Maintains vehicle profiles, telemetry, and maintenance status.", "C#, SQL Server, Azure", ["fleet", "operations"]),
                    ("Dispatch Service", "Assigns drivers and vehicles to delivery routes.", "C#, PostgreSQL, Redis", ["dispatch", "routing"]),
                ],
            },
            {
                "name": "Contoso Shipment Tracking",
                "description": "Shipment milestones and customer-facing tracking across carrier integrations.",
                "services": [
                    ("Tracking API", "Serves shipment milestones from carrier and vehicle events.", "Go, PostgreSQL, Kafka", ["tracking", "api"]),
                    ("Event Normalizer", "Normalizes scan events from carrier integrations.", "Python, Kafka", ["events", "integration"]),
                ],
            },
        ],
        "employees": [
            ("Elena Garcia", "elena.garcia@contosologistics.example", "Fleet Systems Architect", "Fleet Operations", "C#, Azure, telemetry", True),
            ("Noah Kim", "noah.kim@contosologistics.example", "Dispatch Engineer", "Route Optimization", "routing, geospatial systems, Redis", True),
            ("Grace Turner", "grace.turner@contosologistics.example", "Integration Engineer", "Carrier Integrations", "Python, Kafka, event processing", False),
            ("Victor Chen", "victor.chen@contosologistics.example", "Reliability Engineer", "Platform Reliability", "PostgreSQL, observability, SRE", True),
            ("Isabel Flores", "isabel.flores@contosologistics.example", "Telematics Engineer", "Fleet Operations", "vehicle telemetry, Go, Kafka", False),
            ("Peter Novak", "peter.novak@contosologistics.example", "Cloud Platform Engineer", "Platform Reliability", "Azure, Kubernetes, Terraform", True),
            ("Amara Okafor", "amara.okafor@contosologistics.example", "Logistics Data Analyst", "Network Analytics", "SQL, Python, geospatial data", False),
            ("Jack Miller", "jack.miller@contosologistics.example", "Carrier Integration Lead", "Carrier Integrations", "EDI, APIs, event processing", True),
        ],
    },
]

EXTRA_SERVICES = {
    "NovaPay Platform": [
        ("Fraud Rules Engine", "Evaluates transaction risk signals and records explainable fraud decisions.", "Python, Redis, PostgreSQL", ["fraud", "risk"]),
        ("Webhook Relay", "Delivers signed payment lifecycle events to merchant endpoints with bounded retries.", "Go, Kafka, PostgreSQL", ["webhooks", "payments"]),
    ],
    "NovaPay Merchant Operations": [
        ("Merchant Risk Review", "Queues merchant onboarding cases for compliance and risk review.", "Python, PostgreSQL", ["risk", "compliance"]),
        ("Payout Reconciliation", "Matches payout instructions with processor settlement reports.", "Python, PostgreSQL, object storage", ["payouts", "reconciliation"]),
    ],
    "Acme Care Platform": [
        ("Clinical Audit Service", "Maintains an immutable audit trail for patient record access and updates.", "Java, PostgreSQL", ["audit", "clinical"]),
        ("Care Notification Service", "Routes appointment and care-plan notifications using patient preferences.", "Python, Kafka, Redis", ["notifications", "care"]),
    ],
    "Acme Clinical Data Exchange": [
        ("Partner Registry", "Stores partner endpoints, supported FHIR profiles, and delivery configuration.", "Java, PostgreSQL", ["partners", "fhir"]),
        ("Consent Audit Service", "Records consent changes and export authorization decisions.", "Go, PostgreSQL", ["consent", "audit"]),
    ],
    "Northstar Commerce Platform": [
        ("Pricing Service", "Publishes effective product prices and promotion eligibility.", "Java, PostgreSQL, Redis", ["pricing", "promotions"]),
        ("Order Fulfillment Service", "Coordinates warehouse allocation and fulfillment state transitions.", "Go, Kafka, PostgreSQL", ["fulfillment", "orders"]),
    ],
    "Northstar Inventory Intelligence": [
        ("Stock Forecast API", "Serves versioned demand forecasts to replenishment planners.", "Python, FastAPI, PostgreSQL", ["forecasting", "api"]),
        ("Replenishment Planner", "Converts demand forecasts and stock policies into purchase recommendations.", "Python, Spark, PostgreSQL", ["replenishment", "planning"]),
    ],
    "Contoso Fleet Operations": [
        ("Vehicle Maintenance Service", "Schedules preventive maintenance and tracks vehicle work orders.", "C#, SQL Server, Azure", ["maintenance", "fleet"]),
        ("Telematics Ingestor", "Validates and normalizes vehicle location and diagnostic events.", "Go, Kafka, Azure", ["telematics", "ingestion"]),
    ],
    "Contoso Shipment Tracking": [
        ("Carrier Connector", "Manages carrier credentials, polling windows, and event acknowledgements.", "Python, Kafka, PostgreSQL", ["carrier", "integration"]),
        ("Delivery Notification Service", "Sends milestone notifications to shipment subscribers.", "C#, Azure Service Bus", ["notifications", "delivery"]),
    ],
}


INCIDENTS = [
    {
        "key": "NVP-2026-127", "company": "NovaPay", "project": "NovaPay Platform", "service": "Payment Service", "owner": "alex.morgan@novapay.com",
        "title": "Payment confirmations delayed by provider webhook timeouts", "severity": "high", "status": "resolved",
        "started": datetime(2026, 8, 14, 2, 17, tzinfo=timezone.utc), "resolved": datetime(2026, 8, 14, 5, 43, tzinfo=timezone.utc),
        "summary": "Stripe webhook delivery timeouts delayed payment confirmations for 4,200 transactions and caused a 23% confirmation failure rate.",
        "root_cause": "Synchronous callback handling held transaction locks while waiting for downstream order acknowledgements, with no isolated timeout or provider failover.",
        "resolution": "Introduced provider circuit breakers, replayable Kafka payment events, and reconciliation for delayed confirmations. Added alerts for webhook age and confirmation lag.",
    },
    {
        "key": "NVP-2026-134", "company": "NovaPay", "project": "NovaPay Platform", "service": "Analytics Pipeline", "owner": "priya.nair@novapay.com",
        "title": "Analytics consumer lag after repeated Kafka rebalances", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 18, 1, 45, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 18, 4, 15, tzinfo=timezone.utc),
        "summary": "Consumer group rebalances produced a 150-minute delay in payment analytics and stale merchant dashboard totals.",
        "root_cause": "A slow aggregation consumer exceeded its poll interval, causing partition reassignment across the full consumer group.",
        "resolution": "Enabled cooperative rebalancing, isolated expensive aggregations into a separate group, and added consumer-lag alerts with a 10-minute threshold.",
    },
    {
        "key": "ACH-2026-021", "company": "Acme Health", "project": "Acme Care Platform", "service": "Appointment Service", "owner": "maya.chen@acmehealth.example",
        "title": "Appointment queue saturation delayed care-team schedules", "severity": "high", "status": "resolved",
        "started": datetime(2026, 7, 21, 9, 10, tzinfo=timezone.utc), "resolved": datetime(2026, 7, 21, 10, 32, tzinfo=timezone.utc),
        "summary": "A burst of rescheduling requests delayed appointment availability updates for three provider networks.",
        "root_cause": "Availability recalculation ran synchronously for every changed appointment and exhausted the worker pool.",
        "resolution": "Moved recalculation to a bounded background queue, added per-provider concurrency limits, and introduced queue-depth alerts.",
    },
    {
        "key": "ACH-2026-034", "company": "Acme Health", "project": "Acme Clinical Data Exchange", "service": "FHIR Gateway", "owner": "aisha.patel@acmehealth.example",
        "title": "Partner FHIR export rejected due to consent cache staleness", "severity": "critical", "status": "resolved",
        "started": datetime(2026, 8, 9, 14, 5, tzinfo=timezone.utc), "resolved": datetime(2026, 8, 9, 14, 41, tzinfo=timezone.utc),
        "summary": "A partner export used outdated consent state for 37 records; the export was blocked before partner delivery.",
        "root_cause": "Consent revocations invalidated the primary store but did not evict entries from a regional gateway cache.",
        "resolution": "Purged the affected cache, added versioned consent checks at export time, and introduced audit reconciliation for outbound batches.",
    },
    {
        "key": "NSR-2026-044", "company": "Northstar Retail", "project": "Northstar Inventory Intelligence", "service": "Inventory Service", "owner": "dev.shah@northstar.example",
        "title": "Inventory oversell during warehouse stock reconciliation", "severity": "high", "status": "resolved",
        "started": datetime(2026, 8, 2, 16, 20, tzinfo=timezone.utc), "resolved": datetime(2026, 8, 2, 18, 2, tzinfo=timezone.utc),
        "summary": "Online orders exceeded available stock for 186 units across two high-volume product lines.",
        "root_cause": "Reconciliation overwrote newer reservation counts with a delayed warehouse snapshot because updates lacked sequence checks.",
        "resolution": "Rejected stale snapshots using source sequence numbers, rebuilt reservation totals, and added an oversell-rate alert by SKU.",
    },
    {
        "key": "NSR-2026-052", "company": "Northstar Retail", "project": "Northstar Commerce Platform", "service": "Checkout Service", "owner": "marcus.lee@northstar.example",
        "title": "Checkout latency spike during promotional traffic", "severity": "medium", "status": "investigating",
        "started": datetime(2026, 9, 22, 11, 30, tzinfo=timezone.utc), "resolved": None,
        "summary": "Checkout p95 latency rose above 4 seconds during a promotion, with intermittent cart submissions timing out.",
        "root_cause": "Initial evidence points to synchronous inventory confirmation and connection-pool contention during peak load.",
        "resolution": "Mitigation is active through temporary capacity increases; the team is separating inventory checks and validating pool sizing before closing the incident.",
    },
    {
        "key": "CTL-2026-018", "company": "Contoso Logistics", "project": "Contoso Shipment Tracking", "service": "Event Normalizer", "owner": "grace.turner@contosologistics.example",
        "title": "Carrier scan backlog caused stale shipment tracking", "severity": "high", "status": "resolved",
        "started": datetime(2026, 7, 29, 5, 12, tzinfo=timezone.utc), "resolved": datetime(2026, 7, 29, 7, 47, tzinfo=timezone.utc),
        "summary": "Tracking pages showed stale milestones for approximately 12,000 shipments after a carrier payload-format change.",
        "root_cause": "The normalizer rejected a newly optional timestamp field and retried each malformed event indefinitely.",
        "resolution": "Deployed tolerant parsing with dead-letter routing, replayed valid events, and added schema-drift alerts for carrier feeds.",
    },
    {
        "key": "CTL-2026-027", "company": "Contoso Logistics", "project": "Contoso Fleet Operations", "service": "Dispatch Service", "owner": "noah.kim@contosologistics.example",
        "title": "Dispatch route assignments stalled after geocoding provider degradation", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 7, 13, 4, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 7, 13, 58, tzinfo=timezone.utc),
        "summary": "New route assignments queued while the external geocoding dependency returned slow responses.",
        "root_cause": "Dispatch workers made unbounded synchronous geocoding calls and did not have a cached fallback for known stops.",
        "resolution": "Added strict provider timeouts, a circuit breaker, cached coordinates for known locations, and a retry queue with bounded backoff.",
    },
    {
        "key": "NVP-2026-139", "company": "NovaPay", "project": "NovaPay Merchant Operations", "service": "Payout Reconciliation", "owner": "sofia.reyes@novapay.com",
        "title": "Merchant payout reconciliation delayed after report format change", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 11, 6, 20, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 11, 8, 5, tzinfo=timezone.utc),
        "summary": "The morning reconciliation missed 312 payout rows, delaying merchant balance updates while transfers continued normally.",
        "root_cause": "A processor added a quoted optional column and the importer relied on positional field parsing.",
        "resolution": "Switched to header-based parsing, replayed the affected report, and added processor contract fixtures to the import test suite.",
    },
    {
        "key": "NVP-2026-145", "company": "NovaPay", "project": "NovaPay Merchant Operations", "service": "Merchant Portal", "owner": "alex.morgan@novapay.com",
        "title": "Merchant onboarding submissions intermittently returned errors", "severity": "low", "status": "resolved",
        "started": datetime(2026, 9, 20, 12, 10, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 20, 12, 42, tzinfo=timezone.utc),
        "summary": "A subset of onboarding submissions failed validation despite containing all required business details.",
        "root_cause": "The UI and API used different country-code enumerations after a validation library update.",
        "resolution": "Published a shared country-code schema, added a compatibility check, and replayed submissions confirmed by affected merchants.",
    },
    {
        "key": "ACH-2026-041", "company": "Acme Health", "project": "Acme Care Platform", "service": "Care Notification Service", "owner": "omar.hassan@acmehealth.example",
        "title": "Care-plan notifications queued after delivery provider slowdown", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 3, 15, 0, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 3, 16, 18, tzinfo=timezone.utc),
        "summary": "Care-plan reminders were delayed by up to 78 minutes for two provider groups; clinical data remained available.",
        "root_cause": "Workers waited synchronously on a degraded external notification provider and exhausted the shared delivery pool.",
        "resolution": "Added provider timeouts and circuit breaking, separated urgent messages into a priority queue, and replayed delayed reminders after provider recovery.",
    },
    {
        "key": "ACH-2026-048", "company": "Acme Health", "project": "Acme Clinical Data Exchange", "service": "Partner Registry", "owner": "daniel.brooks@acmehealth.example",
        "title": "Partner endpoint certificate rotation blocked clinical exports", "severity": "high", "status": "investigating",
        "started": datetime(2026, 9, 23, 7, 35, tzinfo=timezone.utc), "resolved": None,
        "summary": "Exports to one partner are being retried after TLS certificate validation started failing following the partner's certificate rotation.",
        "root_cause": "The partner registry retained an outdated intermediate certificate chain and had no automated expiry notification.",
        "resolution": "Exports remain safely queued. The partner chain is being verified; certificate-expiry monitoring and a rotation runbook are planned before resolution.",
    },
    {
        "key": "NSR-2026-061", "company": "Northstar Retail", "project": "Northstar Commerce Platform", "service": "Pricing Service", "owner": "erin.cole@northstar.example",
        "title": "Promotion prices diverged between product page and checkout", "severity": "high", "status": "resolved",
        "started": datetime(2026, 8, 17, 10, 8, tzinfo=timezone.utc), "resolved": datetime(2026, 8, 17, 10, 56, tzinfo=timezone.utc),
        "summary": "Several promotion prices displayed correctly in the catalog but were not applied consistently during checkout.",
        "root_cause": "The catalog cache used a stale promotion version while checkout read the latest pricing rules.",
        "resolution": "Invalidated caches by promotion version, added version checks at checkout, and reconciled affected orders with customer support.",
    },
    {
        "key": "NSR-2026-067", "company": "Northstar Retail", "project": "Northstar Inventory Intelligence", "service": "Replenishment Planner", "owner": "talia.brooks@northstar.example",
        "title": "Replenishment recommendations generated from incomplete overnight sales", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 12, 2, 15, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 12, 3, 34, tzinfo=timezone.utc),
        "summary": "The overnight replenishment run under-forecast demand for stores whose point-of-sale feed arrived late.",
        "root_cause": "The batch marked the sales partition complete based on file arrival, not source watermark completeness.",
        "resolution": "Added per-source watermarks, delayed planning for incomplete regions, and regenerated recommendations before purchasing cut-off.",
    },
    {
        "key": "CTL-2026-032", "company": "Contoso Logistics", "project": "Contoso Fleet Operations", "service": "Telematics Ingestor", "owner": "elena.garcia@contosologistics.example",
        "title": "Vehicle telemetry ingestion dropped malformed diagnostic batches", "severity": "high", "status": "resolved",
        "started": datetime(2026, 8, 26, 4, 40, tzinfo=timezone.utc), "resolved": datetime(2026, 8, 26, 6, 12, tzinfo=timezone.utc),
        "summary": "Diagnostic updates from 640 vehicles stopped appearing in fleet dashboards while location events continued.",
        "root_cause": "A new firmware field exceeded the strict payload schema and caused entire mixed batches to be rejected.",
        "resolution": "Added tolerant field handling and per-record dead-lettering, replayed recoverable messages, and introduced firmware schema compatibility tests.",
    },
    {
        "key": "CTL-2026-041", "company": "Contoso Logistics", "project": "Contoso Shipment Tracking", "service": "Tracking API", "owner": "victor.chen@contosologistics.example",
        "title": "Tracking API served stale milestones during read-replica lag", "severity": "medium", "status": "resolved",
        "started": datetime(2026, 9, 16, 18, 22, tzinfo=timezone.utc), "resolved": datetime(2026, 9, 16, 19, 9, tzinfo=timezone.utc),
        "summary": "Customer tracking pages lagged carrier events by up to 24 minutes during a database maintenance window.",
        "root_cause": "Read routing did not consider replica replay lag, and responses lacked an event freshness indicator.",
        "resolution": "Routed freshness-sensitive reads to the primary during lag, added a stale-data response marker, and lowered the replica lag alert threshold.",
    },
]


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as db:
        owner = await db.scalar(select(User).where(User.email == "admin@synq.com"))
        if owner is None:
            owner = await db.scalar(select(User).order_by(User.created_at).limit(1))
        if owner is None:
            raise RuntimeError("Create an admin login before seeding company projects.")

        companies_by_name: dict[str, Company] = {}
        projects_by_name: dict[str, Project] = {}
        employees_by_email: dict[str, Employee] = {}

        for company_data in COMPANIES:
            company = await db.scalar(
                select(Company).where(Company.name == company_data["name"])
            )
            if company is None:
                company = Company(
                    name=company_data["name"],
                    industry=company_data["industry"],
                    description=company_data["description"],
                )
                db.add(company)
                await db.flush()
            else:
                company.industry = company_data["industry"]
                company.description = company_data["description"]
            companies_by_name[company.name] = company

            for project_data in company_data["projects"]:
                project = await db.scalar(
                    select(Project).where(Project.name == project_data["name"])
                )
                if project is None:
                    project = Project(
                        name=project_data["name"],
                        description=project_data["description"],
                        owner_id=owner.id,
                        company_id=company.id,
                    )
                    db.add(project)
                    await db.flush()
                else:
                    project.company_id = company.id
                projects_by_name[project.name] = project

                for service_name, description, tech_stack, tags in project_data["services"]:
                    service = await db.scalar(
                        select(Service).where(
                            Service.project_id == project.id,
                            Service.name == service_name,
                        )
                    )
                    if service is None:
                        db.add(
                            Service(
                                name=service_name,
                                description=description,
                                tech_stack=tech_stack,
                                tags=tags,
                                project_id=project.id,
                            )
                        )

                for service_name, description, tech_stack, tags in EXTRA_SERVICES.get(project.name, []):
                    service = await db.scalar(
                        select(Service).where(
                            Service.project_id == project.id,
                            Service.name == service_name,
                        )
                    )
                    if service is None:
                        db.add(
                            Service(
                                name=service_name,
                                description=description,
                                tech_stack=tech_stack,
                                tags=tags,
                                project_id=project.id,
                            )
                        )

            for name, email, title, team, expertise, is_on_call in company_data["employees"]:
                employee = await db.scalar(
                    select(Employee).where(Employee.email == email)
                )
                if employee is None:
                    employee = Employee(
                        full_name=name,
                        email=email,
                        job_title=title,
                        team=team,
                        expertise=expertise,
                        is_on_call=is_on_call,
                        company_id=company.id,
                    )
                    db.add(employee)
                else:
                    employee.full_name = name
                    employee.job_title = title
                    employee.team = team
                    employee.expertise = expertise
                    employee.is_on_call = is_on_call
                    employee.company_id = company.id
                employees_by_email[email] = employee

        await db.flush()

        for incident_data in INCIDENTS:
            existing = await db.scalar(
                select(Incident).where(Incident.incident_key == incident_data["key"])
            )
            if existing is not None:
                continue

            project = projects_by_name[incident_data["project"]]
            service = await db.scalar(
                select(Service).where(
                    Service.project_id == project.id,
                    Service.name == incident_data["service"],
                )
            )
            if service is None:
                raise RuntimeError(
                    f"Missing service {incident_data['service']!r} in {project.name!r}."
                )
            db.add(
                Incident(
                    incident_key=incident_data["key"],
                    project_id=project.id,
                    service_id=service.id,
                    owner_employee_id=employees_by_email[incident_data["owner"]].id,
                    title=incident_data["title"],
                    severity=incident_data["severity"],
                    status=incident_data["status"],
                    started_at=incident_data["started"],
                    resolved_at=incident_data["resolved"],
                    summary=incident_data["summary"],
                    root_cause=incident_data["root_cause"],
                    resolution=incident_data["resolution"],
                )
            )

        await db.commit()
        print(f"Seeded {len(COMPANIES)} companies, 32 employee profiles, and {len(INCIDENTS)} incident reports.")
        print("Employee profiles are company directory data, not login accounts.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())