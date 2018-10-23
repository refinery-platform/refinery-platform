resource "aws_iam_user" "ses" {
  name = "${var.resource_name_prefix}-refinery-ses"
}

resource "aws_iam_user_policy" "ses_send_email" {
  name   = "AllowSendingEmailThroughSES"
  user   = "${aws_iam_user.ses.name}"
  # https://docs.aws.amazon.com/ses/latest/DeveloperGuide/smtp-credentials.html#smtp-credentials-convert
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

resource "aws_iam_role" "app_server" {
  description        = "Permissions for the Refinery app server EC2 instance"
  name               = "${var.resource_name_prefix}-refinery-appserver"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["sts:AssumeRole"],
      "Effect": "Allow",
      "Principal": {
          "Service": ["ec2.amazonaws.com"]
      }
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "app_server_s3_access" {
  name   = "AllowAccessToRefineryS3Buckets"
  role   = "${aws_iam_role.app_server.id}"
  # ListBucket on static bucket is required for Django collectstatic management command
  # ListBucket on upload bucket is required for checking availability of uploaded files
  # PutObjectAcl is required for file uploads in addition to PutObject
  # TODO: remove -config bucket permissions when config is no longer stored there
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${var.static_bucket_name}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${var.upload_bucket_name}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${var.media_bucket_name}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${var.resource_name_prefix}-config/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${var.static_bucket_name}",
        "arn:aws:s3:::${var.upload_bucket_name}"
      ]
    }
  ]
}
EOF
}

data "aws_caller_identity" "current" {}

#TODO: remove when SMTP user keys are generated with aws_iam_access_key
resource "aws_iam_role_policy" "app_server_ses_access" {
  name   = "AllowCreateKeysForSMTPUser"
  role   = "${aws_iam_role.app_server.id}"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iam:CreateAccessKey"],
      "Resource": "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/${aws_iam_user.ses.name}"
    }
  ]
}
EOF
}

data "aws_region" "current" {}

resource "aws_iam_role_policy" "app_server_cognito_access" {
  name   = "AllowGetOpenIDTokenFromCognito"
  role   = "${aws_iam_role.app_server.id}"
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["cognito-identity:GetOpenIdTokenForDeveloperIdentity"],
      "Resource": "arn:aws:cognito-identity:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:identitypool/${var.identity_pool_id}"
    }
  ]
}
EOF
}

resource "aws_iam_instance_profile" "app_server" {
  name = "${var.resource_name_prefix}-refinery-appserver-profile"
  role = "${aws_iam_role.app_server.name}"
}
