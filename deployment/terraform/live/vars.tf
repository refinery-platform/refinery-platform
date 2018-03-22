variable "region" {
  description = "The AWS region to use"
  default     = "us-east-1"
}

variable "availability_zone_a" {
  default = "us-east-1a"
}

variable "availability_zone_b" {
  default = "us-east-1b"
}


# https://docs.aws.amazon.com/AmazonVPC/latest/UserGuide/VPC_Subnets.html#vpc-subnet-basics
#
# To add a CIDR block to your VPC, the following rules apply:
# ...
# The CIDR block must not be the same or larger than the CIDR range of a route
# in any of the VPC route tables. For example, if you have a route with a
# destination of 10.0.0.0/24 to a virtual private gateway, you cannot associate
# a CIDR block of the same range or larger. However, you can associate a CIDR
# block of 10.0.0.0/25 or smaller.

variable "vpc_cidr_block" {
  type    = "string"
  default = "10.0.0.0/24"
}

variable "public_cidr_block" {
  type    = "string"
  default = "10.0.0.128/25"
}

variable "private_cidr_block_a" {
  type    = "string"
  default = "10.0.0.64/26"
}

variable "private_cidr_block_b" {
  type    = "string"
  default = "10.0.0.0/26"
}
