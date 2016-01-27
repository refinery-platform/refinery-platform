# This is a cfn-pyplates template file
# for generating deploy.json,
# which is an AWS CloudFormation json file.
# See https://github.com/parklab/refinery-platform/wiki/AWS-installation
# for notes on how to use this to deploy to Amazon AWS.
# Instance are configured using CloudInit


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

cft = CloudFormationTemplate(description="refinery monolithic template.")

# We discover the current git branch
# so that the deployment script can use it
# to clone the same branch.
branch = os.popen("""git branch | awk '$1=="*"{print $2}'""").read()
assert branch

# The userdata script is executed via cloudinit.
# It's made by concatenating a block of parameter variables,
# with the bootstrap.sh script,
# and the aws.sh script.
user_data_script = join(
        "",
        "#!/bin/sh\n",
        "RDS_NAME=", ref("RDSName"), "\n",
        "GIT_BRANCH=", branch, "\n",
        open('bootstrap.sh').read(),
        open('aws.sh').read())

cft.resources.ec2_instance = Resource(
    'MonolithicInstance', 'AWS::EC2::Instance',
    Properties({
        'ImageId': 'ami-d05e75b8',
        'InstanceType': 'm3.medium',
        'UserData': base64(user_data_script),
        'KeyName': 'id_rsa',
        'IamInstanceProfile': 'refinery-web',
        'Tags': [{'Key': 'refinery', 'Value': 'refinery'}],
    })
)


cft.parameters.add(Parameter(
    'RDSName', 'String',
    {
        'Description': 'Name of the RDS to connect to',
    })
)
