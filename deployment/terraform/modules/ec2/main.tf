resource "aws_iam_user" "ses" {
  name = "${var.resource_name_prefix}-ses"
}

resource "aws_iam_user_policy" "ses_send_email" {
  user   = "${aws_iam_user.ses.name}"
  name   = "send-email"
  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "ses:SendRawEmail",
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
POLICY
}
