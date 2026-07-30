# ─────────────────────────────────────────────────────────────────
# Provider configuration
# Cloud provider assumption: Google Cloud Platform (GCP)
# Resources provisioned:
#   • VPC + subnet with secondary IP ranges (pods + services)
#   • GKE Autopilot-style Standard cluster with node autoscaling
#   • Artifact Registry repository (Docker images)
#   • Cloud SQL for PostgreSQL (managed database)
#   • Private Service Connection so Cloud SQL is reachable from GKE
#     without a public IP
# ─────────────────────────────────────────────────────────────────
terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Remote state — uncomment and configure for team usage
  # backend "gcs" {
  #   bucket = "my-terraform-state-bucket"
  #   prefix = "shopping-app/terraform.tfstate"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────────────────────────
# Enable required GCP APIs
# ─────────────────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",          # GKE
    "sqladmin.googleapis.com",           # Cloud SQL
    "artifactregistry.googleapis.com",   # Artifact Registry
    "servicenetworking.googleapis.com",  # Private Service Connection
    "compute.googleapis.com",            # VPC, subnets, firewall
  ])

  project                    = var.project_id
  service                    = each.key
  disable_on_destroy         = false
  disable_dependent_services = false
}

# ─────────────────────────────────────────────────────────────────
# VPC + Subnet
# ─────────────────────────────────────────────────────────────────
resource "google_compute_network" "shopping_vpc" {
  name                    = var.vpc_name
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "shopping_subnet" {
  name          = var.subnet_name
  region        = var.region
  network       = google_compute_network.shopping_vpc.self_link
  ip_cidr_range = var.subnet_cidr

  # Secondary ranges — used by GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }

  private_ip_google_access = true      # Allow VMs without external IPs to reach Google APIs
}

# Private IP range for Cloud SQL Private Service Connection
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.vpc_name}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.shopping_vpc.self_link
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.shopping_vpc.self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
  depends_on              = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────
# Artifact Registry — Docker image repository
# ─────────────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "shopping_registry" {
  provider      = google-beta
  project       = var.project_id
  location      = var.region
  repository_id = var.registry_id
  format        = "DOCKER"
  description   = "Docker images for the Shopping App"

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────
# GKE Cluster
# ─────────────────────────────────────────────────────────────────
resource "google_container_cluster" "shopping_cluster" {
  name     = var.cluster_name
  location = var.zone

  # Remove default node pool immediately; we manage our own
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.shopping_vpc.self_link
  subnetwork = google_compute_subnetwork.shopping_subnet.self_link

  # Private cluster — nodes have no public IPs
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false   # Keep the control plane reachable from your machine
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity for GKE → GCP API access without service account keys
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable the built-in GKE Ingress (HTTP(S) Load Balancer)
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.shopping_subnet,
  ]
}

resource "google_container_node_pool" "shopping_nodes" {
  name       = "${var.cluster_name}-nodes"
  location   = var.zone
  cluster    = google_container_cluster.shopping_cluster.name

  initial_node_count = var.node_count

  autoscaling {
    min_node_count = var.node_min_count
    max_node_count = var.node_max_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    image_type   = "COS_CONTAINERD"

    # Use Workload Identity on nodes
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      env  = "production"
      app  = "shopping"
    }

    tags = ["shopping-node"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }
}

# ─────────────────────────────────────────────────────────────────
# Cloud SQL — Managed PostgreSQL instance
# ─────────────────────────────────────────────────────────────────
resource "google_sql_database_instance" "shopping_postgres" {
  name             = var.db_instance_name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = "REGIONAL"    # HA with automatic failover to standby

    disk_autoresize       = true
    disk_autoresize_limit = 100       # GB cap on auto-growth
    disk_size             = 20        # Initial size GB
    disk_type             = "PD_SSD"

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"   # UTC
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 14
      }
    }

    maintenance_window {
      day          = 7                # Sunday
      hour         = 4               # 04:00 UTC
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled    = false         # No public IP
      private_network = google_compute_network.shopping_vpc.self_link
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true          # Prevent accidental Terraform destroy

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "shopping_db" {
  name     = var.db_name
  instance = google_sql_database_instance.shopping_postgres.name
}

resource "google_sql_user" "shopping_user" {
  name     = var.db_user
  instance = google_sql_database_instance.shopping_postgres.name
  password = var.db_password
}
