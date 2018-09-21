resource "aws_s3_bucket" "static_files" {
  acl           = "public-read"
  bucket        = "${var.bucket_name_base}-static"
  force_destroy = true

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

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "DELETE"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket" "media_files" {
  acl    = "public-read"
  bucket = "${var.bucket_name_base}-media"
}
