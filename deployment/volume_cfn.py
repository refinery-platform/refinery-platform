# This is a cfn-pyplates template file
# for generating ebs.json,
# which is an AWS CloudFormation json file.
#
# This is for creating an EBS volume.
#
# See https://github.com/parklab/refinery-platform/wiki/AWS-installation
# for notes on how to use this is used as part of AWS deployment.

#
# REFERENCES
#
# cfn-pyplates:
#   https://cfn-pyplates.readthedocs.org/en/latest/index.html
# AWS Cloudformation
#   https://aws.amazon.com/cloudformation/

import random

# local
import tags

# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates import core
from cfn_pyplates import functions


def main():
    cft = core.CloudFormationTemplate(description="refinery EBS volume.")

    az = choose_availability_zone()

    # http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-ebs-volume.html
    cft.resources.ebs = core.Resource(
        'RefineryData', 'AWS::EC2::Volume',
        core.Properties({
            'AvailabilityZone': az,
            'Encrypted': True,
            'Size': 100,
            'Tags': tags.load(),
            'VolumeType': 'gp2'
        })
    )

    cft.outputs.ebs = core.Output(
         "Volume", functions.ref('RefineryData'), "Volume ID")

    print(str(cft))


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
    main()
