data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_subnet" "app_server" {
  id = "${var.subnet_id}"
}

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
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${var.static_bucket_name}",
        "arn:aws:s3:::${var.upload_bucket_name}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucketVersions"],
      "Resource": "arn:aws:s3:::${var.media_bucket_name}"
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
  count                  = "${var.instance_count}"
  # ubuntu/images/hvm-ssd/ubuntu-trusty-14.04-amd64-server-20181203
  ami                    = "ami-03597b1b84c02cf7b"
  instance_type          = "${var.instance_type}"
  key_name               = "${var.key_pair_name}"
  monitoring             = true
  vpc_security_group_ids = ["${aws_security_group.app_server.id}"]
  subnet_id              = "${var.subnet_id}"
  iam_instance_profile   = "${aws_iam_instance_profile.app_server.name}"
  root_block_device {
    volume_type = "gp2"
  }
  ebs_block_device {
    delete_on_termination = false
    device_name           = "${var.data_volume_device_name}"
    snapshot_id           = "${var.data_volume_snapshot_id}"
    volume_size           = "${var.data_volume_size}"
    volume_type           = "${var.data_volume_type}"
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
/usr/bin/apt-get clean && /usr/bin/apt-get -qq update && /usr/bin/apt-get -y autoremove
/usr/bin/apt-get -qq -y install git htop jq nmon puppet ruby-dev

# add extra SSH keys from Github
for USERNAME in ${join(" ", var.ssh_users)}; do
    curl -s https://api.github.com/users/"$USERNAME"/keys | jq -r '.[].key'
done >> /home/ubuntu/.ssh/authorized_keys

# clone Refinery Platform repo
mkdir /srv/refinery-platform && chown ubuntu:ubuntu /srv/refinery-platform
su -c 'git clone https://github.com/refinery-platform/refinery-platform.git /srv/refinery-platform' ubuntu
su -c 'cd /srv/refinery-platform && /usr/bin/git checkout -q ${var.git_commit}' ubuntu

# configure librarian-puppet
/usr/bin/gem install librarian-puppet -v 2.2.3 --no-rdoc --no-ri
su -c 'cd /srv/refinery-platform/deployment/puppet && /usr/local/bin/librarian-puppet install' ubuntu

# assign Puppet variables
export FACTER_ADMIN_PASSWORD="${var.django_admin_password}"
export FACTER_AWS_REGION="${data.aws_region.current.name}"
export FACTER_DATA_VOLUME_DEVICE_NAME="${var.data_volume_device_name}"
export FACTER_DEFAULT_FROM_EMAIL="${var.django_default_from_email}"
export FACTER_SERVER_EMAIL="${var.django_server_email}"
export FACTER_COGNITO_IDENTITY_POOL_ID="${var.identity_pool_id}"
export FACTER_RDS_ENDPOINT_ADDRESS="${var.rds_endpoint_address}"
export FACTER_RDS_SUPERUSER_PASSWORD="${var.rds_superuser_password}"
export FACTER_ADMIN="${var.django_admin_email}"
export FACTER_DOCKER_HOST="${var.docker_host}"
export FACTER_SITE_NAME="${var.site_name}"
export FACTER_SITE_URL="${var.site_domain}"
export FACTER_EMAIL_HOST_USER="${aws_iam_access_key.ses_user.id}"
export FACTER_EMAIL_HOST_PASSWORD="${aws_iam_access_key.ses_user.ses_smtp_password}"
export FACTER_EMAIL_SUBJECT_PREFIX="${var.django_email_subject_prefix}"
export FACTER_REFINERY_BANNER="${var.refinery_banner}"
export FACTER_REFINERY_BANNER_ANONYMOUS_ONLY="${var.refinery_banner_anonymous_only}"
export FACTER_REFINERY_CUSTOM_NAVBAR_ITEM="${var.refinery_custom_navbar_item}"
export FACTER_REFINERY_GOOGLE_ANALYTICS_ID="${var.refinery_google_analytics_id}"
export FACTER_REFINERY_GOOGLE_RECAPTCHA_SITE_KEY="${var.refinery_google_recaptcha_site_key}"
export FACTER_REFINERY_GOOGLE_RECAPTCHA_SECRET_KEY="${var.refinery_google_recaptcha_secret_key}"
export FACTER_REFINERY_S3_USER_DATA="${var.refinery_s3_user_data}"
export FACTER_REFINERY_S3_MEDIA_BUCKET_NAME="${var.media_bucket_name}"
export FACTER_REFINERY_S3_STATIC_BUCKET_NAME="${var.static_bucket_name}"
export FACTER_REFINERY_S3_UPLOAD_BUCKET_NAME="${var.upload_bucket_name}"
export FACTER_REFINERY_URL_SCHEME="${var.ssl_certificate_id == "" ? "http" : "https"}"
export FACTER_REFINERY_WELCOME_EMAIL_SUBJECT="${var.refinery_welcome_email_subject}"
export FACTER_REFINERY_WELCOME_EMAIL_MESSAGE="${var.refinery_welcome_email_message}"
export FACTER_USER_FILES_COLUMNS="${var.refinery_user_files_columns}"

# run Puppet
/usr/bin/puppet apply --modulepath=/srv/refinery-platform/deployment/puppet/modules /srv/refinery-platform/deployment/puppet/manifests/site.pp
EOF
}

