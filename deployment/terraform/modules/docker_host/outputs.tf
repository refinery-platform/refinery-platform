output "docker_hostname" {
  value = "${var.docker_instance_count > 0 ? "tcp://${aws_instance.docker_host.0.private_ip}:${var.docker_tcp_port}" : ""}"
}
