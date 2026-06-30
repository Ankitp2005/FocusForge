# Security & Audit Documentation
## Last-Minute Life Saver
**Version:** 1.0 | **Classification:** Internal  
**Compliance Target:** SOC 2 Type II, GDPR, CCPA

---

## 1. Security Architecture Overview

```
                    ┌─────────────────────┐
                    │   Threat Boundary    │
                    │  ┌───────────────┐  │
Internet ──HTTPS──► │  │  CloudFront   │  │ ◄── DDoS Protection (AWS Shield)
                    │  │  WAF Rules    │  │
                    │  └──────┬────────┘  │
                    │         │            │
                    │  ┌──────▼────────┐  │
                    │  │  ALB + SSL    │  │ ◄── TLS 1.2+ enforced
                    │  └──────┬────────┘  │
                    │         │            │
                    │  ┌──────▼────────┐  │
                    │  │  API Service  │  │ ◄── JWT auth, rate limiting
                    │  │  (ECS Fargate)│  │
                    │  └──────┬────────┘  │
                    │         │            │
                    │  ┌──────▼────────┐  │
                    │  │  Postgres/    │  │ ◄── Encrypted at rest (AES-256)
                    │  │  Redis        │  │     Private subnet, no public access
                    │  └───────────────┘  │
                    └─────────────────────┘
```

---

## 2. Authentication & Authorization

### 2.1 Authentication Methods
- **Email/Password**: bcrypt hashing (cost factor 12), minimum 8 chars, complexity enforced
- **Google OAuth 2.0**: PKCE flow, state parameter for CSRF protection
- **JWT Tokens**:
  - Access token: 15-minute expiry, signed with RS256
  - Refresh token: 7-day expiry, stored as HttpOnly cookie
  - Refresh token rotation: each use issues new token, invalidates old
  - Token family tracking: detect refresh token reuse attacks

### 2.2 Authorization Model
```
Role Hierarchy (ascending privilege):
  VIEWER → MEMBER → ADMIN → OWNER → SYSTEM

Resource Access Pattern (ABAC):
  User can only access resources WHERE userId = authenticatedUserId
  Team resources: verified via team membership check
  Admin endpoints: verified via plan check + admin role

Middleware Stack:
  1. authenticate()      → Verify JWT, attach user to request
  2. requirePlan(plan)   → Check user plan level
  3. authorize(resource) → Verify ownership of requested resource
  4. rateLimiter()       → Per-user rate limits
```

### 2.3 Session Management
- Sessions stored in Redis with TTL
- Concurrent session limit: 5 per user (Free), unlimited (Pro+)
- Force-logout capability for all sessions
- Last-seen tracking per session

---

## 3. Data Security

### 3.1 Encryption
| Data Type | At Rest | In Transit |
|---|---|---|
| User passwords | bcrypt (cost 12) | N/A (never transmitted after creation) |
| OAuth tokens | AES-256 via Supabase | TLS 1.3 |
| Task data | AES-256 (DB level) | TLS 1.3 |
| AI conversation data | AES-256 (DB level) | TLS 1.3 |
| PII fields | Field-level encryption (planned Phase 2) | TLS 1.3 |

### 3.2 Data Classification
| Class | Examples | Handling |
|---|---|---|
| Public | Product features, pricing | No restrictions |
| Internal | Aggregated analytics | Internal access only |
| Confidential | User task data, preferences | Encrypted, access logged |
| Restricted | OAuth tokens, payment data | Encrypted, minimal access, rotated |

### 3.3 Sensitive Data Handling Rules
- **OAuth tokens**: Never logged, never returned in API responses, encrypted in DB
- **Stripe data**: Never stored — use Stripe's tokenization entirely
- **Email addresses**: Hashed when used in analytics, never passed to third parties
- **IP addresses**: Hashed with daily salt before storing in analytics

---

## 4. API Security

### 4.1 Rate Limiting
```
Global Limits (per IP):
  - Auth endpoints: 10 req/min (lockout after 5 failed attempts → 15 min ban)
  - All other: 1000 req/15min

Per-User Limits:
  - Free: 60 req/min
  - Pro: 300 req/min
  - Enterprise: 1000 req/min

AI Endpoints (additional limits):
  - Free: 20 AI requests/day
  - Pro: 200 AI requests/day
  - Enterprise: Unlimited

Rate limit headers returned:
  X-RateLimit-Limit
  X-RateLimit-Remaining
  X-RateLimit-Reset
```

### 4.2 Input Validation
- All inputs validated with Zod schemas at API boundary
- SQL injection: Not possible (Prisma parameterized queries)
- XSS: React escapes by default; DOMPurify for any raw HTML rendering
- File uploads: Type whitelist (CSV only), max 5MB, scanned with ClamAV
- Request size limit: 10MB body maximum

### 4.3 CORS Policy
```javascript
// Production CORS config
{
  origin: ['https://lmls.app', 'https://www.lmls.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}
```

### 4.4 Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
```

---

## 5. AI Security

### 5.1 Prompt Injection Protection
- User inputs to AI are clearly delimited and escaped
- System prompts are not user-modifiable
- AI tool actions have server-side validation before execution
- AI cannot delete accounts, change email/password, or access other users' data

### 5.2 Data Sent to Anthropic API
- Only send: task titles/descriptions, dates, user preferences
- Never send: passwords, OAuth tokens, payment data, full PII
- API calls use server-side key (never exposed to client)
- Response caching: 24h TTL for identical prompts (reduces data exposure)

### 5.3 AI Output Validation
- Structured outputs validated against Zod schemas before use
- AI-suggested task operations are executed with same authorization checks as user requests
- Hallucination protection: AI task references verified against DB before action

---

## 6. Infrastructure Security

### 6.1 Network Architecture
```
Public Subnet:
  - CloudFront distribution
  - ALB (Application Load Balancer)
  - NAT Gateway