resource "aws_security_group" "elb" {
  # using standalone security group rule resources to avoid cycle errors
  description = "Refinery: allow HTTP/S ingress and HTTP egress"
  name        = "${var.resource_name_prefix}-elb"
  tags        = "${var.tags}"
  vpc_id      = "${data.aws_subnet.app_server.vpc_id}"
}

resource "aws_security_group_rule" "http_ingress" {
  description       = "Refinery: allow HTTP ingress from Internet to ELB"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  security_group_id = "${aws_security_group.elb.id}"
}

resource "aws_security_group_rule" "https_ingress" {
  description       = "Refinery: allow HTTPS ingress from Internet to ELB"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  security_group_id = "${aws_security_group.elb.id}"
}

resource "aws_security_group_rule" "http_egress" {
  description              = "Refinery: allow HTTP egress from ELB to app server"
  type                     = "egress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = "${aws_security_group.elb.id}"
  source_security_group_id = "${aws_security_group.app_server.id}"
}

resource "aws_security_group" "app_server" {
  description = "Refinery: allow HTTP and SSH access to app server instance"
  name        = "${var.resource_name_prefix}-appserver"
  tags        = "${var.tags}"
  vpc_id      = "${data.aws_subnet.app_server.vpc_id}"

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = ["${aws_security_group.elb.id}"]
  }

  ingress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
  }

  egress {
    # implicit with AWS but Terraform requires this to be explicit
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# workaround for inability to specify blocks and parameters conditionally
# https://github.com/hashicorp/terraform/issues/14037
locals {
  http_listener = {
    instance_port     = 80
    instance_protocol = "HTTP"
    lb_port           = 80
    lb_protocol       = "HTTP"
  }
  https_listener = {
    instance_port      = 80
    instance_protocol  = "HTTP"
    lb_port            = 443
    lb_protocol        = "HTTPS"
    ssl_certificate_id = "${var.ssl_certificate_id}"
  }
}
resource "aws_elb" "http" {
  count           = "${var.ssl_certificate_id == "" && var.instance_count > 0 ? 1 : 0}"
  instances       = ["${aws_instance.app_server.id}"]
  idle_timeout    = 180  # seconds
  name            = "${var.resource_name_prefix}"
  security_groups = ["${aws_security_group.elb.id}"]
  subnets         = ["${var.subnet_id}"]
  tags            = "${var.tags}"
  access_logs {
    bucket   = "${var.log_bucket_name}"
    interval = 60  # minutes
  }
  listener = ["${local.http_listener}"]
  health_check {
    healthy_threshold   = 2
    interval            = 30
    target              = "HTTP:80/"
    timeout             = 5
    unhealthy_threshold = 4
  }
}
resource "aws_elb" "https" {
  count           = "${var.ssl_certificate_id != "" && var.instance_count > 0 ? 1 : 0}"
  instances       = ["${aws_instance.app_server.id}"]
  idle_timeout    = 180  # seconds
  name            = "${var.resource_name_prefix}"
  security_groups = ["${aws_security_group.elb.id}"]
  subnets         = ["${var.subnet_id}"]
  tags            = "${var.tags}"
  access_logs {
    bucket   = "${var.log_bucket_name}"
    interval = 60  # minutes
  }
  listener = ["${local.http_listener}", "${local.https_listener}"]
  health_check {
    healthy_threshold   = 2
    interval            = 30
    target              = "HTTP:80/"
    timeout             = 5
    unhealthy_threshold = 4
  }
}
