// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceStatus = 'operational' | 'degraded' | 'incident'
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved'
export type ADRStatus = 'accepted' | 'proposed' | 'draft' | 'superseded'
export type KnowledgeType = 'service' | 'adr' | 'incident' | 'person' | 'document' | 'project'

export interface Project {
  id: string
  name: string
  description: string
  company: string
  services: number
  adrs: number
  incidents: number
  members: number
  lastUpdated: string
  color: string
}

export interface Service {
  id: string
  name: string
  status: ServiceStatus
  team: string
  owner: string
  technologies: string[]
  adrCount: number
  incidentCount: number
  lastUpdated: string
  description: string
  projectId: string
}

export interface ADR {
  id: string
  title: string
  status: ADRStatus
  author: string
  date: string
  services: string[]
  tags: string[]
  summary: string
  projectId: string
  context?: string
  decision?: string
  consequences?: string
}

export interface Incident {
  id: string
  title: string
  severity: IncidentSeverity
  status: IncidentStatus
  service: string
  owner: string
  startTime: string
  resolvedTime?: string
  duration: string
  summary: string
  projectId: string
  rootCause?: string
  resolution?: string
}

export interface Person {
  id: string
  name: string
  role: string
  team: string
  servicesOwned: number
  adrsAuthored: number
  avatar: string
  expertise: string[]
  projectId: string
  email: string
  onCallRotation?: boolean
}

export interface KnowledgeItem {
  id: string
  type: KnowledgeType
  title: string
  subtitle: string
  tags: string[]
  updatedAt: string
  relevanceScore?: number
}

export interface OnboardingStep {
  id: string
  title: string
  completed: boolean
  locked: boolean
  current?: boolean
  estimatedTime: string
  description: string
}

// ─── Projects (Multi-company) ─────────────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'NovaPay Platform',
    description: 'Core fintech payments platform — payment processing, fraud detection, auth, and reporting services.',
    company: 'NovaPay',
    services: 9,
    adrs: 8,
    incidents: 7,
    members: 8,
    lastUpdated: '2026-09-26',
    color: '#00d4aa',
  },
  {
    id: 'proj-002',
    name: 'Zero-Trust Migration',
    description: 'Implementing mTLS across all internal services; rolling out cert-manager and Vault PKI integration.',
    company: 'NovaPay',
    services: 3,
    adrs: 2,
    incidents: 2,
    members: 3,
    lastUpdated: '2026-09-22',
    color: '#8b5cf6',
  },
  {
    id: 'proj-003',
    name: 'Analytics 2.0',
    description: 'Rebuilding the analytics pipeline on ClickHouse with real-time streaming from Kafka topics.',
    company: 'NovaPay',
    services: 2,
    adrs: 2,
    incidents: 2,
    members: 4,
    lastUpdated: '2026-09-20',
    color: '#f59e0b',
  },
]

// ─── Mock Services ────────────────────────────────────────────────────────────

