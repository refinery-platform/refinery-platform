variable "cidr_block" {}

variable "security_group_id" {
  type = "string"
  default = "my_security_group_id"
}

variable "security_group_name" {
  type = "string"
  default = "allow_docker"
}

variable "vpc_id" {}