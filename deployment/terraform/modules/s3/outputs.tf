output "static_bucket_name" {
  value = "${aws_s3_bucket.static_files.id}"
}

output "upload_bucket_name" {
  value = "${aws_s3_bucket.uploaded_files.id}"
}

output "media_bucket_name" {
  value = "${aws_s3_bucket.media_files.id}"
}