export const mockServices: Service[] = [
  {
    id: 'svc-001',
    name: 'Payment Service',
    status: 'operational',
    team: 'Payments Engineering',
    owner: 'Alex Morgan',
    technologies: ['Node.js', 'PostgreSQL', 'Kafka'],
    adrCount: 14,
    incidentCount: 7,
    lastUpdated: '2026-09-24',
    description: 'Core payment processing and transaction management service handling all monetary flows.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-002',
    name: 'Order Service',
    status: 'operational',
    team: 'Commerce Platform',
    owner: 'Priya Nair',
    technologies: ['Go', 'PostgreSQL', 'Redis'],
    adrCount: 9,
    incidentCount: 3,
    lastUpdated: '2026-09-22',
    description: 'Manages order lifecycle from creation through fulfillment and cancellation.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-003',
    name: 'Auth Gateway',
    status: 'degraded',
    team: 'Platform Security',
    owner: 'James Wu',
    technologies: ['Rust', 'Redis', 'JWT'],
    adrCount: 21,
    incidentCount: 12,
    lastUpdated: '2026-09-25',
    description: 'Authentication and authorization gateway handling all identity verification.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-004',
    name: 'Notification Service',
    status: 'operational',
    team: 'Engagement',
    owner: 'Sofia Reyes',
    technologies: ['Python', 'Celery', 'SendGrid'],
    adrCount: 5,
    incidentCount: 2,
    lastUpdated: '2026-09-20',
    description: 'Multi-channel notification delivery (email, push, SMS) with templating engine.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-005',
    name: 'Inventory API',
    status: 'operational',
    team: 'Commerce Platform',
    owner: 'Marcus Chen',
    technologies: ['Java', 'MySQL', 'Elasticsearch'],
    adrCount: 11,
    incidentCount: 4,
    lastUpdated: '2026-09-21',
    description: 'Real-time inventory tracking across warehouses with reservation and allocation logic.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-006',
    name: 'Analytics Pipeline',
    status: 'incident',
    team: 'Data Platform',
    owner: 'Yuki Tanaka',
    technologies: ['Spark', 'Kafka', 'ClickHouse'],
    adrCount: 8,
    incidentCount: 5,
    lastUpdated: '2026-09-26',
    description: 'Real-time and batch analytics ingestion pipeline feeding dashboards and ML models.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-007',
    name: 'Fraud Detection Service',
    status: 'operational',
    team: 'Payments Engineering',
    owner: 'Alex Morgan',
    technologies: ['Python', 'ML', 'PostgreSQL'],
    adrCount: 6,
    incidentCount: 2,
    lastUpdated: '2026-09-18',
    description: 'Real-time fraud scoring for payment transactions using ML model and rule engine.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-008',
    name: 'Reporting Service',
    status: 'operational',
    team: 'Data Platform',
    owner: 'Yuki Tanaka',
    technologies: ['Python', 'PostgreSQL', 'Redis'],
    adrCount: 4,
    incidentCount: 1,
    lastUpdated: '2026-09-12',
    description: 'Read-replica powered reporting service — never writes to the primary DB.',
    projectId: 'proj-001',
  },
  {
    id: 'svc-009',
    name: 'API Gateway',
    status: 'operational',
    team: 'Platform Security',
    owner: 'James Wu',
    technologies: ['Nginx', 'Lua', 'Redis'],
    adrCount: 7,
    incidentCount: 3,
    lastUpdated: '2026-09-16',
    description: 'Edge proxy routing inbound traffic to Payment and Auth services with rate limiting.',
    projectId: 'proj-001',
  },
]

// ─── Mock ADRs ────────────────────────────────────────────────────────────────

