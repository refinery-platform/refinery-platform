variable "resource_name_prefix" {}
variable "static_bucket_name" {}
variable "upload_bucket_name" {}
variable "media_bucket_name" {}
variable "identity_pool_id" {}
variable "instance_type" {}
variable "key_pair_name" {}
# cannot pass a list of IDs due to a bug: https://github.com/hashicorp/terraform/issues/13103
variable "security_group_id" {}
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
variable "tls" {}
variable "django_email_subject_prefix" {}
variable "refinery_custom_navbar_item" {}
variable "refinery_google_analytics_id" {}
variable "refinery_google_recaptcha_site_key" {}
variable "refinery_google_recaptcha_secret_key" {}
variable "refinery_url_scheme" {}
variable "refinery_welcome_email_subject" {}
variable "refinery_welcome_email_message" {}
variable "refinery_user_files_columns" {}
