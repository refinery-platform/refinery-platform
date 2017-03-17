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
# See
# https://github.com/refinery-platform/refinery-platform/wiki/AWS-installation
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

import base64
import datetime
import json
import os
import random
import sys

import boto3
# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates import core
from cfn_pyplates import functions
import yaml


class ConfigError(Exception):
    pass


def main():
    config, config_yaml = load_config()

    derive_config(config)

    unique_suffix = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M")

    # We discover the current git branch/commit
    # so that the deployment script can use it
    # to clone the same commit.
    commit = os.popen("""git rev-parse HEAD""").read().rstrip()
    assert commit

    assert "'" not in config['SITE_NAME']

    instance_tags = load_tags()

    # Set the `Name` as it appears on the EC2 web UI.
    instance_tags.append({'Key': 'Name',
                         'Value': "refinery-web-" + unique_suffix})

    config['tags'] = instance_tags

    config_uri = save_s3_config(config, unique_suffix)
    sys.stderr.write("Configuration saved to {}\n".format(config_uri))

    tls_rewrite = "false"
    if 'TLS_CERTIFICATE' in config:
        tls_rewrite = "true"

    # The userdata script is executed via CloudInit.
    # It's made by concatenating a block of parameter variables,
    # with the bootstrap.sh script,
    # and the aws.sh script.
    user_data_script = functions.join(
        "",
        "#!/bin/sh\n",
        "CONFIG_YAML=", base64.b64encode(config_yaml), "\n",
        "CONFIG_JSON=", base64.b64encode(json.dumps(config)), "\n",
        "AWS_DEFAULT_REGION=", functions.ref("AWS::Region"), "\n",
        "RDS_ID=", functions.ref('RDSInstance'), "\n",
        "RDS_ENDPOINT_ADDRESS=",
        functions.get_att('RDSInstance', 'Endpoint.Address'),
        "\n",
        "RDS_ENDPOINT_PORT=",
        functions.get_att('RDSInstance', 'Endpoint.Port'),
        "\n",
        "RDS_SUPERUSER_PASSWORD=", config['RDS_SUPERUSER_PASSWORD'], "\n",
        "RDS_ROLE=", config['RDS_ROLE'], "\n",
        "ADMIN=", config['ADMIN'], "\n",
        "DEFAULT_FROM_EMAIL=", config['DEFAULT_FROM_EMAIL'], "\n",
        "SERVER_EMAIL=", config['SERVER_EMAIL'], "\n",
        "IAM_SMTP_USER=", functions.ref('RefinerySMTPUser'), "\n",
        "export FACTER_TLS_REWRITE=", tls_rewrite, "\n",
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
        "AutoMinorVersionUpgrade": False,
        "AvailabilityZone": config['AVAILABILITY_ZONE'],
        "BackupRetentionPeriod": "0",
        "CopyTagsToSnapshot": True,
        "DBInstanceClass": "db.t2.small",       # todo:?
        "DBInstanceIdentifier": config['RDS_NAME'],
        "Engine": "postgres",
        "EngineVersion": "9.3.14",
        # "KmsKeyId" ?
        "MasterUsername": "root",
        "MasterUserPassword": "mypassword",
        "MultiAZ": False,
        "Port": "5432",
        "PubliclyAccessible": False,
        "StorageType": "gp2",
        "Tags": instance_tags,  # todo: Should be different?
        "VPCSecurityGroups": [
            functions.get_att('RDSSecurityGroup', 'GroupId')],
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
        'Tags': load_tags(),
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
            'SecurityGroups': [
                functions.ref("InstanceSecurityGroup")],
            'Tags': instance_tags,
        }),
        core.DependsOn('RDSInstance'),
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

    # Security Group for Elastic Load Balancer
    # (public facing).
    cft.resources.elbsg = core.Resource(
        'ELBSecurityGroup', 'AWS::EC2::SecurityGroup',
        core.Properties({
            'GroupDescription': "Refinery ELB",
            # Egress Rule defined via
            # AWS::EC2::SecurityGroupEgress resource,
            # to avoid circularity (below).
            # See http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html # noqa: E501
            'SecurityGroupIngress': [
                {
                    "IpProtocol": "tcp",
                    "FromPort": "80",
                    "ToPort": "80",
                    "CidrIp": "0.0.0.0/0",
                },
                {
                    "IpProtocol": "tcp",
                    "FromPort": "443",
                    "ToPort": "443",
                    "CidrIp": "0.0.0.0/0",
                },
            ],
        })
    )

    cft.resources.elbegress = core.Resource(
        'ELBEgress', 'AWS::EC2::SecurityGroupEgress',
        core.Properties({
            "GroupId": functions.get_att('ELBSecurityGroup',
                                         'GroupId'),
            "IpProtocol": "tcp",
            "FromPort": "80",
            "ToPort": "80",
            "DestinationSecurityGroupId": functions.get_att(
                'InstanceSecurityGroup', 'GroupId'),
        })
    )

    # Security Group for EC2- instance.
    cft.resources.instancesg = core.Resource(
        'InstanceSecurityGroup', 'AWS::EC2::SecurityGroup',
        core.Properties({
            'GroupDescription': "Refinery EC2 Instance",
            'SecurityGroupEgress':  [],
            'SecurityGroupIngress': [
                {
                    "IpProtocol": "tcp",
                    "FromPort": "22",
                    "ToPort": "22",
                    "CidrIp": "0.0.0.0/0",
                },
                {
                    "IpProtocol": "tcp",
                    "FromPort": "80",
                    "ToPort": "80",
                    # "CidrIp": "0.0.0.0/0",
                    # Only accept connections from the ELB.
                    "SourceSecurityGroupId": functions.get_att(
                        'ELBSecurityGroup', 'GroupId'),
                },
            ],
        })
    )

    # Security Group for RDS instance.
    cft.resources.rdssg = core.Resource(
        'RDSSecurityGroup', 'AWS::EC2::SecurityGroup',
        core.Properties({
            'GroupDescription': "Refinery RDS",
            'SecurityGroupEgress':  [
                # We would like to remove all egress rules here,
                # but you can't do that with this version
                # of CloudFormation.
                # We decided that the hacky workarounds are
                # not worth it.
            ],
            'SecurityGroupIngress': [
                {
                    "IpProtocol": "tcp",
                    "FromPort": "5432",
                    "ToPort": "5432",
                    # Only accept connections from the
                    # Instance Security Group.
                    "SourceSecurityGroupId": functions.get_att(
                        'InstanceSecurityGroup', 'GroupId'),
                },
            ],
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
            'AvailabilityZones': [config['AVAILABILITY_ZONE']],
            'HealthCheck': {
                'HealthyThreshold': '2',
                'Interval': '30',
                'Target': 'HTTP:80/',
                'Timeout': '5',
                'UnhealthyThreshold': '4'
            },
            'Instances': [functions.ref('WebInstance')],

            'Listeners': listeners,
            'SecurityGroups': [
                functions.get_att('ELBSecurityGroup', 'GroupId')],
            "Tags": instance_tags,  # todo: Should be different?
            'ConnectionSettings': {
                'IdleTimeout': 1800  # seconds
            }
        })

    sys.stdout.write(str(cft))


def load_tags():
    """Load AWS resource tags from aws-config/tags.yaml"""
    tags = {}
    try:
        with open("aws-config/tags.yaml") as f:
            tags.update(yaml.load(f))
    except (IOError, yaml.YAMLError) as exc:
        sys.stderr.write("Error reading AWS resource tags: {}\n".format(exc))
        raise ConfigError()

    if 'owner' not in tags:
        tags['owner'] = os.popen("git config --get user.email").read().rstrip()

    return [{'Key': k, 'Value': v} for k, v in tags.items()]


def load_config():
    """
    Configuration is loaded from `aws-config/config.yaml`

    An automatically generated section
    (for a small number of keys) may be added to this file.

    A pair (dict, string) is returned:
    the config as a dictionary;
    and a string that is the contents of the file.
    """

    config = _load_config_file("config.yaml")

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
    generated_config = {}
    if 'ADMIN_PASSWORD' not in config:
        generated_config['ADMIN_PASSWORD'] = random_password(8)

    if 'S3_CONFIG_BUCKET' not in config:
        bucket_name = create_random_s3_bucket()
        generated_config['S3_CONFIG_BUCKET'] = bucket_name

    # Append the automatically generated config to config.yaml
    if generated_config:
        with open("aws-config/config.yaml", 'a') as o:
            o.write("# Automatically generated by stack.py\n")
            o.write("# on {} UTC\n".format(datetime.datetime.utcnow()))
            yaml.dump(generated_config,
                      stream=o,
                      default_flow_style=False)

    # Update the config, by adding the automatically generated keys.
    config.update(generated_config)

    report_missing_keys(config)

    # Not stored in `config.yaml` because we don't
    # want or need to use the same name again.
    if 'RDS_NAME' not in config:
        config['RDS_NAME'] = "rds-refinery-" + random_alnum(7)

    with open("aws-config/config.yaml", 'r') as f:
        config_string = f.read()

    return config, config_string


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
    """Collect and report list of missing keys"""

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
