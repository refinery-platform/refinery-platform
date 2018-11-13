#TODO: remove when SMTP user keys are generated with aws_iam_access_key
output "iam_smtp_user" {
  value = "${aws_iam_user.ses.name}"
}

output "instance_profile_id" {
  value = "${aws_iam_instance_profile.app_server.id}"
}
