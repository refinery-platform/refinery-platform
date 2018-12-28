data "aws_elb_service_account" "main" {}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "static_files" {
  bucket        = "${var.bucket_name_base}-static"
  force_destroy = true
  tags          = "${var.tags}"

  policy        = <<PUBLIC_ACCESS
{
  "Version":"2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${var.bucket_name_base}-static/*"
    }
  ]
}
PUBLIC_ACCESS

  cors_rule {
    allowed_headers = ["Authorization"]
    allowed_methods = ["GET"]
    allowed_origins = ["${var.origin_protocol}://${var.origin_domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "uploaded_files" {
  bucket        = "${var.bucket_name_base}-upload"
  force_destroy = true
  tags          = "${var.tags}"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "DELETE"]
    allowed_origins = ["${var.origin_protocol}://${var.origin_domain}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  lifecycle_rule {
    enabled                                = true
    abort_incomplete_multipart_upload_days = 1
    expiration {
      days = 7
    }
  }
}

resource "aws_s3_bucket" "media_files" {
  bucket = "${var.bucket_name_base}-media"
  tags   = "${var.tags}"

  policy = <<PUBLIC_ACCESS
{
  "Version":"2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${var.bucket_name_base}-media/*"
    }
  ]
}
PUBLIC_ACCESS

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "Delete non-current object versions and expired delete markers"
    enabled = true
    expiration {
      expired_object_delete_marker = true
    }
    noncurrent_version_expiration {
      days = 14
    }
  }

  logging {
    target_bucket = "${aws_s3_bucket.log_files.id}"
    # to match ELB log key name format
    target_prefix = "AWSLogs/${data.aws_caller_identity.current.account_id}/s3/media/"
  }
}

resource "aws_s3_bucket" "log_files" {
  acl    = "log-delivery-write"  # for S3 server access logging
  bucket = "${var.bucket_name_base}-log"
  tags   = "${var.tags}"

  policy = <<ELB_ACCESS_LOG
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["s3:PutObject"],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${var.bucket_name_base}-log/AWSLogs/${data.aws_caller_identity.current.account_id}/*",
      "Principal": {
        "AWS": ["${data.aws_elb_service_account.main.arn}"]
      }
    }
  ]
}
ELB_ACCESS_LOG
}
