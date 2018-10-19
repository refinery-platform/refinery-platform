#!/usr/bin/env python

# See
# https://github.com/refinery-platform/refinery-platform/wiki/AWS-installation
# for notes on how to use this to deploy to Amazon AWS
#
# References
# cfn-pyplates: https://cfn-pyplates.readthedocs.org/
# AWS Cloudformation: https://aws.amazon.com/cloudformation/
# CloudInit: https://help.ubuntu.com/community/CloudInit
import argparse
import base64
import json
import os
import sys

import boto3
from cfn_pyplates import core, functions
from utils import load_config, load_tags, save_s3_config

VERSION = '1.1'


def main():
    parser = argparse.ArgumentParser(
        version=VERSION,
        description="""Script to generate AWS CloudFormation JSON templates
        used to create Refinery Platform stacks"""
    )
    parser.add_argument(
        'command', choices=('name', 'dump', 'create')
    )
    args = parser.parse_args()

    config, config_yaml = load_config()

    if args.command == 'name':
        sys.stdout.write("{}\n".format(config['STACK_NAME']))
    elif args.command == 'dump':
        template = make_template(config, config_yaml)
        sys.stdout.write("{}\n".format(template))
    elif args.command == 'create':
        template = make_template(config, config_yaml)
        cloudformation = boto3.client('cloudformation')
        response = cloudformation.create_stack(
            StackName=config['STACK_NAME'],
            TemplateBody=str(template),
            Capabilities=['CAPABILITY_IAM'],
            Tags=load_tags()
        )
        sys.stdout.write("{}\n".format(json.dumps(response, indent=2)))