export const mockADRs: ADR[] = [
  {
    id: 'adr-042',
    title: 'Use Kafka for async payment event streaming instead of REST callbacks',
    status: 'accepted',
    author: 'Alex Morgan',
    date: '2026-07-14',
    services: ['Payment Service', 'Order Service', 'Analytics Pipeline'],
    tags: ['messaging', 'async', 'kafka', 'payments'],
    summary: 'Replaced synchronous REST webhooks with Kafka event streaming to eliminate timeout cascades and enable replay capability.',
    projectId: 'proj-001',
    context: 'REST callbacks introduced synchronous coupling between Payment and Order services. During INC-127, a 2-second Stripe webhook timeout cascaded into 23% checkout failure rate.',
    decision: 'Adopt Kafka as the event bus for all payment lifecycle events. Payment Service publishes to payment-events topic; Order Service and Analytics Pipeline consume asynchronously.',
    consequences: 'Operational complexity increases — Kafka cluster management, consumer lag monitoring, and DLQ handling required. Eventual consistency window of 50–200ms introduced for order status.',
  },
  {
    id: 'adr-038',
    title: 'Adopt Rust for Auth Gateway to reduce p99 latency below 5ms',
    status: 'accepted',
    author: 'James Wu',
    date: '2026-06-03',
    services: ['Auth Gateway'],
    tags: ['performance', 'rust', 'latency', 'security'],
    summary: 'Node.js auth service was contributing 40ms+ to every authenticated request. Rust rewrite achieved 2.3ms p99.',
    projectId: 'proj-001',
    context: 'Auth Gateway sits in the hot path of every API request. Node.js GC pauses were creating unpredictable p99 spikes under high load.',
    decision: 'Rewrite Auth Gateway in Rust using Axum framework. JWT validation and Redis session lookup are the primary hot paths.',
    consequences: 'Team must maintain Rust expertise. Cold-start times eliminated — process is always warm. Memory footprint reduced 8x.',
  },
  {
    id: 'adr-051',
    title: 'Migrate Order Service from MongoDB to PostgreSQL',
    status: 'proposed',
    author: 'Priya Nair',
    date: '2026-09-10',
    services: ['Order Service'],
    tags: ['database', 'postgresql', 'migration'],
    summary: 'MongoDB schema flexibility caused data consistency issues during order state transitions. PostgreSQL transactions provide stronger guarantees.',
    projectId: 'proj-001',
    context: 'MongoDB\'s flexible schema led to inconsistent order documents and failed state machine transitions during high concurrency.',
    decision: 'Migrate Order Service to PostgreSQL with strict schema. Use advisory locks for order state transitions.',
    consequences: 'Migration requires dual-write phase and data backfill. Estimated 3-sprint effort.',
  },
  {
    id: 'adr-029',
    title: 'Implement circuit breaker pattern for all external payment providers',
    status: 'accepted',
    author: 'Alex Morgan',
    date: '2026-04-22',
    services: ['Payment Service'],
    tags: ['resilience', 'circuit-breaker', 'payments', 'stripe'],
    summary: 'Stripe provider outages were cascading into full checkout failures. Circuit breakers with fallback routing reduced impact by 94%.',
    projectId: 'proj-001',
    context: 'Direct calls to Stripe and Adyen had no failure isolation. A 30s provider outage caused complete checkout unavailability.',
    decision: 'Implement circuit breaker wrapper around all external payment provider calls using exponential backoff and fallback routing.',
    consequences: 'All new payment provider integrations must use the circuit breaker wrapper. Bypassing it is a blocking PR review comment.',
  },
  {
    id: 'adr-055',
    title: 'Standardize service-to-service auth on mTLS',
    status: 'draft',
    author: 'James Wu',
    date: '2026-09-18',
    services: ['Auth Gateway', 'Payment Service', 'Order Service'],
    tags: ['security', 'mtls', 'zero-trust'],
    summary: 'Current API key rotation is manual and error-prone. mTLS with cert-manager enables automated rotation and stronger mutual auth.',
    projectId: 'proj-001',
    context: 'API keys are currently rotated manually on a 90-day schedule. Two incidents involved leaked keys causing unauthorized access attempts.',
    decision: 'Deploy cert-manager to issue short-lived mTLS certs. All internal service communication transitions to mTLS over 3 sprints.',
    consequences: 'All services must be updated to present client certs. Existing API keys deprecated over 6-month sunset window.',
  },
  {
    id: 'adr-033',
    title: 'Use ClickHouse as OLAP store for analytics workloads',
    status: 'accepted',
    author: 'Yuki Tanaka',
    date: '2026-05-08',
    services: ['Analytics Pipeline'],
    tags: ['database', 'clickhouse', 'analytics', 'olap'],
    summary: 'PostgreSQL query times for analytics aggregations exceeded 30s. ClickHouse columnar storage delivers sub-second queries on 10B+ rows.',
    projectId: 'proj-001',
    context: 'The analytics team was running heavy aggregations directly on the primary PostgreSQL replica, causing lock contention and 30s+ query times.',
    decision: 'Introduce ClickHouse as the dedicated OLAP store. Kafka Streams pipeline materialises events into ClickHouse tables in near-real-time.',
    consequences: 'Analytics queries now run against ClickHouse (max 500ms replication lag from PostgreSQL). Reports are near-real-time, not real-time.',
  },
  {
    id: 'adr-047',
    title: 'Use idempotency keys for payment deduplication instead of DB locks',
    status: 'accepted',
    author: 'Alex Morgan',
    date: '2026-08-05',
    services: ['Payment Service'],
    tags: ['payments', 'idempotency', 'deduplication', 'pci'],
    summary: 'Database-level locking for payment deduplication caused deadlocks under concurrent retries. Client-supplied idempotency keys are more scalable.',
    projectId: 'proj-001',
    context: 'PCI DSS requires idempotent payment processing. DB locks were causing deadlocks when clients retried on network failures.',
    decision: 'Require clients to supply an idempotency key per payment initiation. Keys expire after 24 hours. Responses are cached and returned unchanged on duplicate submissions.',
    consequences: 'Clients must generate and persist idempotency keys before initiating payment. SDK updated with automatic key generation.',
  },
  {
    id: 'adr-049',
    title: 'Fraud Detection migrates from rule engine to ML model',
    status: 'accepted',
    author: 'Alex Morgan',
    date: '2026-08-22',
    services: ['Fraud Detection Service', 'Payment Service'],
    tags: ['ml', 'fraud', 'payments', 'model'],
    summary: 'Rule engine generated 12% false positive rate causing customer complaints. Gradient-boosted ML model deployed via feature flag reduced false positives to 1.8%.',
    projectId: 'proj-001',
    context: 'The heuristic rule engine for geo-anomaly and velocity checks had a 12% false positive rate. INC-141 confirmed this was causing significant customer churn.',
    decision: 'Deploy gradient-boosted model trained on 18 months of transaction history. Roll out via feature flag to 5% → 25% → 100% of traffic over 3 weeks.',
    consequences: 'Model requires bi-weekly retraining pipeline. Cold-start problem during feature flag rollout mitigated by shadow-mode evaluation for 2 weeks before cutover.',
  },
]

