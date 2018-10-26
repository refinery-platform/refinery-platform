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
