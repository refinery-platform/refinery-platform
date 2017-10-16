// must match COGNITO_IDENTITY_POOL_NAME in deployment/aws-config/config.yaml
variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

variable "upload_bucket_name" {
  description = "Name of the data file upload bucket"
}

// temp workaround, must match STACK_NAME in deployment/aws-config/config.yaml
variable "stack_name" {
  description = "Name prefix of the CloudFormation stack for Cognito resources"
}