// ─── Mock Incidents ──────────────────────────────────────────────────────────

export const mockIncidents: Incident[] = [
  {
    id: 'inc-127',
    title: 'Payment Processing Failures — Stripe Webhook Timeouts',
    severity: 'high',
    status: 'resolved',
    service: 'Payment Service',
    owner: 'Alex Morgan',
    startTime: '2026-08-14T02:17:00Z',
    resolvedTime: '2026-08-14T05:43:00Z',
    duration: '3h 26m',
    summary: 'Stripe webhook delivery timeouts caused 23% of payment confirmations to fail silently, affecting 4,200 transactions.',
    projectId: 'proj-001',
    rootCause: 'Synchronous REST callback chain had no timeout isolation. Payment Service waited up to 30s for Order Service confirmation before releasing transaction lock.',
    resolution: 'Deployed circuit breaker wrapper around Stripe calls. Kafka migration (ADR-042) accelerated to prevent recurrence.',
  },
  {
    id: 'inc-131',
    title: 'Auth Gateway Memory Leak — Elevated Latency',
    severity: 'medium',
    status: 'resolved',
    service: 'Auth Gateway',
    owner: 'James Wu',
    startTime: '2026-09-02T14:30:00Z',
    resolvedTime: '2026-09-02T17:15:00Z',
    duration: '2h 45m',
    summary: 'JWT validation cache grew unbounded under high concurrency, causing p99 latency to spike to 340ms.',
    projectId: 'proj-001',
    rootCause: 'LRU cache max size was set to unlimited in Rust config. Under sustained load from a marketing campaign, the cache consumed 4GB of heap.',
    resolution: 'Set cache max size to 50k entries with TTL-based eviction. Added heap memory alerting at 70% threshold.',
  },
  {
    id: 'inc-134',
    title: 'Analytics Pipeline Lag — Kafka Consumer Group Rebalance Storm',
    severity: 'medium',
    status: 'investigating',
    service: 'Analytics Pipeline',
    owner: 'Yuki Tanaka',
    startTime: '2026-09-26T01:45:00Z',
    duration: '2h 30m+',
    summary: 'Kafka consumer group rebalance storm causing 2.5 hour processing lag on real-time analytics topics.',
    projectId: 'proj-001',
    rootCause: 'A slow consumer in the analytics group triggered repeated rebalances. The incremental cooperative rebalance protocol was not enabled.',
    resolution: 'Ongoing — enabling cooperative rebalance protocol and isolating the slow consumer to its own consumer group.',
  },
  {
    id: 'inc-119',
    title: 'Order Service DB Connection Pool Exhaustion',
    severity: 'critical',
    status: 'resolved',
    service: 'Order Service',
    owner: 'Priya Nair',
    startTime: '2026-07-28T09:12:00Z',
    resolvedTime: '2026-07-28T10:58:00Z',
    duration: '1h 46m',
    summary: 'Flash sale traffic spike exhausted PostgreSQL connection pool (max 100), causing order creation failures for 18 minutes.',
    projectId: 'proj-001',
    rootCause: 'Connection pool max_size was set for steady-state traffic (100 connections). Flash sale generated 8x normal transaction rate without pre-scaling.',
    resolution: 'Increased pool to 300 connections. Added pre-scaling runbook for marketing events. PgBouncer introduced to multiplex connections.',
  },
  {
    id: 'inc-122',
    title: 'Notification Service — SendGrid Rate Limit Hit',
    severity: 'low',
    status: 'resolved',
    service: 'Notification Service',
    owner: 'Sofia Reyes',
    startTime: '2026-08-05T11:00:00Z',
    resolvedTime: '2026-08-05T11:42:00Z',
    duration: '42m',
    summary: 'Marketing campaign triggered 180K emails/hour, exceeding SendGrid tier limit and delaying transactional emails by up to 28 minutes.',
    projectId: 'proj-001',
    rootCause: 'Notification Service processed marketing bulk sends and transactional emails through the same SendGrid sub-account with no priority separation.',
    resolution: 'Separated transactional and marketing sends into different SendGrid sub-accounts. Transactional emails now use dedicated higher-tier sub-account.',
  },
  {
    id: 'inc-141',
    title: 'Fraud Detection False Positive Spike — Rule Engine',
    severity: 'high',
    status: 'resolved',
    service: 'Fraud Detection Service',
    owner: 'Alex Morgan',
    startTime: '2026-09-05T08:30:00Z',
    resolvedTime: '2026-09-05T14:15:00Z',
    duration: '5h 45m',
    summary: 'Rule engine change to geo-anomaly scoring flagged 12% of legitimate transactions as fraudulent. Customer complaints escalated to VP-level.',
    projectId: 'proj-001',
    rootCause: 'Geo-anomaly threshold was tightened without canary testing. Normal international payments from new countries triggered the new rule.',
    resolution: 'Rolled back geo-anomaly change. Accelerated ADR-049 (ML model migration) to replace rule engine. Mandatory canary testing added to fraud rule deployment process.',
  },
  {
    id: 'inc-138',
    title: 'Reporting Service — Read Replica Lag During Primary Failover',
    severity: 'medium',
    status: 'resolved',
    service: 'Reporting Service',
    owner: 'Yuki Tanaka',
    startTime: '2026-09-14T22:00:00Z',
    resolvedTime: '2026-09-15T00:30:00Z',
    duration: '2h 30m',
    summary: 'Planned primary DB failover caused read replica to fall 45 minutes behind, serving stale data in all reports without warning.',
    projectId: 'proj-001',
    rootCause: 'Replication lag alerting threshold was set to 60 minutes — too high to catch the 45-minute lag during failover.',
    resolution: 'Lowered replication lag alert to 5 minutes. Added stale data warning banner to all report pages when lag exceeds 30 seconds.',
  },
]

