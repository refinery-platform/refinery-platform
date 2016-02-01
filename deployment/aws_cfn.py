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

# We discover the current git branch/commit
# so that the deployment script can use it
# to clone the same branch.
# (we actually record a commit hash, but it
# works just like a branch).
branch = os.popen("""git rev-parse HEAD""").read().rstrip()
assert branch

# The userdata script is executed via cloudinit.
# It's made by concatenating a block of parameter variables,
# with the bootstrap.sh script,
# and the aws.sh script.
user_data_script = join(
        "",
        "#!/bin/sh\n",
        "RDS_NAME=", ref("RDSName"), "\n",
        "RDS_SUPERUSER_PASSWORD=", ref("RDSSuperuserPassword"), "\n",
        "GIT_BRANCH=", branch, "\n",
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
        'Device': '/dev/xvdh',
        'InstanceId': ref('WebInstance'),
        'VolumeId': ref('Volume'),
    })
)

parameters = [
    Parameter(
        'RDSName', 'String',
        {
            'Description': 'Name of the RDS to connect to',
            'Default': 'rds-refinery',
        }),
    Parameter(
        'RDSSuperuserPassword', 'String',
        {
            'Description': 'Password for the root account on the RDS',
            'Default': 'mypassword',
        }),
    Parameter(
        'Volume', 'String',
        {
            'Description': 'Volume ID of EC2 volume to mount for data',
            'Default': 'vol-db678e04',
        })
]

for parameter in parameters:
    cft.parameters.add(parameter)
