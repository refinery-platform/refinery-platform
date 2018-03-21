output "upload_bucket_name" {
  value = "${aws_s3_bucket.uploaded_files.id}"
}

output "bucket_name_base" {
  value = "${var.bucket_name_base}"
}