// ─── Mock People ─────────────────────────────────────────────────────────────

export const mockPeople: Person[] = [
  {
    id: 'person-001',
    name: 'Alex Morgan',
    role: 'Senior Backend Engineer',
    team: 'Payments Engineering',
    servicesOwned: 2,
    adrsAuthored: 18,
    avatar: 'AM',
    expertise: ['Node.js', 'Kafka', 'PostgreSQL', 'Stripe'],
    projectId: 'proj-001',
    email: 'alex.morgan@novapay.com',
    onCallRotation: true,
  },
  {
    id: 'person-002',
    name: 'Priya Nair',
    role: 'Staff Engineer',
    team: 'Commerce Platform',
    servicesOwned: 3,
    adrsAuthored: 12,
    avatar: 'PN',
    expertise: ['Go', 'PostgreSQL', 'Redis', 'Architecture'],
    projectId: 'proj-001',
    email: 'priya.nair@novapay.com',
    onCallRotation: true,
  },
  {
    id: 'person-003',
    name: 'James Wu',
    role: 'Principal Security Engineer',
    team: 'Platform Security',
    servicesOwned: 1,
    adrsAuthored: 24,
    avatar: 'JW',
    expertise: ['Rust', 'Zero Trust', 'mTLS', 'JWT'],
    projectId: 'proj-001',
    email: 'james.wu@novapay.com',
    onCallRotation: false,
  },
  {
    id: 'person-004',
    name: 'Sofia Reyes',
    role: 'Backend Engineer',
    team: 'Engagement',
    servicesOwned: 2,
    adrsAuthored: 6,
    avatar: 'SR',
    expertise: ['Python', 'Celery', 'SendGrid', 'RabbitMQ'],
    projectId: 'proj-001',
    email: 'sofia.reyes@novapay.com',
    onCallRotation: true,
  },
  {
    id: 'person-005',
    name: 'Marcus Chen',
    role: 'Senior Backend Engineer',
    team: 'Commerce Platform',
    servicesOwned: 2,
    adrsAuthored: 9,
    avatar: 'MC',
    expertise: ['Java', 'Elasticsearch', 'MySQL', 'Spring Boot'],
    projectId: 'proj-001',
    email: 'marcus.chen@novapay.com',
    onCallRotation: false,
  },
  {
    id: 'person-006',
    name: 'Yuki Tanaka',
    role: 'Data Engineer',
    team: 'Data Platform',
    servicesOwned: 2,
    adrsAuthored: 8,
    avatar: 'YT',
    expertise: ['Spark', 'Kafka', 'ClickHouse', 'Python'],
    projectId: 'proj-001',
    email: 'yuki.tanaka@novapay.com',
    onCallRotation: true,
  },
  {
    id: 'person-007',
    name: 'Lena Petrov',
    role: 'Engineering Manager',
    team: 'Payments Engineering',
    servicesOwned: 0,
    adrsAuthored: 4,
    avatar: 'LP',
    expertise: ['Management', 'Architecture', 'Roadmap'],
    projectId: 'proj-001',
    email: 'lena.petrov@novapay.com',
    onCallRotation: false,
  },
  {
    id: 'person-008',
    name: 'Omar Hassan',
    role: 'Backend Engineer',
    team: 'Platform Security',
    servicesOwned: 1,
    adrsAuthored: 5,
    avatar: 'OH',
    expertise: ['Rust', 'Redis', 'OAuth2', 'OIDC'],
    projectId: 'proj-001',
    email: 'omar.hassan@novapay.com',
    onCallRotation: true,
  },
]

