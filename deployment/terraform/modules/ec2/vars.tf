variable "resource_name_prefix" {}
variable "static_bucket_name" {}
variable "upload_bucket_name" {}
variable "media_bucket_name" {}
variable "log_bucket_name" {}
variable "identity_pool_id" {}
variable "instance_count" {}
variable "instance_type" {}
variable "key_pair_name" {}
variable "subnet_id" {}
variable "tags" {
  type        = "map"
  description = "Resource tags"
}
variable "ssh_users" {
  type = "list"
}
variable "git_commit" {}
variable "django_admin_password" {}
variable "django_default_from_email" {}
variable "django_server_email" {}
variable "rds_endpoint_address" {}
variable "rds_superuser_password" {}
variable "django_admin_email" {}
variable "docker_host" {}
variable "site_name" {}
variable "site_domain" {}
variable "ssl_certificate_id" {}
variable "django_email_subject_prefix" {}
variable "refinery_banner" {}
variable "refinery_banner_anonymous_only" {}
variable "refinery_custom_navbar_item" {}
variable "refinery_google_analytics_id" {}
variable "refinery_google_recaptcha_site_key" {}
variable "refinery_google_recaptcha_secret_key" {}
variable "refinery_s3_user_data" {}
variable "refinery_welcome_email_subject" {}
variable "refinery_welcome_email_message" {}
variable "refinery_user_files_columns" {}
variable "data_volume_size" {}
variable "data_volume_type" {}
variable "data_volume_snapshot_id" {}
variable "data_volume_device_name" {
  description = "Device name for the EBS data volume"
  default     = "/dev/xvdr"
}
