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

import glob
import os       # for os.popen

import yaml

# Get the local user's email address
email = os.popen("git config --get user.email").read().rstrip()


def load_tags():
    """
    Tags come from the YAML files in the aws-tags directory,
    additionally, the tag `owner` if it is not set by those YAML
    files, will be set to the email address of the local git
    user.
    """

    tags = {}
    for filename in sorted(glob.glob("aws-tags/*")):
        with open(filename) as f:
            tags.update(yaml.load(f))
    if 'owner' not in tags:
        tags['owner'] = email

    return [{'Key': k, 'Value': v} for k, v in tags.items()]

cft = CloudFormationTemplate(description="refinery EBS volume.")

# http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-ebs-volume.html
cft.resources.ebs = Resource(
    'RefineryData', 'AWS::EC2::Volume',
    Properties({
        'AvailabilityZone': 'us-east-1b',
        'Encrypted': True,
        'Size': 10,
        'Tags': load_tags(),
        'VolumeType': 'gp2'
    })
)

cft.outputs.ebs = Output(
     "Volume", ref('RefineryData'), "Volume ID")
