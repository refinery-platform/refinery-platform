output "docker_hostname" {
  # workaround for resource not found error when count for that resource is 0
  # https://github.com/hashicorp/terraform/issues/16681
  value = "${element(concat(aws_instance.docker_host.*.private_ip, list("")), 0)}"
}
