variable "vpc_cidr_block" {}
variable "private_cidr_block" {}
variable "public_cidr_block_a" {}
variable "public_cidr_block_b" {}
variable "availability_zone" {}
variable "availability_zone_a" {
  default = "us-east-1a"
}
variable "availability_zone_b" {
  default = "us-east-1b"
}
variable "name" {}
