output "upload_bucket_name" {
  value = "${aws_s3_bucket.media_files.id}"
}
