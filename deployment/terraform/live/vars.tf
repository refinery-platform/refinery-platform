variable "region" {
  description = "The AWS region to use"
}

// must match S3_BUCKET_NAME_BASE in deployment/aws-config/config.yaml
// should match Terraform workspace name
variable "bucket_name_base" {
  description = "Prefix for the Refinery Platform S3 buckets"
}

// must match COGNITO_IDENTITY_POOL_NAME in deployment/aws-config/config.yaml
variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

// temp workaround, must match STACK_NAME in deployment/aws-config/config.yaml
variable "stack_name" {
  description = "Name prefix of the CloudFormation stack for Cognito resources"
}
