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

import tags

# Simulate the environment that "cfn_generate" runs scripts in.
# http://cfn-pyplates.readthedocs.org/en/latest/advanced.html#generating-templates-in-python
from cfn_pyplates import core
from cfn_pyplates import functions

cft = core.CloudFormationTemplate(description="refinery EBS volume.")

# http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-ebs-volume.html
cft.resources.ebs = core.Resource(
    'RefineryData', 'AWS::EC2::Volume',
    core.Properties({
        'AvailabilityZone': 'us-east-1b',
        'Encrypted': True,
        'Size': 10,
        'Tags': tags.load(),
        'VolumeType': 'gp2'
    })
)

cft.outputs.ebs = core.Output(
     "Volume", functions.ref('RefineryData'), "Volume ID")

print(str(cft))
