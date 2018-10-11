terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key                  = "terraform.tfstate"
    workspace_key_prefix = "sites"
  }
}

provider "aws" {
  version = "~> 1.0"
  region  = "${var.region}"
}

locals {
  s3_bucket_name_base = "${replace(terraform.workspace, "/[^A-Za-z0-9]/", "-")}"
  tags                = "${merge(
    var.tags,
    map(
      "product", "refinery",
      "terraform", "true"
    )
  )}"
}

module "object_storage" {
  source           = "../modules/s3"
  bucket_name_base = "${local.s3_bucket_name_base}"
  tags             = "${local.tags}"
}

module "identity_pool" {
  source                   = "../modules/cognito"
  identity_pool_name       = "${replace(terraform.workspace, "/[^A-Za-z0-9_ ]/", " ")}"
  upload_bucket_name       = "${module.object_storage.upload_bucket_name}"
  iam_resource_name_prefix = "${terraform.workspace}"
}

module "docker_host" {
  source               = "../modules/docker_host"
  vpc_cidr_block       = "${var.vpc_cidr_block}"
  private_subnet_id    = "${module.vpc.private_subnet_a_id}"
  vpc_id               = "${module.vpc.vpc_id}"
  resource_name_prefix = "${terraform.workspace}"
  tags                 = "${local.tags}"
}

module "vpc" {
  source               = "../modules/vpc"
  vpc_cidr_block       = "${var.vpc_cidr_block}"
  public_cidr_block    = "${var.public_cidr_block}"
  private_cidr_block_a = "${var.private_cidr_block_a}"
  private_cidr_block_b = "${var.private_cidr_block_b}"
  availability_zone_a  = "${var.availability_zone_a}"
  availability_zone_b  = "${var.availability_zone_b}"
  tags                 = "${local.tags}"
}

module "rds" {
  source               = "../modules/rds"
  private_subnet_a     = "${module.vpc.private_subnet_a_id}"
  private_subnet_b     = "${module.vpc.private_subnet_b_id}"
  resource_name_prefix = "${terraform.workspace}"
  tags                 = "${local.tags}"
}
