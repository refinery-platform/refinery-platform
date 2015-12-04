# This is a cfn-pyplates template file
# for generating
# an AWS CloudFormation json file.
# See AWS.md for notes on how to use this
# to deply to Amazon AWS.

import os       # for os.popen

cft = CloudFormationTemplate(description="refinery monolithic template.")
branch = os.popen("""git branch | awk '$1=="*"{print $2}'""").read()
assert branch

user_data_script = (
    open('bootstrap.sh').read() +
    "GIT_BRANCH={}\n".format(branch) +
    open('aws.sh').read())

cft.resources.ec2_instance = Resource(
    'MonolithicInstance', 'AWS::EC2::Instance',
    Properties({
        'ImageId': 'ami-d05e75b8',
        'InstanceType': 'm3.medium',
        'UserData': base64(user_data_script),
        'KeyName': 'id_rsa',
        'Tags': [{'Key': 'refinery', 'Value': 'refinery'}],
    })
)
