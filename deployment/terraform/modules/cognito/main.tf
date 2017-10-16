// workaround for missing AWS::Cognito::IdentityPoolRoleAttachment
// https://github.com/terraform-providers/terraform-provider-aws/issues/232
resource "aws_cloudformation_stack" "identities" {
  name         = "${var.stack_name}Identity"
  capabilities = ["CAPABILITY_IAM"]

  template_body = <<STACK
{
  "Description": "Refinery Platform federated identities",
  "Resources": {
    "IdentityPool": {
      "Type": "AWS::Cognito::IdentityPool",
      "Properties": {
        "IdentityPoolName": "${var.identity_pool_name}",
        "DeveloperProviderName": "login.refinery",
        "AllowUnauthenticatedIdentities": false
      }
    },
    "CognitoS3UploadRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
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
                  "cognito-identity.amazonaws.com:aud": {
                    "Ref": "IdentityPool"
                  }
                },
                "ForAnyValue:StringLike": {
                  "cognito-identity.amazonaws.com:amr": "authenticated"
                }
              }
            }
          ]
        },
        "Policies": [
          {
            "PolicyName": "AuthenticatedS3UploadPolicy",
            "PolicyDocument": {
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
                  "Resource": "arn:aws:s3:::${var.upload_bucket_name}/uploads/$${cognito-identity.amazonaws.com:sub}/*"
                }
              ]
            }
          }
        ]
      }
    },
    "IdentityPoolAuthenticatedRoleAttachment": {
      "Type": "AWS::Cognito::IdentityPoolRoleAttachment",
      "Properties": {
        "IdentityPoolId": {
          "Ref": "IdentityPool"
        },
        "Roles": {
          "authenticated": {
            "Fn::GetAtt": [ "CognitoS3UploadRole", "Arn" ]
          }
        }
      }
    }
  },
  "Outputs": {
    "IdentityPoolId": {
      "Description": "Cognito identity pool ID",
      "Value": {
        "Ref": "IdentityPool"
      },
      "Export": {
        "Name": "${var.stack_name}IdentityPoolId"
      }
    }
  }
}
STACK
}

/*
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
*/
