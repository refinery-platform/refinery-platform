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

module "object_storage" {
  source           = "../modules/s3"
  name             = "${terraform.workspace} object_storage"
  bucket_name_base = "${terraform.workspace}"
}

module "identity_pool" {
  source                   = "../modules/cognito"
  name                     = "${terraform.workspace} identity pool"
  identity_pool_name       = "${var.identity_pool_name}"
  upload_bucket_name       = "${module.object_storage.upload_bucket_name}"
  iam_resource_name_prefix = "${terraform.workspace}"
}

module "docker_host" {
  source              = "../modules/docker_host"
  name                = "${terraform.workspace} docker_host"
  vpc_cidr_block      = "${var.vpc_cidr_block}"
  private_subnet_id   = "${module.vpc.private_subnet_a_id}"
  vpc_id              = "${module.vpc.vpc_id}"
  security_group_name = "${terraform.workspace}-docker"
}


module "vpc" {
  source               = "../modules/vpc"
  name                 = "${terraform.workspace} vpc"
  vpc_cidr_block       = "${var.vpc_cidr_block}"
  public_cidr_block    = "${var.public_cidr_block}"
  private_cidr_block_a = "${var.private_cidr_block_a}"
  private_cidr_block_b = "${var.private_cidr_block_b}"
  availability_zone    = "${var.availability_zone_a}"
}

module "rds" {
  source           = "../modules/rds"
  name             = "${terraform.workspace} rds"
  private_subnet_a = "${module.vpc.private_subnet_a_id}"
  private_subnet_b = "${module.vpc.private_subnet_b_id}"
}