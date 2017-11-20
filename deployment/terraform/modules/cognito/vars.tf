variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

variable "upload_bucket_name" {
  description = "Name of the data file upload bucket"
}

variable "iam_resource_name_prefix" {
  description = "Name prefix of the S3 upload role"
}
