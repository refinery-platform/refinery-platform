#!/usr/bin/env python

"""
Script to generate AWS CloudFormation template for Refinery Platform storage
stacks

Requires STACK_NAME to be defined in aws-config/config.yaml

For details:
https://github.com/refinery-platform/refinery-platform/wiki/AWS-installation
"""

import json
import sys
import yaml

import boto3
from cfn_pyplates.core import (CloudFormationTemplate, DeletionPolicy,
                               Output, Parameter, Properties, Resource)
from cfn_pyplates.functions import ref

REFINERY_CONFIG_FILE = 'aws-config/config.yaml'


def main():
    with open(REFINERY_CONFIG_FILE) as config_file:
        config = yaml.load(config_file)
    stack_name = config['STACK_NAME'] + '-storage'
    static_bucket_name = config['STACK_NAME'] + '-static'
    media_bucket_name = config['STACK_NAME'] + '-media'
    template = make_storage_template()

    cloudformation = boto3.client('cloudformation')
    response = cloudformation.create_stack(
        StackName=stack_name,
        TemplateBody=template,
        Parameters=[
            {
                'ParameterKey': 'StaticBucketName',
                'ParameterValue': static_bucket_name,
            },
            {
                'ParameterKey': 'MediaBucketName',
                'ParameterValue': media_bucket_name,
            },
        ],
    )
    sys.stdout.write("{}\n".format(json.dumps(response, indent=2)))


def make_storage_template():
    cft = CloudFormationTemplate(description="Refinery Platform storage")
    # Parameters
    cft.parameters.add(Parameter(
        'StaticBucketName',
        'String',
        {
            'Description': 'Name of S3 bucket for Django static files',
        }
    ))
    cft.parameters.add(Parameter(
        'MediaBucketName',
        'String',
        {
            'Description': 'Name of S3 bucket for Django media files',
            # make names DNS-compliant without periods (".") for compatibility
            # with virtual-hosted-style access and S3 Transfer Acceleration
            'AllowedPattern': '[a-z0-9\-]+',
            'ConstraintDescription':
                'must only contain lower case letters, numbers, and dashes',
        }
    ))
    # Resources
    cft.resources.add(Resource(
        'StaticStorageBucket',
        'AWS::S3::Bucket',
        Properties({
            'BucketName': ref('StaticBucketName'),
            'AccessControl': 'PublicRead',
            'CorsConfiguration': {
                'CorsRules': [
                    {
                        'AllowedOrigins': ['*'],
                        'AllowedMethods': ['GET'],
                        'AllowedHeaders': ['Authorization'],
                        'MaxAge': 3000,
                    }
                ]
            }
        }),
        DeletionPolicy('Retain'),
    ))
    cft.resources.add(Resource(
        'MediaStorageBucket',
        'AWS::S3::Bucket',
        Properties({
            'BucketName': ref('MediaBucketName'),
            'AccessControl': 'PublicRead',
        }),
        DeletionPolicy('Retain'),
    ))
    cft.outputs.add(Output(
        'MediaBucketName',
        ref('MediaBucketName'),
        'Name of S3 bucket for Django media files',
    ))
    return str(cft)


if __name__ == '__main__':
    main()
