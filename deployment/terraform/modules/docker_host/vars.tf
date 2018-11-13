variable "resource_name_prefix" {}
variable "vpc_cidr_block" {}
variable "vpc_id" {}
variable "private_subnet_id" {}
variable "docker_tcp_port" {
  default = 2375
}
variable "tags" {
  type        = "map"
  description = "Resource tags"
}
