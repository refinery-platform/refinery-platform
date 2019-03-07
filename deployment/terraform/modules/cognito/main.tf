resource "aws_cognito_identity_pool" "refinery" {
  identity_pool_name               = "${var.identity_pool_name}"
  allow_unauthenticated_identities = false
  developer_provider_name          = "login.refinery"
}

resource "aws_iam_role" "upload_role" {
  description        = "Allows users with identities in Cognito pool to upload files directly into S3"
  name               = "${var.iam_resource_name_prefix}-refinery-upload"
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
          "cognito-identity.amazonaws.com:aud": "${aws_cognito_identity_pool.refinery.id}"
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
  name   = "AllowAccessToRefineryS3UploadBucket"
  role   = "${aws_iam_role.upload_role.id}"
  # s3:ListBucket is required for 'aws s3 sync'
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
      "Resource": "arn:aws:s3:::${var.upload_bucket_name}/$${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${var.upload_bucket_name}"
    }
  ]
}
EOF
}

resource "aws_cognito_identity_pool_roles_attachment" "refinery_authenticated" {
  identity_pool_id = "${aws_cognito_identity_pool.refinery.id}"

  roles = {
    "authenticated" = "${aws_iam_role.upload_role.arn}"
  }
}
