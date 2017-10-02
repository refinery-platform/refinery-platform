terraform {
  required_version = "~> 0.10"
  backend "s3" {
    key = "global/s3/terraform.tfstate"
  }
}

provider "aws" {
  region = "${var.region}"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.bucket}"

  versioning {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
