output "instance_id" {
  value = "${aws_instance.app_server.id}"
}
output "instance_az" {
  value = "${aws_instance.app_server.availability_zone}"
}
