# Containerization & Production Infrastructure Notes

> **Stack:** React + Bootstrap · Node.js + Express · PostgreSQL  
> **Last Updated:** 2025

---

## Cloud Provider Assumption

**All Terraform configuration targets Google Cloud Platform (GCP).**

| Decision | Rationale |
|---|---|
| **GKE (Google Kubernetes Engine)** | First-class Kubernetes support, Autopilot option, integrated Workload Identity, and native GCE Ingress (HTTP(S) LB) with Google-managed TLS certificates. |
| **Cloud SQL for PostgreSQL 16** | Managed HA with automatic failover, point-in-time recovery, automated backups, and no in-cluster storage complexity. |
| **Artifact Registry** | Native GCP Docker registry; integrates with GKE via Workload Identity without extra authentication setup. |

> To retarget AWS (EKS + RDS + ECR) or Azure (AKS + Azure DB for PostgreSQL + ACR), update the `terraform/` provider block, resource types, and the image path prefix in `k8s/` manifests. The Dockerfiles and Kubernetes YAML structure remain identical.

---

## File Inventory

```
.
├── BACKEND/
│   └── Dockerfile                    ← Multi-stage Node.js build (3 stages)
├── FRONTEND/
│   ├── Dockerfile                    ← Vite build → Nginx Alpine (2 stages)
│   └── nginx.conf                    ← SPA fallback + /healthz + asset caching
├── docker-compose.yml                ← Local multi-container testing
├── k8s/
│   ├── configmap-secret.yaml         ← Namespace + ConfigMap + Secret
│   ├── backend-deployment.yaml       ← Deployment + Service + HPA
│   ├── frontend-deployment.yaml      ← Deployment + Service
│   ├── ingress.yaml                  ← GKE Ingress + ManagedCertificate
│   └── postgres-statefulset.yaml     ← StatefulSet (dev/staging) + managed DB notes
└── terraform/
    ├── main.tf                       ← VPC, GKE cluster, Artifact Registry, Cloud SQL
    ├── variables.tf                  ← All input variables with defaults
    └── outputs.tf                    ← Reusable values for CI/CD pipeline
```

---

## 1. Docker

### 1.1 Backend Dockerfile — Multi-Stage Build

| Stage | Base Image | Purpose |
|---|---|---|
| `deps` | `node:20-alpine` | Install production `node_modules` only |
| `builder` | `node:20-alpine` | Full install + optional lint/test gate |
| `runner` | `node:20-alpine` | Lean final image — copies only prod modules + source |

Key practices:
- **Non-root user** (`appuser`) in the final stage — reduces blast radius if a container is compromised.
- **Layer-cache friendly** — `package.json` / `package-lock.json` copied first so `npm ci` is only re-run when dependencies change.
- `NODE_ENV=production` baked in; Express hides stack traces and reduces memory footprint.

### 1.2 Frontend Dockerfile — Vite → Nginx

| Stage | Base Image | Purpose |
|---|---|---|
| `builder` | `node:20-alpine` | `npm ci` + `npm run build` → `/app/dist` |
| `runner` | `nginx:1.27-alpine` | Serves `/usr/share/nginx/html` |

Key practices:
- `VITE_API_BASE_URL` accepted as a `--build-arg` so the same Dockerfile works for any environment.
- Custom `nginx.conf` handles React Router's client-side navigation via `try_files $uri /index.html`.
- `/healthz` endpoint returns 200 for Kubernetes liveness/readiness probes.

### 1.3 Docker Compose — Local Testing

```
docker compose up --build
```

| Service | Host port | Purpose |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 16 (Alpine), named volume for persistence |
| `backend` | 5000 | Express API, waits for `postgres` healthcheck |
| `frontend` | 3000 | Nginx serving React build |

Override secrets with a `.env` file at the project root (never committed):

```dotenv
POSTGRES_PASSWORD=my_secure_password
JWT_SECRET=a_very_long_random_string_at_least_64_chars
```

---

## 2. Kubernetes

### 2.1 Apply Order

Apply resources in this order to satisfy dependencies:

```bash
# 1. Create namespace + config
kubectl apply -f k8s/configmap-secret.yaml

# 2. Database (or skip if using Cloud SQL — see Section 2.4)
kubectl apply -f k8s/postgres-statefulset.yaml

# 3. Application workloads
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 4. Ingress (last — depends on services existing)
kubectl apply -f k8s/ingress.yaml
```

### 2.2 Secrets Management

The `k8s/configmap-secret.yaml` file contains **placeholder** base64 values only.  
**Never commit real credentials.** Populate the Secret before applying:

```bash
# Approach A — kubectl imperative (quick for one-off deploys)
kubectl create secret generic shopping-secret \
  --from-literal=DATABASE_URL='postgres://shopping_user:REAL_PASS@CLOUD_SQL_PRIVATE_IP:5432/shopping_db' \
  --from-literal=JWT_SECRET='REAL_LONG_RANDOM_SECRET' \
  --from-literal=POSTGRES_PASSWORD='REAL_PASS' \
  --namespace shopping \
  --dry-run=client -o yaml | kubectl apply -f -

# Approach B — External Secrets Operator syncing from GCP Secret Manager (recommended for teams)
# Install the operator, create a SecretStore pointing to GCP, then declare ExternalSecret resources.
```

### 2.3 Updating Image Tags in Manifests

Replace the `latest` placeholder image references before deploying:

```bash
# Backend
kubectl set image deployment/shopping-backend \
  backend=us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/backend:GIT_SHA \
  -n shopping

# Frontend
kubectl set image deployment/shopping-frontend \
  frontend=us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:GIT_SHA \
  -n shopping
```

Using the Git commit SHA as the image tag is strongly preferred over `latest` — it gives you an audit trail and makes rollbacks trivial (`kubectl rollout undo`).

### 2.4 PostgreSQL — Managed DB vs StatefulSet

| Option | When to use | Notes |
|---|---|---|
| **Cloud SQL (managed)** | All production and staging environments | Provision via Terraform (`terraform/main.tf`). Use `db_private_ip` output as the DB host in the Secret. No StatefulSet needed. |
| **StatefulSet (this repo)** | Local CI, edge clusters, air-gapped environments | Single primary only. No automatic failover. Data survives pod restarts (PVC). |
| **CloudNativePG operator** | In-cluster HA at scale | Manages primary + N read replicas, automated failover, WAL archiving. See comments in `k8s/postgres-statefulset.yaml`. |

**Scaling limits for in-cluster StatefulSet:**
- A single PostgreSQL primary can comfortably handle ~100–300 concurrent connections and hundreds of queries per second on an `e2-standard-4` node.
- For read-heavy workloads beyond this, add read replicas via CloudNativePG or promote to Cloud SQL with read replicas.
- `max_connections = 100` is set in the Terraform Cloud SQL config; use PgBouncer in transaction-pooling mode to multiplex thousands of app connections onto fewer DB connections.

---

## 3. Terraform

### 3.1 Prerequisites

```bash
# Authenticate to GCP
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Install Terraform >= 1.7
terraform version
```

### 3.2 First-Time Initialisation

```bash
cd terraform/
terraform init          # downloads GCP provider plugins
terraform validate      # syntax check
terraform plan \
  -var="project_id=YOUR_PROJECT_ID" \
  -var="db_password=SECURE_PASSWORD"
```

### 3.3 Resources Provisioned

| Resource | Type | Purpose |
|---|---|---|
| `shopping-vpc` | `google_compute_network` | Isolated VPC for all resources |
| `shopping-subnet` | `google_compute_subnetwork` | Primary subnet + secondary ranges for pods/services |
| Private IP range | `google_compute_global_address` | Reserved range for Cloud SQL Private Service Connection |
| `shopping-app` | `google_artifact_registry_repository` | Docker image repository |
| `shopping-cluster` | `google_container_cluster` | GKE Standard cluster, private nodes |
| `shopping-cluster-nodes` | `google_container_node_pool` | Autoscaling node pool (1–5 × e2-standard-2) |
| `shopping-postgres` | `google_sql_database_instance` | Cloud SQL PostgreSQL 16, HA, private IP, daily backups |
| `shopping_db` database | `google_sql_database` | Application database within the instance |
| `shopping_user` SQL user | `google_sql_user` | Application-scoped non-superuser |

### 3.4 Scaling Limits & Assumptions

| Parameter | Default value | Guidance |
|---|---|---|
| Node machine type | `e2-standard-2` (2 vCPU / 8 GB) | Sufficient for ~20 concurrent users; upgrade to `e2-standard-4` for production load |
| Node pool size | 2 min → 5 max | Cluster autoscaler scales within this range based on pod demand |
| Cloud SQL tier | `db-g1-small` (0.6 vCPU / 1.7 GB) | Suitable for development/low-traffic; upgrade to `db-custom-2-7680` for production |
| Cloud SQL disk | 20 GB SSD (auto-resize to 100 GB) | Adjust `disk_autoresize_limit` for large catalogues |
| Backend replicas | 2 (HPA up to 8) | HPA triggers at 70% CPU; add memory-based metric for better accuracy |
| Frontend replicas | 2 (static) | Nginx is low-CPU; scale only if CDN is not in front |

---

## 4. Full Build → Push → Deploy Sequence

This is the complete sequence to go from source code to a running production deployment. **Do not run `terraform apply` or push images until you have reviewed the plan output.**

### Step 1 — Build Docker Images

```bash
# From the project root

# Backend
docker build \
  -t us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/backend:$(git rev-parse --short HEAD) \
  -t us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/backend:latest \
  ./BACKEND

# Frontend (pass the production API URL as a build arg)
docker build \
  --build-arg VITE_API_BASE_URL=https://shop.example.com/api \
  -t us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:$(git rev-parse --short HEAD) \
  -t us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:latest \
  ./FRONTEND
```

