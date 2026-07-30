# DEPLOYMENT NOTES

> **Stack:** React + Bootstrap · Node.js + Express · PostgreSQL  
> **Infrastructure target:** Google Cloud Platform (GCP)  
> **Last Updated:** 2025

---

## Repository

| Item | Value |
|---|---|
| **GitHub repository** | https://github.com/Anurag-142/bob-shopping-app |
| **Branch** | `main` |
| **Commit** | `Add Docker, Kubernetes and Terraform infrastructure` |

---

## Infrastructure Status

> **Current status: Infrastructure files authored and committed — cloud provisioning not yet executed.**  
> All Terraform, Kubernetes, and Docker files are in the repository and ready to apply.  
> The steps below document what must be run to bring the environment live.

### Why provisioning was not executed in this session

The local machine does not have the following tools installed or running:

| Tool | Required for | Status |
|---|---|---|
| `terraform` CLI (≥ 1.7) | `terraform init` / `terraform apply` | ❌ Not installed |
| Docker Desktop (daemon running) | `docker build` / `docker push` | ❌ Daemon not running |
| `gcloud` CLI | GKE credential setup, Artifact Registry auth | ❌ Not installed |
| GCP project with billing enabled | Cloud SQL, GKE, Artifact Registry | ⚠️ Not confirmed |

`kubectl` v1.36.1 is installed locally but has no cluster context to target until the GKE cluster is provisioned.

---

## Prerequisites (one-time setup)

```powershell
# 1. Install Terraform
winget install HashiCorp.Terraform
# Verify: terraform version

# 2. Install Google Cloud SDK (includes gcloud + kubectl component)
winget install Google.CloudSDK
# Or: https://cloud.google.com/sdk/docs/install
# Verify: gcloud version

# 3. Start Docker Desktop and switch to Linux containers
# Download: https://www.docker.com/products/docker-desktop/
# Verify: docker info

# 4. Authenticate to GCP
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
```

---

## Step 1 — Provision Infrastructure with Terraform

```powershell
cd terraform\

# Initialise provider plugins (downloads ~50 MB)
terraform init

# Review what will be created — inspect every resource
terraform plan `
  -var="project_id=YOUR_GCP_PROJECT_ID" `
  -var="db_password=CHOOSE_A_STRONG_PASSWORD" `
  -out=tfplan

# Apply after reviewing the plan (~10-15 min — GKE cluster is slow to provision)
terraform apply tfplan

# Capture outputs for subsequent steps
terraform output -json | Out-File ..\infra-outputs.json
```

**Expected Terraform plan output summary (approximate):**

```
Plan: 14 to add, 0 to change, 0 to destroy.

Resources to be added:
  + google_artifact_registry_repository.shopping_registry
  + google_compute_global_address.private_ip_range
  + google_compute_network.shopping_vpc
  + google_compute_subnetwork.shopping_subnet
  + google_container_cluster.shopping_cluster
  + google_container_node_pool.shopping_nodes
  + google_project_service.apis["artifactregistry.googleapis.com"]
  + google_project_service.apis["compute.googleapis.com"]
  + google_project_service.apis["container.googleapis.com"]
  + google_project_service.apis["servicenetworking.googleapis.com"]
  + google_project_service.apis["sqladmin.googleapis.com"]
  + google_service_networking_connection.private_vpc_connection
  + google_sql_database.shopping_db
  + google_sql_database_instance.shopping_postgres
  + google_sql_user.shopping_user
```

> ⚠️ `terraform apply` has not been run in this session. The above is the expected output based on `terraform/main.tf`.

---

## Step 2 — Configure kubectl

```powershell
gcloud container clusters get-credentials shopping-cluster `
  --zone us-central1-a `
  --project YOUR_GCP_PROJECT_ID
```

---

## Step 3 — Build and Push Docker Images

```powershell
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

$GIT_SHA = (git rev-parse --short HEAD)
$REGISTRY = "us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/shopping-app"

# Backend
docker build `
  -t "${REGISTRY}/backend:${GIT_SHA}" `
  -t "${REGISTRY}/backend:latest" `
  .\BACKEND

# Frontend (embed the production API base URL)
docker build `
  --build-arg VITE_API_BASE_URL="https://shop.example.com/api" `
  -t "${REGISTRY}/frontend:${GIT_SHA}" `
  -t "${REGISTRY}/frontend:latest" `
  .\FRONTEND

# Push
docker push "${REGISTRY}/backend:${GIT_SHA}"
docker push "${REGISTRY}/backend:latest"
docker push "${REGISTRY}/frontend:${GIT_SHA}"
docker push "${REGISTRY}/frontend:latest"
```

> ⚠️ Images have not been built or pushed — Docker daemon was not running in this session.

---

## Step 4 — Create Kubernetes Secrets

```powershell
# Read the Cloud SQL private IP from Terraform output
$DB_IP = (terraform -chdir=terraform output -raw db_private_ip)

kubectl create secret generic shopping-secret `
  --from-literal=DATABASE_URL="postgres://shopping_user:STRONG_PASSWORD@${DB_IP}:5432/shopping_db" `
  --from-literal=JWT_SECRET="LONG_RANDOM_JWT_SECRET_AT_LEAST_64_CHARS" `
  --from-literal=POSTGRES_PASSWORD="STRONG_PASSWORD" `
  --namespace shopping `
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## Step 5 — Apply Kubernetes Manifests

