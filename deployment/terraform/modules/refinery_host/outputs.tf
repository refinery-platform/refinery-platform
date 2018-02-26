output "refinery_hostname" {
  value = "${aws_instance.refinery_host.0.public_ip}"
}