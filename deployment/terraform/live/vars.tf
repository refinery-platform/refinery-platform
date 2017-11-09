variable "region" {
  description = "The AWS region to use"
}

// must match COGNITO_IDENTITY_POOL_NAME in deployment/aws-config/config.yaml
variable "identity_pool_name" {
  description = "Cognito federated identity pool name"
}