// ─── Dashboard Metrics ───────────────────────────────────────────────────────

export const dashboardMetrics = {
  services: { value: 9, change: +1, label: 'Services' },
  adrs: { value: 8, change: +2, label: 'Architecture Decisions' },
  incidents: { value: 7, change: -1, label: 'Total Incidents' },
  activeIncidents: { value: 2, change: +1, label: 'Active Incidents' },
  owners: { value: 8, change: +1, label: 'Active Owners' },
  knowledgeItems: { value: 36, change: +4, label: 'Knowledge Items' },
}

// ─── Knowledge Growth Chart Data ─────────────────────────────────────────────

export const knowledgeGrowthData = [
  { month: 'Mar', services: 28, adrs: 112, incidents: 51, docs: 320 },
  { month: 'Apr', services: 31, adrs: 128, incidents: 55, docs: 378 },
  { month: 'May', services: 33, adrs: 141, incidents: 60, docs: 442 },
  { month: 'Jun', services: 35, adrs: 153, incidents: 64, docs: 510 },
  { month: 'Jul', services: 37, adrs: 162, incidents: 67, docs: 583 },
  { month: 'Aug', services: 39, adrs: 171, incidents: 70, docs: 651 },
  { month: 'Sep', services: 42, adrs: 186, incidents: 73, docs: 723 },
]

// ─── Recent Knowledge Activity ────────────────────────────────────────────────

export const recentActivity = [
  { id: 'act-001', type: 'adr' as KnowledgeType, title: 'ADR-055: Standardize on mTLS for service-to-service auth', actor: 'James Wu', action: 'created', time: '2h ago' },
  { id: 'act-002', type: 'incident' as KnowledgeType, title: 'INC-134: Analytics Pipeline Kafka rebalance storm', actor: 'Yuki Tanaka', action: 'opened', time: '2h 30m ago' },
  { id: 'act-003', type: 'adr' as KnowledgeType, title: 'ADR-051: Migrate Order Service to PostgreSQL', actor: 'Priya Nair', action: 'updated', time: '16h ago' },
  { id: 'act-004', type: 'service' as KnowledgeType, title: 'Auth Gateway — degraded status detected', actor: 'System', action: 'flagged', time: '1d ago' },
  { id: 'act-005', type: 'incident' as KnowledgeType, title: 'INC-131: Auth Gateway Memory Leak resolved', actor: 'James Wu', action: 'resolved', time: '24d ago' },
  { id: 'act-006', type: 'adr' as KnowledgeType, title: 'ADR-042: Kafka event streaming — postmortem linked', actor: 'Alex Morgan', action: 'updated', time: '43d ago' },
]

// ─── Continue Cards ───────────────────────────────────────────────────────────

