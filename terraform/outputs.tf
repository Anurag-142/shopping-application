output "cluster_name" {
  description = "GKE cluster name — use in kubectl context and CI/CD pipeline."
  value       = google_container_cluster.shopping_cluster.name
}

output "cluster_endpoint" {
  description = "GKE control-plane endpoint for kubectl configuration."
  value       = google_container_cluster.shopping_cluster.endpoint
  sensitive   = true
}

output "cluster_location" {
  description = "Zone/region where the GKE cluster is deployed."
  value       = google_container_cluster.shopping_cluster.location
}

output "registry_url" {
  description = "Artifact Registry base URL. Prefix image tags with this value."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.registry_id}"
}

output "backend_image" {
  description = "Full Docker image URI for the backend service."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.registry_id}/backend:latest"
}

output "frontend_image" {
  description = "Full Docker image URI for the frontend service."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.registry_id}/frontend:latest"
}

output "db_instance_name" {
  description = "Cloud SQL instance name — required for Cloud SQL Proxy and IAM bindings."
  value       = google_sql_database_instance.shopping_postgres.name
}

output "db_connection_name" {
  description = "Cloud SQL connection name in the form PROJECT:REGION:INSTANCE. Use in Cloud SQL Auth Proxy."
  value       = google_sql_database_instance.shopping_postgres.connection_name
}

output "db_private_ip" {
  description = "Private IP address of the Cloud SQL instance. Use as DB_HOST in the backend Secret."
  value       = google_sql_database_instance.shopping_postgres.private_ip_address
  sensitive   = true
}

output "database_url" {
  description = "Full PostgreSQL connection string for the backend. Store as Kubernetes Secret shopping-secret.DATABASE_URL."
  value       = "postgres://${var.db_user}:${var.db_password}@${google_sql_database_instance.shopping_postgres.private_ip_address}:5432/${var.db_name}"
  sensitive   = true
}

output "vpc_name" {
  description = "VPC network name."
  value       = google_compute_network.shopping_vpc.name
}

output "subnet_name" {
  description = "Primary subnet name."
  value       = google_compute_subnetwork.shopping_subnet.name
}
