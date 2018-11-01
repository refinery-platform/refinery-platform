data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

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

resource "aws_iam_access_key" "ses_user" {
  user = "${aws_iam_user.ses.name}"
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

resource "aws_instance" "app_server" {
  ami                    = "ami-d05e75b8"
  instance_type          = "${var.instance_type}"
  key_name               = "${var.key_pair_name}"
  monitoring             = true
  vpc_security_group_ids = ["${var.security_group_id}"]
  subnet_id              = "${var.subnet_id}"
  iam_instance_profile   = "${aws_iam_instance_profile.app_server.name}"
  root_block_device {
    volume_type = "gp2"
    volume_size = 11  # originally 8G but HiGlass is 2.5G (must be an integer)
  }
  # scheduler:ebs-snapshot tag is used with the EBS Snapshot Scheduler:
  # http://docs.aws.amazon.com/solutions/latest/ebs-snapshot-scheduler/welcome.html
  tags                   = "${merge(
    var.tags,
    map(
      "Name", "${var.resource_name_prefix} app server",
      "scheduler:ebs-snapshot", "default"
    )
  )}"
  volume_tags            = "${merge(
    var.tags, map("Name", "${var.resource_name_prefix} app server")
  )}"
  user_data              = <<EOF
#!/bin/sh

# https://serverfault.com/a/670688
export DEBIAN_FRONTEND=noninteractive

# print commands and their expanded arguments
set -x

# install dependencies
/usr/bin/apt-get clean && /usr/bin/apt-get -qq update
/usr/bin/apt-get -qq -y install git jq puppet ruby-dev

# add extra SSH keys from Github
for USERNAME in ${join(" ", var.ssh_users)}; do
    curl -s https://api.github.com/users/"$USERNAME"/keys | jq -r '.[].key'
done >> /home/ubuntu/.ssh/authorized_keys

# clone Refinery Platform repo
mkdir /srv/refinery-platform && chown ubuntu:ubuntu /srv/refinery-platform
su -c 'git clone https://github.com/refinery-platform/refinery-platform.git /srv/refinery-platform' ubuntu
su -c 'cd /srv/refinery-platform && /usr/bin/git checkout -q ${var.git_commit}' ubuntu

# assign Puppet variables
export FACTER_ADMIN_PASSWORD=${var.django_admin_password}
export FACTER_AWS_REGION=${data.aws_region.current.name}
export FACTER_DEFAULT_FROM_EMAIL=${var.django_default_from_email}
export FACTER_SERVER_EMAIL=${var.django_server_email}
export FACTER_COGNITO_IDENTITY_POOL_ID=${var.identity_pool_id}
export FACTER_RDS_ENDPOINT_ADDRESS=${var.rds_endpoint_address}
export FACTER_RDS_SUPERUSER_PASSWORD=${var.rds_superuser_password}
export FACTER_ADMIN=${var.django_admin_email}
export FACTER_DOCKER_HOST=${var.docker_host}
export FACTER_SITE_NAME=${var.site_name}
export FACTER_SITE_URL=${var.site_domain}
export FACTER_TLS_REWRITE=${var.tls}
export FACTER_EMAIL_HOST_USER=${aws_iam_access_key.ses_user.id}
export FACTER_EMAIL_HOST_PASSWORD=${aws_iam_access_key.ses_user.ses_smtp_password}

# configure librarian-puppet
/usr/bin/gem install librarian-puppet -v 2.2.3 --no-rdoc --no-ri
su -c 'cd /srv/refinery-platform/deployment && /usr/local/bin/librarian-puppet install' ubuntu

# run puppet
EOF
}
