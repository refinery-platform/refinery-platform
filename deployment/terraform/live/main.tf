terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key                  = "storage/terraform.tfstate"
    workspace_key_prefix = "sites"
  }
}

provider "aws" {
  region = "${var.region}"
}

module "object_storage" {
  source           = "../modules/s3"
  bucket_name_base = "${var.bucket_name_base}"
}

module "identity_pool" {
  source             = "../modules/cognito"
  identity_pool_name = "${var.identity_pool_name}"
  upload_bucket_name = "${module.object_storage.upload_bucket_name}"
  stack_name         = "${var.stack_name}"
}
