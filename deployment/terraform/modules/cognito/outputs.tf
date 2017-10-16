output "identity_pool_id" {
  value = "${aws_cloudformation_stack.identities.outputs.IdentityPoolId}"
}
