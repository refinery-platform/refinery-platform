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
import json     # for json.dumps
import os       # for os.popen, os.urandom
import random
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

    rds_properties = {
        "AllocatedStorage": "5",
        "AvailabilityZone": config['AVAILABILITY_ZONE'],
        "BackupRetentionPeriod": "0",
        "DBInstanceClass": "db.t2.small",       # todo:?
        "DBInstanceIdentifier": config['RDS_NAME'],
        "Engine": "postgres",
        "EngineVersion": "9.3.10",
        # "KmsKeyId" ?
        "MasterUsername": "root",
        "MasterUserPassword": "mypassword",
        "MultiAZ": False,
        "Port": "5432",
        "PubliclyAccessible": False,
        "StorageType": "gp2",
        "Tags": instance_tags,  # todo: Should be different?
    }

    if 'RDS_SNAPSHOT' in config:
        rds_properties['DBSnapshotIdentifier'] = config['RDS_SNAPSHOT']

    cft.resources.rds_instance = core.Resource(
        'RDSInstance', 'AWS::RDS::DBInstance',
        core.Properties(rds_properties),
        core.DeletionPolicy("Snapshot"),
        )

    volume_properties = {
        'AvailabilityZone': config['AVAILABILITY_ZONE'],
        'Encrypted': True,
        'Size': config['DATA_VOLUME_SIZE'],
        'Tags': tags.load(),
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
            'AvailabilityZone': config['AVAILABILITY_ZONE'],
            'ImageId': 'ami-d05e75b8',
            'InstanceType': 'm3.medium',
            'UserData': functions.base64(user_data_script),
            'KeyName': config['KEY_NAME'],
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
            'VolumeId': functions.ref('RefineryData'),
        })
    )

    print(str(cft))


def load_config():
    """
    Configuration is loaded from the aws-config/ directory.
    Two files of config are used:
    `config.yaml`
    `auto-config.yaml`

    `config.yaml` is intended to be edited by hand;
    `auto-config.yaml` is only intended to be generated
    automatically, by this script.
    """

    # Load config (from two files) and place in unified_config.

    manual_config = _load_config_file("config.yaml")
    try:
        auto_config = _load_config_file("auto-config.yaml")
    except IOError:
        auto_config = {}

    duplicated_keys = (set(manual_config.keys()) &
                       set(auto_config.keys()))

    for k in duplicated_keys:
        sys.stderr.write(
            "Key {!r} found in more than one config file;\n"
            "Using value in `config.yaml`\n")

    config = {}
    config.update(auto_config)
    config.update(manual_config)

    # Generate warning for old keys that we no longer use.

    ignored = ['VOLUME']
    bad = []
    for key in ignored:
        if key in config:
            bad.append(key)
    if bad:
        sys.stderr.write("{:s} no longer used, ignoring\n".format(
            bad))

    # Generate some special keys that are optional to specify.
    if 'ADMIN_PASSWORD' not in config:
        auto_config['ADMIN_PASSWORD'] = random_password(8)

    if 'S3_CONFIG_BUCKET' not in config:
        bucket_name = create_random_s3_bucket()

        auto_config['S3_CONFIG_BUCKET'] = bucket_name

    # Save the automatically generated config
    with open("aws-config/auto-config.yaml", 'w') as o:
        o.write("# Automatically generated by stack.py\n")
        o.write("# on {} UTC\n".format(datetime.datetime.utcnow()))
        yaml.dump(auto_config, stream=o)

    # Update the config, now that we have added the
    # automatically generated keys.
    config.update(auto_config)

    report_missing_keys(config)

    # Not stored in `auto-config.yaml` because we don't
    # want or need to use the same name again.
    if 'RDS_NAME' not in config:
        config['RDS_NAME'] = "rds-refinery-" + random_alnum(7)

    return config


def _load_config_file(filename):
    """
    Load a single file.
    """

    config_dir = "aws-config"
    full_path = os.path.join(config_dir, filename)

    with open(full_path) as f:
        y = yaml.load(f)
        if y:
            return y

    # Convert "null" to empty dict()
    return {}


def create_random_s3_bucket():
    """
    Choose a random bucket name and create the S3 bucket.
    """

    # http://boto3.readthedocs.org/en/latest/guide/migrations3.html
    s3 = boto3.resource('s3')

    bucket_name = 'refinery-' + random_alnum(13)
    s3.create_bucket(Bucket=bucket_name)
    return bucket_name


def save_s3_config(config, suffix):
    """
    Save the config as an S3 object in an S3 bucket.
    The config must have an 'S3_CONFIG_BUCKET' key,
    which is used for the name of the S3 bucket;

    A URI in the form s3://bucket/key is returned;
    this URI refers to the S3 object that is created.
    """

    # http://boto3.readthedocs.org/en/latest/guide/migrations3.html
    s3 = boto3.resource('s3')

    bucket_name = config['S3_CONFIG_BUCKET']

    object_name = ("refinery-config-" + suffix)

    s3_uri = "s3://{}/{}".format(bucket_name, object_name)
    config['S3_CONFIG_URI'] = s3_uri

    # Store config as JSON in S3 object.
    s3_object = s3.Object(bucket_name, object_name)
    s3_object.put(Body=json.dumps(config, indent=2))
    return s3_uri


def report_missing_keys(config):
    """
    Collect and report list of missing keys.
    """

    required = [
        'KEY_NAME', 'RDS_SUPERUSER_PASSWORD',
        'SITE_NAME', 'SITE_URL', 'ADMIN_PASSWORD']
    bad = []
    for key in required:
        if key not in config:
            bad.append(key)
    if bad:
        sys.stderr.write("aws-config\ must have values for:\n{!r}\n".format(
            bad))
        raise ConfigError()
    return True


def random_alnum(n):
    """
    Random alphanumeric (digits and lowercase) string
    of length `n`.
    """

    import string

    return ''.join(
        random.choice(string.ascii_lowercase + string.digits)
        for _ in range(n))


def random_password(n):
    """
    Generate a random password using `n` bytes of randomness.
    """

    import binascii

    password = binascii.b2a_hex(os.urandom(n))
    return password


def derive_config(config):
    """
    Modify `config` so that extra, derived, configuration is
    added to it.

    The only case at the moment is that
    (unless already supplied)
    an availability zone is selected
    (at random).
    """

    if 'AVAILABILITY_ZONE' not in config:
        az = choose_availability_zone()
        config['AVAILABILITY_ZONE'] = az


def choose_availability_zone():
    """
    Choose, at random, an availability zone from amongst the
    zones available to this AWS account
    (the list of zones varies from account to account).
    """

    # http://boto3.readthedocs.org/en/latest/
    import boto3

    ec2 = boto3.client('ec2')

    # http://boto3.readthedocs.org/en/latest/reference/services/ec2.html#EC2.Client.describe_availability_zones
    res = ec2.describe_availability_zones()

    zones = res['AvailabilityZones']
    zoneids = [z['ZoneName'] for z in zones]
    return random.choice(zoneids)


if __name__ == '__main__':
    sys.exit(main())
