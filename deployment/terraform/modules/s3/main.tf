resource "aws_s3_bucket" "static_files" {
  bucket        = "${var.bucket_name_base}-static"
  force_destroy = true
  tags          = "${var.tags}"

  policy        = <<EOF
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
EOF

  cors_rule {
    allowed_headers = ["Authorization"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "uploaded_files" {
  acl           = "private"
  bucket        = "${var.bucket_name_base}-upload"
  force_destroy = true
  tags          = "${var.tags}"

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
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

  policy = <<EOF
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
EOF
}

data "aws_elb_service_account" "main" {}

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "log_files" {
  acl    = "private"
  bucket = "${var.bucket_name_base}-log"
  tags   = "${var.tags}"

  policy = <<POLICY
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
POLICY
}