export const continueCards = [
  { id: 'cont-001', type: 'service' as KnowledgeType, title: 'Payment Service', subtitle: 'Reviewing dependency map and ADR-042 context', progress: 72, lastVisited: '3h ago', owner: 'Alex Morgan', technology: ['Node.js', 'PostgreSQL', 'Kafka'], lastUpdated: 'Sep 24', completeness: 72, dependencies: 4 },
  { id: 'cont-002', type: 'service' as KnowledgeType, title: 'Authentication Service', subtitle: 'Understanding performance rationale and mTLS migration', progress: 45, lastVisited: '1d ago', owner: 'James Wu', technology: ['Rust', 'Redis', 'JWT'], lastUpdated: 'Sep 25', completeness: 45, dependencies: 6 },
  { id: 'cont-003', type: 'service' as KnowledgeType, title: 'Order Service', subtitle: 'Postmortem review — DB migration proposal', progress: 88, lastVisited: '2d ago', owner: 'Priya Nair', technology: ['Go', 'PostgreSQL', 'Redis'], lastUpdated: 'Sep 22', completeness: 88, dependencies: 3 },
]

// ─── Onboarding Steps ────────────────────────────────────────────────────────

export const onboardingSteps: OnboardingStep[] = [
  { id: 'ob-001', title: 'Company Architecture Overview', completed: true, locked: false, estimatedTime: '30 min', description: 'High-level overview of all services and how they interact.' },
  { id: 'ob-002', title: 'Development Environment Setup', completed: true, locked: false, estimatedTime: '45 min', description: 'Configure local dev environment, Docker, and service dependencies.' },
  { id: 'ob-003', title: 'Authentication Service Deep Dive', completed: true, locked: false, estimatedTime: '1h', description: 'Understand JWT flows, mTLS, and Auth Gateway architecture.' },
  { id: 'ob-004', title: 'Payment Service Architecture', completed: true, locked: false, estimatedTime: '1.5h', description: 'Core payment flows, Kafka integration, and Stripe webhook handling.' },
  { id: 'ob-005', title: 'Payment Architecture Decisions', completed: false, locked: false, current: true, estimatedTime: '1h', description: 'Review ADR-042 (Kafka), ADR-029 (circuit breakers), and related decisions.' },
  { id: 'ob-006', title: 'Past Payment Incidents', completed: false, locked: false, estimatedTime: '45 min', description: 'Study INC-127 postmortem and lessons learned.' },
  { id: 'ob-007', title: 'Database Architecture', completed: false, locked: false, estimatedTime: '1h', description: 'PostgreSQL schema design, connection pooling, and migration patterns.' },
  { id: 'ob-008', title: 'Production Runbooks', completed: false, locked: true, estimatedTime: '2h', description: 'On-call procedures, escalation paths, and incident response.' },
  { id: 'ob-009', title: 'First PR Review', completed: false, locked: true, estimatedTime: '30 min', description: 'Shadow a senior engineer on a production code review.' },
  { id: 'ob-010', title: 'Lead a Production Deployment', completed: false, locked: true, estimatedTime: '1h', description: 'Deploy a change to production with guidance.' },
]

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: ChatSource[]
  timestamp: string
}

export interface ChatSource {
  id: string
  type: 'adr' | 'incident' | 'slack' | 'document' | 'service'
  title: string
  subtitle: string
  date: string
  excerpt: string
  confidence: number
}

export const mockChatSources: ChatSource[] = [
  {
    id: 'src-adr-042',
    type: 'adr',
    title: 'ADR-042',
    subtitle: 'Use Kafka for async payment event streaming',
    date: '2026-07-14',
    excerpt: 'REST callbacks introduced synchronous coupling between Payment and Order services. During INC-127, a 2-second Stripe webhook timeout cascaded into 23% checkout failure rate. Kafka decouples producers from consumers and enables event replay...',
    confidence: 97,
  },
  {
    id: 'src-inc-127',
    type: 'incident',
    title: 'INC-127',
    subtitle: 'Payment Processing Failures — Stripe Webhook Timeouts',
    date: '2026-08-14',
    excerpt: 'Root cause: synchronous REST callback chain had no timeout isolation. Payment Service waited up to 30s for Order Service confirmation before releasing the transaction lock, causing connection pool exhaustion under load...',
    confidence: 91,
  },
  {
    id: 'src-slack-001',
    type: 'slack',
    title: 'Slack: #architecture-decisions',
    subtitle: 'Alex Morgan, Priya Nair, James Wu',
    date: '2026-07-12',
    excerpt: 'alex.morgan: "The real problem isn\'t Stripe\'s reliability — it\'s that we have no way to replay failed webhooks. If we owned the event stream in Kafka, we could replay any window up to 7 days..." priya.nair: "Agreed, and it unblocks the analytics team from needing direct DB access."',
    confidence: 84,
  },
]

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: 'Why did we switch from REST callbacks to Kafka for payment events? What was the original problem?',
    timestamp: '10:42 AM',
  },
  {
    id: 'msg-002',
    role: 'assistant',
    content: `The switch from REST callbacks to Kafka was driven by a cascading failure we experienced in **INC-127** (August 2026), but the architectural concern predates that incident.

**The original problem:**
The Payment Service used synchronous REST webhooks to notify the Order Service when a transaction completed. This created tight coupling — if the Order Service was slow or unavailable, the Payment Service would block waiting for acknowledgment, holding database transaction locks open.

**What broke in INC-127:**
A Stripe webhook delivery delay of ~2 seconds cascaded into a 23% checkout failure rate because:
1. Payment Service was waiting synchronously on Order Service confirmation
2. Connection pool exhaustion followed within minutes under normal traffic load
3. There was no replay mechanism — failed webhooks were lost permanently

**Why Kafka was the right answer (per ADR-042):**
- **Decoupling**: Payment Service publishes and moves on — Order Service consumes at its own pace
- **Replay**: Any consumer can replay up to 7 days of events for recovery
- **Fan-out**: Analytics Pipeline and future consumers subscribe without modifying Payment Service

The decision was formalized in ADR-042 on July 14, 2026, roughly a month before INC-127 — the incident confirmed the analysis was correct.`,
    sources: mockChatSources,
    timestamp: '10:42 AM',
  },
]

