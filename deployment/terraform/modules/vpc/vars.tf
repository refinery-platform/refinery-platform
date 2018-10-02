variable "vpc_cidr_block" {}
variable "private_cidr_block_a" {}
variable "private_cidr_block_b" {}
variable "public_cidr_block" {}
variable "availability_zone_a" {}
variable "availability_zone_b" {}
variable "tags" {
  type        = "map"
  description = "Resource tags"
}
