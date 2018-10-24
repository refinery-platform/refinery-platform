#TODO: remove when SMTP user keys are generated with aws_iam_access_key
output "iam_smtp_user" {
  value = "${aws_iam_user.ses.name}"
}

output "instance_id" {
  value = "${aws_instance.app_server.id}"
}
output "instance_az" {
  value = "${aws_instance.app_server.availability_zone}"
}
