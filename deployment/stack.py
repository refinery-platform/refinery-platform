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

import glob
import os       # for os.popen
import sys      # sys.stderr, sys.exit, and so on

# https://pypi.python.org/pypi/PyYAML/3.11
import yaml

import tags

# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates.core import *
from cfn_pyplates.functions import *


class ConfigError(Exception):
    pass


def main():
    config = load_config()

    # The Availability Zone of the new instance needs to match
    # the availability zone of the existing EBS.
    derive_config(config)

    cft = CloudFormationTemplate(description="refinery platform.")

    # We discover the current git branch/commit
    # so that the deployment script can use it
    # to clone the same commit.
    commit = os.popen("""git rev-parse HEAD""").read().rstrip()
    assert commit

    # The userdata script is executed via CloudInit.
    # It's made by concatenating a block of parameter variables,
    # with the bootstrap.sh script,
    # and the aws.sh script.
    user_data_script = join(
        "",
        "#!/bin/sh\n",
        "RDS_NAME=", config['RDS_NAME'], "\n",
        "RDS_SUPERUSER_PASSWORD=", config['RDS_SUPERUSER_PASSWORD'], "\n",
        "RDS_ROLE=", config['RDS_ROLE'], "\n",
        "ADMIN=", config['ADMIN'], "\n",
        "DEFAULT_FROM_EMAIL=", config['DEFAULT_FROM_EMAIL'], "\n",
        "EMAIL_HOST_USER=", config['EMAIL_HOST_USER'], "\n",
        "EMAIL_HOST_PASSWORD=", config['EMAIL_HOST_PASSWORD'], "\n",
        "GIT_BRANCH=", commit, "\n",
        "\n",
        open('bootstrap.sh').read(),
        open('aws.sh').read())

    cft.resources.ec2_instance = Resource(
        'WebInstance', 'AWS::EC2::Instance',
        Properties({
            'AvailabilityZone': config['AVAILABILITY_ZONE'],
            'ImageId': 'ami-d05e75b8',
            'InstanceType': 'm3.medium',
            'UserData': base64(user_data_script),
            'KeyName': 'id_rsa',
            'IamInstanceProfile': 'refinery-web',
            'Tags': tags.load(),
        })
    )

    cft.resources.mount = Resource(
        'RefineryVolume', 'AWS::EC2::VolumeAttachment',
        Properties({
            'Device': '/dev/xvdr',
            'InstanceId': ref('WebInstance'),
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
    required = ['VOLUME']
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


def derive_config(config):
    """
    Modify `config` so that extra, derived, configuration is
    added to it.

    The only case at the moment is that the availability zone of
    the VOLUME is added so that the instance can share the same
    availability zone.
    """

    import boto3

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
