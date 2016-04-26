#!/usr/bin/env python

"""
Script to generate CloudFormation JSON files via cfn-pyplates.

Usage:
python stack.py > web.json

(Usually invoked via the Makefile:
 make web.json
 or
 make web-stack
)
"""

# This Python script is
# a more explicit version of
# a cfn-pyplates template file.
# It generates one or more
# CloudFormation JSON files.
#
# See https://github.com/parklab/refinery-platform/wiki/AWS-installation
# for notes on how to use this to deploy to Amazon AWS.
#
# Instances are configured using CloudInit.
#
#
# REFERENCES
#
# cfn-pyplates:
#   https://cfn-pyplates.readthedocs.org/en/latest/index.html
# AWS Cloudformation
#   https://aws.amazon.com/cloudformation/
# CloudInit
#   https://help.ubuntu.com/community/CloudInit

import datetime
import glob
import json     # for json.dumps
import os       # for os.popen
import sys      # sys.stderr, sys.exit, and so on

# https://pypi.python.org/pypi/boto3
import boto3
# https://pypi.python.org/pypi/PyYAML/3.11
import yaml

import tags

# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates import core
from cfn_pyplates import functions


class ConfigError(Exception):
    pass


def main():
    config = load_config()

    # The Availability Zone of the new instance needs to match
    # the availability zone of the existing EBS.
    derive_config(config)

    unique_suffix = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M")

    # We discover the current git branch/commit
    # so that the deployment script can use it
    # to clone the same commit.
    commit = os.popen("""git rev-parse HEAD""").read().rstrip()
    assert commit

    assert "'" not in config['SITE_NAME']

    instance_tags = tags.load()
    # Set the `Name` as it appears on the EC2 web UI.
    instance_tags.append({'Key': 'Name',
                         'Value': "refinery-web-" + unique_suffix})

    config['tags'] = instance_tags

    config_uri = save_s3_config(config, unique_suffix)
    sys.stderr.write("Configuration saved to {}\n".format(config_uri))

    # The userdata script is executed via CloudInit.
    # It's made by concatenating a block of parameter variables,
    # with the bootstrap.sh script,
    # and the aws.sh script.
    user_data_script = functions.join(
        "",
        "#!/bin/sh\n",
        "AWS_DEFAULT_REGION=", functions.ref("AWS::Region"), "\n",
        "RDS_NAME=", config['RDS_NAME'], "\n",
        "RDS_SUPERUSER_PASSWORD=", config['RDS_SUPERUSER_PASSWORD'], "\n",
        "RDS_ROLE=", config['RDS_ROLE'], "\n",
        "ADMIN=", config['ADMIN'], "\n",
        "DEFAULT_FROM_EMAIL=", config['DEFAULT_FROM_EMAIL'], "\n",
        "SERVER_EMAIL=", config['SERVER_EMAIL'], "\n",
        "IAM_SMTP_USER=", functions.ref('RefinerySMTPUser'), "\n",
        "S3_CONFIG_URI=", config['S3_CONFIG_URI'], "\n",
        "SITE_URL=", config['SITE_URL'], "\n",
        # May contain spaces, but can't contain "'"
        "SITE_NAME='", config['SITE_NAME'], "'\n",
        "GIT_BRANCH=", commit, "\n",
        "\n",
        open('bootstrap.sh').read(),
        open('aws.sh').read())

    cft = core.CloudFormationTemplate(description="refinery platform.")

    cft.resources.ec2_instance = core.Resource(
        'WebInstance', 'AWS::EC2::Instance',
        core.Properties({
            'AvailabilityZone': config['AVAILABILITY_ZONE'],
            'ImageId': 'ami-d05e75b8',
            'InstanceType': 'm3.medium',
            'UserData': functions.base64(user_data_script),
            'KeyName': 'id_rsa',
            'IamInstanceProfile': functions.ref('WebInstanceProfile'),
            'Tags': instance_tags,
        })
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
                'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'
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
                }
            ]
        })
    )

    cft.resources.smtp_user = core.Resource(
        'RefinerySMTPUser', 'AWS::IAM::User',
        core.Properties({
            'Policies': [{
                'PolicyName': "SESSendingAccess",
                'PolicyDocument': {
                    "Version": "2012-10-17",
                    "Statement": [{
                        "Effect": "Allow",
                        "Action": "ses:SendRawEmail",
                        "Resource": "*"
                    }]
                }
            }]
        })
    )

    cft.resources.mount = core.Resource(
        'RefineryVolume', 'AWS::EC2::VolumeAttachment',
        core.Properties({
            'Device': '/dev/xvdr',
            'InstanceId': functions.ref('WebInstance'),
            'VolumeId': config['VOLUME']
        })
    )

    print(str(cft))


