provider "aws" {
  region = "${var.region}"
}

terraform {
  backend "s3" {}
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
