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
  acl    = "public-read"
  bucket = "${var.bucket_name_base}-prod-static"

  cors_rule {
    allowed_headers = ["Authorization"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

//resource "aws_s3_bucket" "uploads" {
//  bucket = "${var.bucket_name_base}-prod-upload"
//
//  cors_rule {
//    allowed_headers = ["*"]
//    allowed_methods = ["PUT", "POST", "DELETE"]
//    allowed_origins = ["*"]
//    expose_headers  = ["ETag"]
//    max_age_seconds = 3000
//  }
//}

resource "aws_s3_bucket" "media_files" {
//  acl    = "public-read"
  bucket = "${var.bucket_name_base}-prod-media"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  lifecycle {
    prevent_destroy = true
  }
}
