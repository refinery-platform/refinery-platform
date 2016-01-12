# This is a cfn-pyplates template file
# for generating
# an AWS CloudFormation json file.
# See AWS.md for notes on how to use this
# to deploy to Amazon AWS.
#
# REFERENCES
#
# cfn-pyplates:
#   https://cfn-pyplates.readthedocs.org/en/latest/index.html

import os       # for os.popen

cft = CloudFormationTemplate(description="refinery monolithic template.")

branch = os.popen("""git branch | awk '$1=="*"{print $2}'""").read()
assert branch

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
