variable "region" {
  description = "The AWS region to use"
  default     = "us-east-1"
}

variable "availability_zone" {
  default = "us-east-1a"
}

variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

variable "vpc_cidr_block" {
  type = "string"
  default = "10.0.0.0/16"
}

variable "public_cidr_block" {
  type = "string"
  default = "10.0.0.0/24"
}

variable "private_cidr_block" {
  type = "string"
  default = "10.0.1.0/24"
}