def load_config():
    """
    Configuration is loaded from the aws-config/ directory.
    All the YAML files are loaded in ASCIIbetical order.
    """

    config_dir = "aws-config"
    pattern = os.path.join(config_dir, "*.yaml")

    config = {}
    for config_filename in sorted(glob.glob(pattern)):
        with open(config_filename) as f:
            y = yaml.load(f)
            if y:
                config.update(y)

    # Collect and report list of missing keys.
    required = ['SITE_NAME', 'SITE_URL', 'VOLUME', 'ADMIN_PASSWORD']
    bad = []
    for key in required:
        if key not in config:
            bad.append(key)
    if bad:
        sys.stderr.write("{:s} must have values for:\n{!r}\n".format(
            config_dir, bad))
        raise ConfigError()

    config.setdefault('RDS_SUPERUSER_PASSWORD', 'mypassword')
    config.setdefault('RDS_NAME', 'rds-refinery')
    return config


def save_s3_config(config, suffix):
    """
    Save the config as an S3 object in an S3 bucket.
    If the config has an 'S3_CONFIG_BUCKET' key,
    then that is used for the name of the S3 bucket;
    otherwise an S3 bucket is created,
    and its name is written to a config file in `aws-config` ,
    so that it will be re-used next time.

    A URI in the form s3://bucket/key is returned;
    this URI refers to the S3 object that is created.
    """

    # http://boto3.readthedocs.org/en/latest/guide/migrations3.html
    s3 = boto3.resource('s3')

    if 'S3_CONFIG_BUCKET' not in config:
        # Name and create a bucket.
        bucket_name = 'refinery-' + random_alnum(13)
        s3.create_bucket(Bucket=bucket_name)
        s3_config = dict(S3_CONFIG_BUCKET=bucket_name)

        # Write bucket name to config file,
        # so that subsequent launches can re-use it.
        with open('aws-config/20generated-s3-config.yaml', 'w') as o:
            o.write("# Automatically generated by stack.py\n")
            yaml.dump(s3_config, stream=o)

        config.update(s3_config)

    bucket_name = config['S3_CONFIG_BUCKET']

    object_name = ("refinery-config-" + suffix)

    s3_uri = "s3://{}/{}".format(bucket_name, object_name)
    config['S3_CONFIG_URI'] = s3_uri

    # Store config as JSON in S3 object.
    s3_object = s3.Object(bucket_name, object_name)
    s3_object.put(Body=json.dumps(config, indent=2))
    return s3_uri


def random_alnum(n):
    """
    Random alphanumeric (digits and lowercase) string
    of length `n`.
    """

    import random
    import string

    return ''.join(
        random.choice(string.ascii_lowercase + string.digits)
        for _ in range(n))


def derive_config(config):
    """
    Modify `config` so that extra, derived, configuration is
    added to it.

    The only case at the moment is that the availability zone of
    the VOLUME is added so that the instance can share the same
    availability zone.
    """

    # Discover the Availability Zone for the volume,
    # and add it to the config.
    ec2 = boto3.resource('ec2')
    volume = ec2.Volume(config['VOLUME'])
    # http://boto3.readthedocs.org/en/latest/reference/services/ec2.html#volume
    az = volume.availability_zone

    # If AVAILABILITY_ZONE is already set, it must match.
    if 'AVAILABILITY_ZONE' in config:
        assert config['AVAILABILITY_ZONE'] == az

    config['AVAILABILITY_ZONE'] = az


if __name__ == '__main__':
    sys.exit(main())
