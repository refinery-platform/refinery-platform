#! /usr/bin/env python
# Create an AWS CloudFormation stack for the
# EBS Snapshot Scheduler
# https://aws.amazon.com/answers/infrastructure-management/ebs-snapshot-scheduler/

"""
Creates a stack in your AWS account
for the EBS Snapshot Scheduler.
"""

import json
import sys

# http://boto3.readthedocs.io/en/latest/index.html
import boto3


def main():
    cloudformation = boto3.client('cloudformation')

    parameters_as_dict = dict(
        AutoSnapshotDeletion='Yes',
        SendAnonymousData='No',
    )
    parameters = [{
        'ParameterKey': key,
        'ParameterValue': value
        } for key, value in parameters_as_dict.items()]

    response = cloudformation.create_stack(
        StackName='EBSSnapshotScheduler',
        TemplateURL='https://s3.amazonaws.com/solutions-reference/ebs-snapshot-scheduler/latest/ebs-snapshot-scheduler.template',  # noqa: E501
        Parameters=parameters,
        Capabilities=['CAPABILITY_IAM'],
    )
    sys.stdout.write(json.dumps(response, indent=2) + '\n')
    return 0


if __name__ == '__main__':
    main()
