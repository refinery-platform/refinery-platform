// must match S3_BUCKET_NAME_BASE in deployment/aws-config/config/yaml
variable "bucket_name_base" {
  description = "Prefix for the Refinery Platform S3 buckets"
}

variable "origin_protocol" {
  description = "URL protocol for CORS origin config"
}

variable "origin_domain" {
  description = "URL domain for CORS origin config"
}

variable "tags" {
  type        = "map"
  description = "Resource tags"
}
