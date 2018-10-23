variable "engine_version" {}
variable "resource_name_prefix" {}
variable "private_subnet_a" {}
variable "private_subnet_b" {}
variable "tags" {
  type        = "map"
  description = "Resource tags"
}
variable "app_server_security_group_id" {}
variable "availability_zone" {}
variable "snapshot_id" {}
variable "master_user_password" {}
variable "vpc_id" {}
