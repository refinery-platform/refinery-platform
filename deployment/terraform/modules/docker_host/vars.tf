variable "vpc_cidr_block" {}
variable "security_group_name" {}
variable "vpc_id" {}
variable "private_subnet_id" {}
variable "docker_tcp_port" {
  default = 2375
}