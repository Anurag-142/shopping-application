variable "project_id" {
  description = "GCP project ID where all resources will be created."
  type        = string
  # Set via: TF_VAR_project_id=my-project-id or -var flag
}

variable "region" {
  description = "GCP region for all regional resources (cluster, Cloud SQL, Artifact Registry)."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for the GKE node pool. Should be within var.region."
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Name of the GKE cluster."
  type        = string
  default     = "shopping-cluster"
}

variable "node_machine_type" {
  description = "Compute Engine machine type for GKE worker nodes."
  type        = string
  default     = "e2-standard-2"   # 2 vCPU / 8 GB — suitable for a small production workload
}

variable "node_count" {
  description = "Initial number of nodes per zone in the default node pool."
  type        = number
  default     = 2
}

variable "node_min_count" {
  description = "Minimum number of nodes for cluster autoscaler."
  type        = number
  default     = 1
}

variable "node_max_count" {
  description = "Maximum number of nodes for cluster autoscaler."
  type        = number
  default     = 5
}

variable "db_instance_name" {
  description = "Name of the Cloud SQL PostgreSQL instance."
  type        = string
  default     = "shopping-postgres"
}

variable "db_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-g1-small"    # 0.6 vCPU / 1.7 GB — upgrade to db-custom-2-7680 for production
}

variable "db_name" {
  description = "Name of the PostgreSQL database to create inside the Cloud SQL instance."
  type        = string
  default     = "shopping_db"
}

variable "db_user" {
  description = "PostgreSQL application user (non-superuser)."
  type        = string
  default     = "shopping_user"
}

variable "db_password" {
  description = "Password for the PostgreSQL application user. Use a secrets manager in production."
  type        = string
  sensitive   = true
  # Set via: TF_VAR_db_password or a tfvars file that is never committed
}

variable "registry_id" {
  description = "Artifact Registry repository ID."
  type        = string
  default     = "shopping-app"
}

variable "vpc_name" {
  description = "Name of the VPC network."
  type        = string
  default     = "shopping-vpc"
}

variable "subnet_name" {
  description = "Name of the primary subnet."
  type        = string
  default     = "shopping-subnet"
}

variable "subnet_cidr" {
  description = "CIDR range for the primary subnet."
  type        = string
  default     = "10.10.0.0/20"
}

variable "pods_cidr" {
  description = "Secondary IP range for GKE pods."
  type        = string
  default     = "10.20.0.0/16"
}

variable "services_cidr" {
  description = "Secondary IP range for GKE services."
  type        = string
  default     = "10.30.0.0/20"
}
