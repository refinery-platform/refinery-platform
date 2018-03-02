output "docker_hostname" {
  value = "${aws_instance.docker_host.private_ip}"
}