def make_template(config, config_yaml):
    """Make a fresh CloudFormation template object and return it"""

    stack_name = config['STACK_NAME']

    # We discover the current git branch/commit so that the deployment script
    # can use it to clone the same commit
    commit = os.popen("""git rev-parse HEAD""").read().rstrip()
    assert commit

    assert "'" not in config['SITE_NAME']

    instance_tags = load_tags()

    # Stack Name is also used for instances.
    instance_tags.append({'Key': 'Name',
                         'Value': stack_name})

    # This tag is variable and can be specified by
    # template Parameter.
    instance_tags.append({'Key': functions.ref('SnapshotSchedulerTag'),
                         'Value': 'default'})

    config['tags'] = instance_tags

    config_uri = save_s3_config(config)
    sys.stdout.write("Configuration saved to {}\n".format(config_uri))

    tls_rewrite = "false"
    if 'TLS_CERTIFICATE' in config:
        tls_rewrite = "true"

    # The userdata script is executed via CloudInit
    # It's made by concatenating a block of parameter variables,
    # with the bootstrap.sh script, and the aws.sh script
    user_data_script = functions.join(
        "",
        "#!/bin/sh\n",
        "CONFIG_YAML=", base64.b64encode(config_yaml), "\n",
        "CONFIG_JSON=", base64.b64encode(json.dumps(config)), "\n",
        "AWS_DEFAULT_REGION=", functions.ref("AWS::Region"), "\n",
        "export FACTER_RDS_ENDPOINT_ADDRESS=", config['RDS_ENDPOINT_ADDRESS'],
        "\n",
        "export FACTER_RDS_SUPERUSER_PASSWORD=",
        config['RDS_SUPERUSER_PASSWORD'], "\n",
        "ADMIN=", config['ADMIN'], "\n",
        "DEFAULT_FROM_EMAIL=", config['DEFAULT_FROM_EMAIL'], "\n",
        "SERVER_EMAIL=", config['SERVER_EMAIL'], "\n",
        "IAM_SMTP_USER=", config['IAM_SMTP_USER'], "\n",
        "export FACTER_DOCKER_HOST=", config["REFINERY_DOCKER_HOST"], "\n",
        "export FACTER_TLS_REWRITE=", tls_rewrite, "\n",
        "S3_CONFIG_URI=", config['S3_CONFIG_URI'], "\n",
        "SITE_URL=", config['SITE_URL'], "\n",
        # May contain spaces, but can't contain "'"
        "SITE_NAME='", config['SITE_NAME'], "'\n",
        "GIT_BRANCH=", commit, "\n",
        "\n",
        open('bootstrap.sh').read(),
        open('aws.sh').read())

    cft = core.CloudFormationTemplate(description="Refinery Platform main")

    # This parameter tags the EC2 instances, and is intended to be used
    # with the AWS Reference Implementation EBS Snapshot Scheduler:
    # http://docs.aws.amazon.com/solutions/latest/ebs-snapshot-scheduler/welcome.html
    cft.parameters.add(
        core.Parameter('SnapshotSchedulerTag', 'String', {
                'Default': 'scheduler:ebs-snapshot',
                'Description':
                "Tag added to EC2 Instances so that "
                "the EBS Snapshot Scheduler will recognise them.",
            }
        )
    )

    volume_properties = {
        'Encrypted': True,
        'Size': config['DATA_VOLUME_SIZE'],
        'Tags': load_tags(),
        'AvailabilityZone': functions.get_att(
            'WebInstance', 'AvailabilityZone'
        ),
        'VolumeType': config['DATA_VOLUME_TYPE'],
    }

    if 'DATA_SNAPSHOT' in config:
        volume_properties['SnapshotId'] = config['DATA_SNAPSHOT']

    # http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-ebs-volume.html
    cft.resources.ebs = core.Resource(
        'RefineryData', 'AWS::EC2::Volume',
        core.Properties(volume_properties),
        core.DeletionPolicy("Snapshot"),
    )

    cft.resources.ec2_instance = core.Resource(
        'WebInstance', 'AWS::EC2::Instance',
        core.Properties({
            'ImageId': 'ami-d05e75b8',
            'InstanceType': config['EC2_INSTANCE_TYPE'],
            'UserData': functions.base64(user_data_script),
            'KeyName': config['KEY_NAME'],
            'IamInstanceProfile': functions.ref('WebInstanceProfile'),
            'Monitoring': True,
            'SecurityGroupIds': [config['APP_SERVER_SECURITY_GROUP_ID']],
            'Tags': instance_tags,
            'BlockDeviceMappings': [
                {
                    'DeviceName': '/dev/sda1',
                    'Ebs': {
                        # Was 8G; HiGlass is 2.5G; Must be an integer
                        'VolumeSize': '11',
                        'VolumeType': 'gp2',
                    }
                }
            ],
            "SubnetId": config['PUBLIC_SUBNET_ID']
        }),
    )

    cft.resources.instance_profile = core.Resource(
        'WebInstanceProfile', 'AWS::IAM::InstanceProfile',
        core.Properties({
            'Path': '/',
            'Roles': [
              functions.ref('WebInstanceRole')
            ]
        })
    )

    cft.resources.web_role = core.Resource(
        'WebInstanceRole', 'AWS::IAM::Role',
        core.Properties({
            # http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html#cfn-iam-role-templateexamples
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {
                        "Service": ["ec2.amazonaws.com"]
                    },
                    "Action": ["sts:AssumeRole"]
                }]
            },
            'ManagedPolicyArns': [
                'arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess',
                'arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess',
                'arn:aws:iam::aws:policy/AmazonS3FullAccess'
            ],
            'Path': '/',
            'Policies': [
                {
                    'PolicyName': "CreateAccessKey",
                    'PolicyDocument': {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "iam:CreateAccessKey"
                                ],
                                "Resource": [
                                    "*"
                                ]
                            }
                        ]
                    },
                },
                {
                    'PolicyName': "CreateSnapshot",
                    'PolicyDocument': {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "ec2:CreateSnapshot"
                                ],
                                "Resource": [
                                    "*"
                                ]
                            }
                        ]
                    }
                },
                {
                    'PolicyName': "CreateDBSnapshot",
                    'PolicyDocument': {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "rds:CreateDBSnapshot"
                                ],
                                "Resource": [
                                    "*"
                                ]
                            }
                        ]
                    }
                },
                {
                    'PolicyName': "CreateTags",
                    'PolicyDocument': {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "ec2:CreateTags"
                                ],
                                "Resource": "*"
                            }
                        ]
                    }
                },
                {
                    "PolicyName": "CognitoAccess",
                    "PolicyDocument": {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "cognito-identity:ListIdentityPools",
                                ],
                                "Resource": "arn:aws:cognito-identity:*"
                            },
                            {
                                "Effect": "Allow",
                                "Action": [
                                    "cognito-identity:"
                                    "GetOpenIdTokenForDeveloperIdentity"
                                ],
                                "Resource": {
                                    "Fn::Sub": [
                                        "arn:aws:cognito-identity:"
                                        "${AWS::Region}:${AWS::AccountId}:"
                                        "identitypool/${PoolId}",
                                        {
                                            "PoolId":
                                                config[
                                                    'COGNITO_IDENTITY_POOL_ID'
                                                ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        })
    )

    cft.resources.mount = core.Resource(
        'RefineryVolume', 'AWS::EC2::VolumeAttachment',
        core.Properties({
            'Device': '/dev/xvdr',
            'InstanceId': functions.ref('WebInstance'),
            'VolumeId': functions.ref('RefineryData'),
        })
    )

    # ELB per
    # http://cfn-pyplates.readthedocs.io/en/latest/examples/options/template.html

    # Insecure, Port 80, HTTP listener
    http_listener = {
        'LoadBalancerPort': '80',
        'Protocol': 'HTTP',
        'InstanceProtocol': 'HTTP',
        'InstancePort': '80',
        'PolicyNames': []
    }
    listeners = [http_listener]

    if 'TLS_CERTIFICATE' in config:
        # Secure, Port 443, HTTPS listener
        https_listener = {
            'LoadBalancerPort': '443',
            'Protocol': 'HTTPS',
            'InstanceProtocol': 'HTTP',
            'InstancePort': '80',
            'PolicyNames': [],
            'SSLCertificateId': config['TLS_CERTIFICATE']
        }
        listeners.append(https_listener)

    cft.resources.elb = core.Resource(
        'LoadBalancer', 'AWS::ElasticLoadBalancing::LoadBalancer',
        {
            'AccessLoggingPolicy': {
                'EmitInterval': functions.ref('LogInterval'),
                'Enabled': True,
                'S3BucketName': config['S3_LOG_BUCKET'],
                # 'S3BucketPrefix' unused
            },
            'ConnectionSettings': {
                'IdleTimeout': 180  # seconds
            },
            'HealthCheck': {
                'HealthyThreshold': '2',
                'Interval': '30',
                'Target': 'HTTP:80/',
                'Timeout': '5',
                'UnhealthyThreshold': '4'
            },
            'Instances': [functions.ref('WebInstance')],
            'LoadBalancerName': config['STACK_NAME'],
            'Listeners': listeners,
            'SecurityGroups': [config['ELB_SECURITY_GROUP_ID']],
            'Subnets': [config["PUBLIC_SUBNET_ID"]],
            'Tags': load_tags(),
        })
    cft.parameters.add(
        core.Parameter('LogInterval', 'Number', {
                'Default': 60,
                'Description':
                "How often, in minutes, the ELB emits its logs to the "
                "configured S3 bucket. The ELB log facility restricts "
                "this to be 5 or 60.",
            }
        )
    )

    return cft


if __name__ == '__main__':
    main()
