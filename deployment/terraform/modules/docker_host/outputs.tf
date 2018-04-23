output "docker_hostname" {
  value = "tcp://${aws_instance.docker_host.private_ip}:${var.docker_tcp_port}"
}
