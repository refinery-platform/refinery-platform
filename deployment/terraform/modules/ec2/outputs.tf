output "iam_smtp_user" {
  value = "${aws_iam_user.ses.name}"
}
