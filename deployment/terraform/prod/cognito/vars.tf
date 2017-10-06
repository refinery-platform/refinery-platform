variable "region" {
  description = "The AWS region to use"
}

variable "remote_state_bucket" {
  default     = "refinery-state"
  description = "S3 bucket used for the Terraform remote state"
}

// must match COGNITO_IDENTITY_POOL_NAME in deployment/aws-config/config.yaml
variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}

// temp workaround, must match STACK_NAME in deployment/aws-config/config.yaml
variable "stack_name" {
  description = "Name of the CloudFormation stack for Cognito resources"
}
