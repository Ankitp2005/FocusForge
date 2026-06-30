# Infrastructure & DevOps Guide
## Last-Minute Life Saver
**Version:** 1.0 | Cloud: AWS | IaC: Terraform

---

## 1. Infrastructure Overview

### Environments
| Environment | Purpose | URL |
|---|---|---|
| Development | Local dev with Docker Compose | localhost |
| Staging | Pre-production QA | staging.lmls.app |
| Production | Live traffic | lmls.app |

---

## 2. AWS Architecture

### Regions
- **Primary:** us-east-1 (N. Virginia)
- **DR (Phase 2):** us-west-2 (Oregon)

### Services Used
| Service | Purpose |
|---|---|
| ECS Fargate | Run API and Worker containers |
| ECR | Docker image registry |
| ALB | Load balancer + SSL termination |
| CloudFront | CDN for frontend + API edge caching |
| S3 | Frontend static hosting + file storage |
| Route 53 | DNS management |
| ACM | TLS/SSL certificates |
| Secrets Manager | Secure secrets storage |
| CloudWatch | Logs + basic metrics |
| AWS WAF | Web Application Firewall |
| AWS Shield Standard | DDoS protection (free tier) |
| SES | Backup email sending |

---

## 3. Docker Configuration

### Dockerfile — API Service
```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
USER nodejs
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### docker-compose.yml (Local Development)
```yaml
version: '3.9'

services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://lmls:lmls@postgres:5432/lmls_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: npm run dev

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001
    command: npm run dev

  worker:
    build:
      context: ./apps/api
      dockerfile: Dockerfile.dev
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://lmls:lmls@postgres:5432/lmls_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: npm run worker

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: lmls
      POSTGRES_PASSWORD: lmls
      POSTGRES_DB: lmls_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 4. CI/CD Pipeline (GitHub Actions)

### Pull Request Pipeline (.github/workflows/pr.yml)
```yaml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: lmls_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/lmls_test
      - run: npm run test:ci
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/lmls_test
          REDIS_URL: redis://localhost:6379
      - uses: codecov/codecov-action@v4

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:5173
```

### Deploy Pipeline (.github/workflows/deploy.yml)
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: us-east-1

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API image
        run: |
          docker build -t $ECR_REGISTRY/lmls-api:$GITHUB_SHA apps/api/
          docker push $ECR_REGISTRY/lmls-api:$GITHUB_SHA

      - name: Run DB migrations (staging)
        run: |
          aws ecs run-task \
            --cluster lmls-staging \
            --task-definition lmls-migrate \
            --overrides '{"containerOverrides": [{"name": "migrate", "command": ["npx", "prisma", "migrate", "deploy"]}]}'

      - name: Deploy to ECS (staging)
        run: |
          aws ecs update-service \
            --cluster lmls-staging \
            --service lmls-api \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster lmls-staging \
            --services lmls-api

      - name: Run smoke tests
        run: npm run test:smoke -- --url https://staging.lmls.app

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      # Same as staging but targets production cluster
      # Production requires manual approval in GitHub environment settings
```

---

## 5. ECS Task Definitions

### API Service
```json
{
  "family": "lmls-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/lmls-api:latest",
      "portMappings": [{ "containerPort": 3001 }],
      "environment": [],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:lmls/prod/database_url" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:lmls/prod/redis_url" },
        { "name": "ANTHROPIC_API_KEY", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:lmls/prod/anthropic_key" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/lmls-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### Auto-scaling Policy
```json
{
  "minCapacity": 2,
  "maxCapacity": 20,
  "scalingPolicies": [
    {
      "name": "cpu-scaling",
      "metric": "ECSServiceAverageCPUUtilization",
      "targetValue": 70,
      "scaleOutCooldown": 60,
      "scaleInCooldown": 300
    },
    {
      "name": "memory-scaling",
      "metric": "ECSServiceAverageMemoryUtilization",
      "targetValue": 80
    }
  ]
}
```

---

## 6. Database Operations

### Migrations
```bash
# Development
npx prisma migrate dev --name "describe_your_change"

# Staging/Production (automated in CI/CD)
npx prisma migrate deploy

# Emergency rollback
# Prisma does NOT auto-rollback — write manual rollback migration
npx prisma migrate dev --name "rollback_previous_change"
```

### Backup Strategy
| Type | Frequency | Retention | Storage |
|---|---|---|---|
| Supabase auto-backup | Daily | 30 days | Managed by Supabase |
| Point-in-time recovery | Continuous | 7 days | Supabase |
| Manual backup (pre-migration) | Before each prod deploy | 90 days | S3 |

### Restore Procedure
```bash
# Restore from Supabase PITR via dashboard or API
# Always restore to staging first, verify, then production
```

---

## 7. Monitoring & Alerting

### Datadog Dashboards
1. **Application Health**: Request rate, error rate, latency (P50/P95/P99)
2. **AI Usage**: Claude API calls, latency, cost per day, cache hit rate
3. **Business Metrics**: DAU, task completions, reminder engagement
4. **Infrastructure**: ECS CPU/memory, DB connections, Redis hit rate

### Alert Rules
| Alert | Condition | Severity | Channel |
|---|---|---|---|
| High error rate | Error rate > 1% for 5min | Critical | PagerDuty |
| API latency degraded | P95 > 1000ms for 5min | High | Slack |
| DB connections saturated | Connections > 80% pool | High | Slack |
| AI API errors | >10 failures in 5min | High | Slack |
| Failed deployments | ECS service fails health check | Critical | PagerDuty |
| High AI cost | Daily cost > $50 | Medium | Slack |

---

## 8. Local Development Setup

```bash
# 1. Clone repo
git clone https://github.com/your-org/lmls.git
cd lmls

# 2. Install dependencies
npm install

# 3. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. Fill in your .env values (minimum required for local):
#    - ANTHROPIC_API_KEY
#    - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET

# 5. Start local services
docker-compose up -d postgres redis

# 6. Run migrations and seed
cd apps/api
npx prisma migrate dev
npx prisma db seed

# 7. Start development servers
npm run dev  # Starts both web (5173) and api (3001)
```

---

## 9. Production Deployment Checklist

Before every production deployment:
- [ ] All tests passing (CI green)
- [ ] Staging deployment verified
- [ ] Smoke tests passing on staging
- [ ] DB migration reviewed (no breaking changes)
- [ ] Rollback plan documented
- [ ] Feature flags configured for new features
- [ ] Monitoring dashboards open during deploy
- [ ] Team notified of deployment window

---

*DevOps Owner: Platform Team | Last Updated: June 2026*