Private Subnet:
  - ECS Fargate tasks (API + Worker)
  - RDS/Supabase (Postgres)
  - ElastiCache (Redis)

No direct internet access to:
  - Database
  - Redis
  - Internal services
```

### 6.2 Secrets Management
- All secrets stored in AWS Secrets Manager
- No secrets in environment variables in code (pulled at runtime)
- Secrets rotated on schedule:
  - JWT signing keys: 90 days
  - Database passwords: 180 days
  - API keys: Immediately on staff offboarding

### 6.3 Container Security
- Base images: Official Node.js Alpine (minimal attack surface)
- Non-root user in containers: `USER node`
- Read-only file system where possible
- No privileged containers
- Image scanning: AWS ECR built-in vulnerability scanning on every push
- Dependency scanning: Snyk in CI/CD pipeline

### 6.4 AWS IAM
- Least-privilege IAM roles per service
- ECS task roles: Only permissions needed for that service
- No hardcoded AWS credentials anywhere
- MFA required for all AWS console access
- AWS CloudTrail enabled for audit logging

---

## 7. Compliance

### 7.1 GDPR Requirements
| Requirement | Implementation |
|---|---|
| Lawful basis for processing | Consent (explicit at signup), contract performance |
| Right to access | `GET /user/me/export` — full data export as JSON |
| Right to erasure | `DELETE /user/me` — hard delete after 30-day grace period |
| Right to portability | JSON export including all tasks, goals, habits |
| Data breach notification | 72-hour notification plan documented |
| DPA with processors | Signed DPAs with Anthropic, Supabase, AWS, Stripe |
| Privacy by design | Minimal data collection, purpose limitation |

### 7.2 CCPA Compliance
- "Do Not Sell My Personal Information" option in settings
- Privacy policy clearly states data use
- No sale of personal data to third parties

### 7.3 SOC 2 Type II Controls (Target)
| Control Category | Implementation |
|---|---|
| Security | Encryption, access controls, vulnerability management |
| Availability | 99.9% SLA, multi-AZ deployment, backup strategy |
| Processing Integrity | Input validation, error handling, audit logs |
| Confidentiality | Data classification, NDA for staff, access logging |
| Privacy | GDPR compliance, consent management, data minimization |

---

## 8. Audit Logging

### 8.1 What Is Logged
```javascript
// Every audit log entry contains:
{
  timestamp: ISO8601,
  userId: string,
  action: string,          // "task.create" | "auth.login" | etc.
  resourceType: string,
  resourceId: string,
  ipHash: string,          // hashed IP
  userAgent: string,
  success: boolean,
  errorCode?: string,
  metadata: object         // action-specific details
}
```

### 8.2 Logged Actions
| Category | Events |
|---|---|
| Auth | login, logout, register, password_change, oauth_connect, failed_login |
| Tasks | create, update, delete, complete, snooze |
| Account | profile_update, plan_change, account_delete, data_export |
| Admin | any admin action on user data |
| Security | rate_limit_exceeded, suspicious_request, token_refresh |

### 8.3 Log Retention
- Security/auth logs: 2 years
- Application logs: 90 days
- Analytics events: 3 years (aggregated after 1 year)

---

## 9. Vulnerability Management

### 9.1 Dependency Scanning
- **npm audit** run on every CI build — fails build on critical vulnerabilities
- **Snyk** continuous monitoring — alerts on new CVEs
- Dependency updates: Automated PRs via Dependabot (weekly)
- Manual review: All direct dependencies reviewed quarterly

### 9.2 Security Testing
| Type | Frequency | Tool |
|---|---|---|
| SAST (Static Analysis) | Every commit | ESLint security plugin, CodeQL |
| Dependency scanning | Every commit | npm audit + Snyk |
| Penetration testing | Annually | Third-party security firm |
| Bug bounty | Continuous | HackerOne (post-launch) |

### 9.3 Incident Response Plan

**Severity Levels:**
- P0 (Critical): Active breach, data exposure — Response: 15 min, all-hands
- P1 (High): Auth bypass, data corruption — Response: 1 hour
- P2 (Medium): Rate limit bypass, minor data leak — Response: 4 hours
- P3 (Low): Informational security issue — Response: 72 hours

**Response Steps:**
1. Detect → Alert on-call engineer
2. Contain → Isolate affected systems if needed
3. Investigate → Root cause analysis
4. Remediate → Fix and deploy
5. Communicate → Notify affected users within 72h (GDPR)
6. Post-mortem → Document and improve controls

---

## 10. Third-Party Security Review

| Vendor | Assessment | Result |
|---|---|---|
| Anthropic (Claude API) | SOC 2 Type II, BAA available | ✅ Approved |
| Supabase | SOC 2 Type II, GDPR compliant | ✅ Approved |
| AWS | ISO 27001, SOC 2, GDPR | ✅ Approved |
| Stripe | PCI DSS Level 1, SOC 2 | ✅ Approved |
| Resend | SOC 2 compliant | ✅ Approved |
| Upstash | SOC 2 Type II | ✅ Approved |

---

*Security Owner: CTO / Security Lead | Last Updated: June 2026 | Next Review: December 2026*