### Step 2 — Push Images to Artifact Registry

```bash
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Push
docker push us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/backend:$(git rev-parse --short HEAD)
docker push us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/backend:latest

docker push us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:$(git rev-parse --short HEAD)
docker push us-central1-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:latest
```

### Step 3 — Provision Infrastructure with Terraform

```bash
cd terraform/

# Review the plan — inspect every resource before applying
terraform plan \
  -var="project_id=PROJECT_ID" \
  -var="db_password=SECURE_DB_PASSWORD" \
  -out=tfplan

# Apply (creates VPC, GKE cluster, Cloud SQL, Artifact Registry)
# NOTE: First apply can take 10–15 minutes (GKE cluster provisioning)
terraform apply tfplan

# Capture outputs for subsequent steps
terraform output -json > ../infra-outputs.json
```

### Step 4 — Configure kubectl

```bash
gcloud container clusters get-credentials \
  $(terraform output -raw cluster_name) \
  --zone $(terraform output -raw cluster_location) \
  --project PROJECT_ID
```

### Step 5 — Create Kubernetes Secrets

```bash
# Read DB private IP from Terraform outputs
DB_IP=$(terraform output -raw db_private_ip)

kubectl create secret generic shopping-secret \
  --from-literal=DATABASE_URL="postgres://shopping_user:SECURE_DB_PASSWORD@${DB_IP}:5432/shopping_db" \
  --from-literal=JWT_SECRET="LONG_RANDOM_JWT_SECRET" \
  --from-literal=POSTGRES_PASSWORD="SECURE_DB_PASSWORD" \
  --namespace shopping \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 6 — Apply Kubernetes Manifests

```bash
cd ..   # back to project root

# Namespace + ConfigMap (idempotent — safe to re-apply)
kubectl apply -f k8s/configmap-secret.yaml

# Application workloads — update image tags to the Git SHA built in Step 1
GIT_SHA=$(git rev-parse --short HEAD)
REGISTRY=us-central1-docker.pkg.dev/PROJECT_ID/shopping-app

sed "s|REGION-docker.pkg.dev/PROJECT_ID/shopping-app/backend:latest|${REGISTRY}/backend:${GIT_SHA}|g" \
  k8s/backend-deployment.yaml | kubectl apply -f -

sed "s|REGION-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:latest|${REGISTRY}/frontend:${GIT_SHA}|g" \
  k8s/frontend-deployment.yaml | kubectl apply -f -

# Ingress (last)
kubectl apply -f k8s/ingress.yaml
```

### Step 7 — Verify Deployment

```bash
# Watch pods come up
kubectl get pods -n shopping -w

# Check rollout status
kubectl rollout status deployment/shopping-backend -n shopping
kubectl rollout status deployment/shopping-frontend -n shopping

# Get the Ingress external IP (may take 2–5 min for LB provisioning)
kubectl get ingress shopping-ingress -n shopping

# Smoke test the health endpoint
curl https://shop.example.com/api/health
```

### Rollback

```bash
# Roll back to the previous deployment revision
kubectl rollout undo deployment/shopping-backend -n shopping
kubectl rollout undo deployment/shopping-frontend -n shopping

# Roll back to a specific revision
kubectl rollout undo deployment/shopping-backend --to-revision=2 -n shopping
```

---

## 5. CI/CD Integration Notes

The GitHub Actions workflow at `.github/workflows/shopping-app-ci.yml` runs tests on every push. To extend it to also build, push, and deploy:

1. Add GCP service account credentials as a GitHub repository secret (`GCP_SA_KEY`).
2. After tests pass, run Steps 1–2 (build + push) using the `google-github-actions/auth` action.
3. Run Step 6 (`kubectl apply`) using the `google-github-actions/get-gke-credentials` action.
4. Use the Git SHA (`${{ github.sha }}`) as the Docker tag — never use `latest` in CI/CD.

---

## 6. Known Limitations & Future Improvements

| Item | Current state | Recommended improvement |
|---|---|---|
| Secrets management | Kubernetes Secret (base64, not encrypted at rest by default) | Enable GKE Application-layer Secret Encryption; migrate to External Secrets Operator + GCP Secret Manager |
| TLS | Google-managed cert on GKE Ingress | Already covers auto-renewal; no action needed unless using non-GKE cluster |
| Observability | None configured | Add Google Cloud Monitoring / Prometheus + Grafana + alerting rules |
| Database migrations | Manual | Add a Kubernetes Job (or init container) that runs migrations on each deploy |
| Image scanning | None | Enable Artifact Registry vulnerability scanning; fail CI if critical CVEs found |
| Rate limiting | Application-level only | Add Cloud Armor WAF policy on the HTTPS LB for DDoS and brute-force protection |
| Multi-region | Single zone | For HA, convert to a regional GKE cluster; use Cloud SQL with multi-region read replicas |
