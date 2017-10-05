terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key = "prod/cognito/terraform.tfstate"
  }
}

provider "aws" {
  region = "${var.region}"
}

data "terraform_remote_state" "object_store" {
  backend = "s3"

  config {
    bucket = "${var.remote_state_bucket}"
    key    = "prod/s3/terraform.tfstate"
    region = "${var.region}"
  }
}

resource "aws_cognito_identity_pool" "idp" {
  identity_pool_name               = "${var.identity_pool_name}"
  allow_unauthenticated_identities = false
  developer_provider_name          = "refinery.login"
}

resource "aws_iam_role" "upload_role" {
  description = "Allows users with identities in Cognito pool to upload files directly into S3"
  name_prefix = "RefineryProdUploadRole-"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "${aws_cognito_identity_pool.idp.id}"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "upload_access_policy" {
  role = "${aws_iam_role.upload_role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-identity:*"
      ],
      "Resource": "*"
    },
    {
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::${data.terraform_remote_state.object_store.upload_bucket_name}/uploads/$${cognito-identity.amazonaws.com:sub}/*"
    }
  ]
}
EOF
}
