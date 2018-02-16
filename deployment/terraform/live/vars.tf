variable "region" {
  description = "The AWS region to use"
}

variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

variable "cidr_block" {
  type = "string"
  default = "10.0.0.0/16"
}
