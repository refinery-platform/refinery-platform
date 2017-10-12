terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key = "prod/s3/terraform.tfstate"
  }
}

provider "aws" {
  region = "${var.region}"
}

module "object_storage" {
  source           = "../../../modules/s3"
  bucket_name_base = "${var.bucket_name_base}"
}
