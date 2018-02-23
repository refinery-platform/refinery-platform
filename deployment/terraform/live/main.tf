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
  bucket_name_base = "${terraform.workspace}-mccalluc"
}

module "identity_pool" {
  source                   = "../modules/cognito"
  identity_pool_name       = "${var.identity_pool_name}"
  upload_bucket_name       = "${module.object_storage.upload_bucket_name}"
  iam_resource_name_prefix = "${terraform.workspace}"
}

module "docker_host" {
  source              = "../modules/docker_host"
  private_cidr_block  = "${var.private_cidr_block}"
  vpc_id              = "${module.vpc.vpc_id}"
  security_group_name = "${terraform.workspace}-docker"
}

module "vpc" {
  source             = "../modules/vpc"
  private_cidr_block = "${var.private_cidr_block}"
  public_cidr_block  = "${var.public_cidr_block}"
  availability_zone   = "${var.availability_zone}"
}
