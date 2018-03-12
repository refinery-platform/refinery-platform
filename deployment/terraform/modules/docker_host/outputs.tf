output "docker_hostname" {
  value = "tcp://${aws_instance.docker_host.private_ip}:2376"
}
