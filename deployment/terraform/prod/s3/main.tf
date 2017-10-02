terraform {
  required_version = "~> 0.10"
  backend "s3" {
    key = "prod/s3/terraform.tfstate"
  }
}

provider "aws" {
  region = "${var.region}"
}

resource "aws_s3_bucket" "static_files" {
  bucket = "${var.bucket_prefix}-prod-static"
}

resource "aws_s3_bucket" "media_files" {
  bucket = "${var.bucket_prefix}-prod-media"

  lifecycle {
    prevent_destroy = true
  }
}