export const followUpSuggestions = [
  'What services consume the payment Kafka topic?',
  'How does INC-127 connect to ADR-042?',
  'What should I know before modifying the Payment Service?',
  'Who owns the Kafka cluster configuration?',
]

// ─── Knowledge Explorer Filters ──────────────────────────────────────────────

export const filterOptions = {
  types: ['Service', 'ADR', 'Incident', 'Person', 'Document'],
  teams: ['Payments Engineering', 'Commerce Platform', 'Platform Security', 'Engagement', 'Data Platform', 'Infrastructure'],
  technologies: ['Node.js', 'Go', 'Rust', 'Python', 'Java', 'Kafka', 'PostgreSQL', 'Redis', 'Elasticsearch', 'Spark', 'ClickHouse'],
  owners: ['Alex Morgan', 'Priya Nair', 'James Wu', 'Sofia Reyes', 'Marcus Chen', 'Yuki Tanaka'],
  dateRanges: ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year', 'All time'],
  projects: ['NovaPay Platform', 'Zero-Trust Migration', 'Analytics 2.0'],
}

export const explorerDocuments = [
  { id: 'doc-001', title: 'Payments Engineering Runbook', type: 'document' as KnowledgeType, team: 'Payments Engineering', owner: 'Alex Morgan', tags: ['runbook', 'payments', 'on-call'], updatedAt: '2026-09-15', summary: 'Step-by-step procedures for common payment service incidents, escalation paths, and rollback procedures.' },
  { id: 'doc-002', title: 'Kafka Cluster Configuration Guide', type: 'document' as KnowledgeType, team: 'Infrastructure', owner: 'Yuki Tanaka', tags: ['kafka', 'infrastructure', 'configuration'], updatedAt: '2026-09-08', summary: 'Topic naming conventions, partition strategy, retention policies, and consumer group management.' },
  { id: 'doc-003', title: 'Service Ownership Charter', type: 'document' as KnowledgeType, team: 'Engineering Leadership', owner: 'Priya Nair', tags: ['ownership', 'governance', 'on-call'], updatedAt: '2026-08-30', summary: 'Defines service ownership responsibilities, escalation expectations, and handover protocols.' },
  { id: 'doc-004', title: 'Zero-Trust Network Architecture Spec', type: 'document' as KnowledgeType, team: 'Platform Security', owner: 'James Wu', tags: ['security', 'zero-trust', 'mtls', 'architecture'], updatedAt: '2026-09-19', summary: 'Target architecture for mTLS between all internal services, cert-manager setup, and migration timeline.' },
]

// ─── Auth mock ────────────────────────────────────────────────────────────────

export const mockCurrentUser = {
  id: 'user-alex',
  name: 'Alex Morgan',
  email: 'alex.morgan@novapay.com',
  role: 'contributor' as const,
  avatar: 'AM',
  team: 'Payments Engineering',
  title: 'Senior Backend Engineer',
  currentProjectId: 'proj-001',
}