```powershell
$GIT_SHA = (git rev-parse --short HEAD)
$REGISTRY = "us-central1-docker.pkg.dev/YOUR_GCP_PROJECT_ID/shopping-app"

# Namespace + ConfigMap (always safe to apply first)
kubectl apply -f k8s\configmap-secret.yaml

# Update image tags and apply backend
(Get-Content k8s\backend-deployment.yaml) `
  -replace "REGION-docker.pkg.dev/PROJECT_ID/shopping-app/backend:latest", "${REGISTRY}/backend:${GIT_SHA}" |
  kubectl apply -f -

# Update image tags and apply frontend
(Get-Content k8s\frontend-deployment.yaml) `
  -replace "REGION-docker.pkg.dev/PROJECT_ID/shopping-app/frontend:latest", "${REGISTRY}/frontend:${GIT_SHA}" |
  kubectl apply -f -

# Ingress (last — depends on services being present)
kubectl apply -f k8s\ingress.yaml

# Watch rollout
kubectl rollout status deployment/shopping-backend -n shopping
kubectl rollout status deployment/shopping-frontend -n shopping
kubectl get ingress shopping-ingress -n shopping
```

> ⚠️ Manifests have not been applied — no GKE cluster exists yet.

---

## Step 6 — Deployment URL

Once the GKE Ingress provisions its external IP and the ManagedCertificate issues (typically 2–10 minutes), the application will be reachable at:

| Endpoint | URL |
|---|---|
| **Application (frontend)** | `https://shop.example.com` |
| **API health check** | `https://shop.example.com/api/health` |
| **API base** | `https://shop.example.com/api` |

> Replace `shop.example.com` with the domain you configure in `k8s/ingress.yaml` and your DNS provider.  
> Update this document with the real IP/domain after `kubectl get ingress` returns an address.

---

## Step 7 — Smoke Test Plan

Once the deployment is live, run through these checks manually or via Postman/curl:

### 7.1 Auth

```bash
# Sign up
curl -s -X POST https://shop.example.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","email":"test@example.com","password":"Test1234!"}' | jq .

# Log in
curl -s -X POST https://shop.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' | jq .token
```

### 7.2 Catalogue

```bash
# List products
curl -s https://shop.example.com/api/products | jq '.data | length'

# Product detail
curl -s https://shop.example.com/api/products/1 | jq '{name,price,stockQuantity}'
```

### 7.3 Cart & Checkout

```bash
TOKEN="<JWT from login>"

# Add to cart
curl -s -X POST https://shop.example.com/api/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":1}' | jq .

# Checkout (mock payment)
curl -s -X POST https://shop.example.com/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"shippingAddress":{"street":"1 Test St","city":"Testville","postcode":"T1 1TT","country":"GB"},
       "paymentDetails":{"cardNumber":"4111111111111111","expiry":"12/26","cvv":"123"}}' | jq .orderId
```

### 7.4 Order History

```bash
curl -s https://shop.example.com/api/orders \
  -H "Authorization: Bearer $TOKEN" | jq '.[0].id'
```

### 7.5 Admin

```bash
ADMIN_TOKEN="<JWT from admin login>"

# Add product
curl -s -X POST https://shop.example.com/api/admin/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","description":"A test","price":9.99,"categoryId":1,"imageUrl":"https://via.placeholder.com/300","stockQuantity":50,"isActive":true}' | jq .id
```

> ⚠️ Smoke test has not been run — no live deployment exists yet.

---

## Terraform apply Output Summary

> **Not yet captured** — will be populated after `terraform apply` is executed.  
> Run `terraform output -json` after apply and paste the result here.

Expected outputs (from `terraform/outputs.tf`):

| Output | Description |
|---|---|
| `cluster_name` | GKE cluster name |
| `cluster_endpoint` | Control-plane endpoint (sensitive) |
| `registry_url` | Artifact Registry base URL |
| `backend_image` | Full backend image URI |
| `frontend_image` | Full frontend image URI |
| `db_instance_name` | Cloud SQL instance name |
| `db_connection_name` | Cloud SQL connection name (PROJECT:REGION:INSTANCE) |
| `db_private_ip` | Cloud SQL private IP (sensitive) |
| `database_url` | Full Postgres connection string (sensitive) |

---

## Scaling Notes

| Concern | Current config | Scale trigger |
|---|---|---|
| Backend pods | 2 replicas, HPA max 8 | CPU > 70% — handled automatically |
| Frontend pods | 2 replicas (static) | Manual — add HPA when CDN is not in front |
| GKE nodes | 2 initial, autoscale 1–5 | Node-level CPU/memory pressure |
| Cloud SQL | `db-g1-small` | Upgrade to `db-custom-2-7680` before production traffic |
| DB connections | `max_connections = 100` | Add PgBouncer in transaction-pooling mode for > 50 app pods |

---

## Security Checklist

- [ ] Replace all placeholder Secret values before `kubectl apply`
- [ ] Never commit `terraform.tfvars`, `*.tfstate`, or `kubeconfig` files
- [ ] Rotate `JWT_SECRET` after first deploy
- [ ] Enable GKE Application-layer Secret Encryption
- [ ] Configure Cloud Armor WAF policy on the HTTPS LB
- [ ] Set up Artifact Registry vulnerability scanning
- [ ] Add a `DATABASE_URL`-rotation runbook

---

*This document is the living record of deployment state. Update it after each provisioning run.*
