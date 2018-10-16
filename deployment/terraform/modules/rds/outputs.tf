output "instance_hostname" {
  value = "${aws_db_instance.default.address}"
}
