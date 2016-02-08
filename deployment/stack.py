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

import os       # for os.popen
import sys      # sys.stderr, sys.exit, and so on

# https://pypi.python.org/pypi/PyYAML/3.11
import yaml

# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates.core import *
from cfn_pyplates.functions import *


class ConfigError(Exception):
    pass


def main():
    config = load_config()
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
        "GIT_BRANCH=", commit, "\n",
        "\n",
        open('bootstrap.sh').read(),
        open('aws.sh').read())

    cft.resources.ec2_instance = Resource(
        'WebInstance', 'AWS::EC2::Instance',
        Properties({
            'ImageId': 'ami-d05e75b8',
            'InstanceType': 'm3.medium',
            'UserData': base64(user_data_script),
            'KeyName': 'id_rsa',
            'IamInstanceProfile': 'refinery-web',
            'Tags': [{'Key': 'refinery', 'Value': 'refinery'}],
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
    config_path = "stack-config.yaml"
    with open(config_path) as f:
        config = yaml.load(f)

    # Collect and report list of missing keys.
    required = ['VOLUME']
    bad = []
    for key in required:
        if key not in config:
            bad.append(key)
    if bad:
        sys.stderr.write("{:s} must have values for:\n{!r}\n".format(
            config_path, bad))
        raise ConfigError()

    config.setdefault('RDS_SUPERUSER_PASSWORD', 'mypassword')
    config.setdefault('RDS_NAME', 'rds-refinery')
    return config


if __name__ == '__main__':
    sys.exit(main())
