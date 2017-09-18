#!/usr/bin/env python

"""
Script to generate AWS CloudFormation template for Refinery Platform storage
stacks

Requires STACK_NAME to be defined in aws-config/config.yaml

For details:
https://github.com/refinery-platform/refinery-platform/wiki/AWS-installation
"""

import json
import sys

import boto3
from cfn_pyplates.core import (CloudFormationTemplate, DeletionPolicy,
                               Parameter, Properties, Resource)
from cfn_pyplates.functions import get_att, ref
from utils import Output, load_tags
import yaml

REFINERY_CONFIG_FILE = 'aws-config/config.yaml'


def main():
    try:
        with open(REFINERY_CONFIG_FILE) as config_file:
            config = yaml.load(config_file)
    except (IOError, yaml.YAMLError) as exc:
        sys.stderr.write(
            "Error reading {}: {}\n".format(REFINERY_CONFIG_FILE, exc)
        )
        raise RuntimeError

    stack_name = config['STACK_NAME'] + 'Storage'
    template = make_storage_template()

    cloudformation = boto3.client('cloudformation')
    response = cloudformation.create_stack(
        StackName=stack_name,
        TemplateBody=str(template),
        Capabilities=['CAPABILITY_IAM'],
        Tags=load_tags(),
        Parameters=[
            {
                'ParameterKey': 'StaticBucketName',
                'ParameterValue': config['S3_BUCKET_NAME_BASE'] + '-static',
            },
            {
                'ParameterKey': 'MediaBucketName',
                'ParameterValue': config['S3_BUCKET_NAME_BASE'] + '-media',
            },
            {
                'ParameterKey': 'IdentityPoolName',
                'ParameterValue': config['COGNITO_IDENTITY_POOL_NAME']
            },
            {
                'ParameterKey': 'DeveloperProviderName',
                'ParameterValue': config['COGNITO_DEVELOPER_PROVIDER_NAME']
            },
        ],
    )
    sys.stdout.write("{}\n".format(json.dumps(response, indent=2)))


def make_storage_template():
    cft = CloudFormationTemplate(description="Refinery Platform storage")

    # Parameters
    cft.parameters.add(
        Parameter(
            'StaticBucketName',
            'String',
            {
                'Description': 'Name of S3 bucket for Django static files',
            }
        )
    )
    cft.parameters.add(
        Parameter(
            'MediaBucketName',
            'String',
            {
                'Description': 'Name of S3 bucket for Django media files',
                # make names DNS-compliant without periods (".") for
                # compatibility with virtual-hosted-style access and S3
                # Transfer Acceleration
                'AllowedPattern': '[a-z0-9\-]+',
                'ConstraintDescription':
                    'must only contain lower case letters, numbers, and '
                    'hyphens',
            }
        )
    )
    cft.parameters.add(
        Parameter(
            'IdentityPoolName',
            'String',
            {
                'Default': 'Refinery Platform',
                'Description': 'Name of Cognito identity pool for S3 uploads',
            }
        )
    )
    cft.parameters.add(
        Parameter(
            'DeveloperProviderName',
            'String',
            {
                'Default': 'login.refinery',
                'Description': '"domain" by which Cognito will refer to users',
                'AllowedPattern': '[a-z\-\.]+',
                'ConstraintDescription':
                    'must only contain lower case letters, periods, '
                    'underscores, and hyphens'
            }
        )
    )

    # Resources
    cft.resources.add(
        Resource(
            'StaticStorageBucket',
            'AWS::S3::Bucket',
            Properties({
                'BucketName': ref('StaticBucketName'),
                'AccessControl': 'PublicRead',
                'CorsConfiguration': {
                    'CorsRules': [
                        {
                            'AllowedOrigins': ['*'],
                            'AllowedMethods': ['GET'],
                            'AllowedHeaders': ['Authorization'],
                            'MaxAge': 3000,
                        }
                    ]
                },
            }),
            DeletionPolicy('Retain'),
        )
    )
    cft.resources.add(
        Resource(
            'MediaStorageBucket',
            'AWS::S3::Bucket',
            Properties({
                'BucketName': ref('MediaBucketName'),
                'AccessControl': 'PublicRead',
                'CorsConfiguration': {
                    'CorsRules': [
                        {
                            'AllowedOrigins': ['*'],
                            'AllowedMethods': ['POST', 'PUT', 'DELETE'],
                            'AllowedHeaders': ['*'],
                            'ExposedHeaders': ['ETag'],
                            'MaxAge': 3000,
                        }
                    ]
                }
            }),
            DeletionPolicy('Retain'),
        )
    )
    # Cognito Identity Pool for Developer Authenticated Identities Authflow
    # http://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html
    cft.resources.add(
        Resource(
            'IdentityPool',
            'AWS::Cognito::IdentityPool',
            Properties(
                {
                    'IdentityPoolName': ref('IdentityPoolName'),
                    'AllowUnauthenticatedIdentities': False,
                    'DeveloperProviderName': ref('DeveloperProviderName'),
                }
            )
        )
    )
    cft.resources.add(
        Resource(
            'IdentityPoolAuthenticatedRole',
            'AWS::Cognito::IdentityPoolRoleAttachment',
            Properties(
                {
                    'IdentityPoolId': ref('IdentityPool'),
                    'Roles': {
                        'authenticated': get_att('CognitoS3UploadRole', 'Arn'),
                    }
                }
            )
        )
    )
    upload_role_trust_policy = {
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
                        "cognito-identity.amazonaws.com:aud":
                            ref('IdentityPool')
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    }
                }
            }
        ]
    }
    upload_access_policy = {
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
                "Resource": {
                    "Fn::Sub":
                        "arn:aws:s3:::${MediaStorageBucket}/uploads/"
                        "${!cognito-identity.amazonaws.com:sub}/*"
                }
            }
        ]
    }
    cft.resources.add(
        Resource(
            'CognitoS3UploadRole',
            'AWS::IAM::Role',
            Properties(
                {
                    'AssumeRolePolicyDocument': upload_role_trust_policy,
                    'Policies': [
                        {
                            'PolicyName': 'AuthenticatedS3UploadPolicy',
                            'PolicyDocument': upload_access_policy,
                        }
                    ]
                }
            )
        )
    )

    # Outputs
    cft.outputs.add(
        Output(
            'IdentityPoolId',
            ref('IdentityPool'),
            {'Fn::Sub': '${AWS::StackName}IdentityPoolId'},
            'Cognito identity pool ID'
        )
    )

    return cft


if __name__ == '__main__':
    main()
