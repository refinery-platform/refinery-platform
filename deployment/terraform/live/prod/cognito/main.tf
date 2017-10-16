terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key = "prod/cognito/terraform.tfstate"
  }
}

provider "aws" {
  region = "${var.region}"
}

data "terraform_remote_state" "object_store" {
  backend = "s3"

  config {
    bucket = "${var.remote_state_bucket}"
    key    = "prod/s3/terraform.tfstate"
    region = "${var.region}"
  }
}

module "identity_pool" {
  source             = "../../../modules/cognito"
  identity_pool_name = "${var.identity_pool_name}"
  upload_bucket_name = "${data.terraform_remote_state.object_store.upload_bucket_name}"
  stack_name         = "${var.stack_name}"
}
