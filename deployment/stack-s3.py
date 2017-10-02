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

import boto3
from cfn_pyplates.core import (CloudFormationTemplate, DeletionPolicy,
                               Parameter, Properties, Resource)
from cfn_pyplates.functions import ref
from utils import Output, load_tags
import yaml

REFINERY_CONFIG_FILE = 'aws-config/config.yaml'


def main():
    try:
        with open(REFINERY_CONFIG_FILE) as config_file:
            config = yaml.load(config_file)
    except (IOError, yaml.YAMLError) as exc:
        sys.stderr.write(
            "Error reading {}: {}\n".format(REFINERY_CONFIG_FILE, exc)
        )
        raise RuntimeError

    stack_name = config['STACK_NAME'] + 'Storage'
    static_bucket_name = config['S3_BUCKET_NAME_BASE'] + '-static'
    media_bucket_name = config['S3_BUCKET_NAME_BASE'] + '-media'
    template = make_storage_template()

    cloudformation = boto3.client('cloudformation')
    response = cloudformation.create_stack(
        StackName=stack_name,
        TemplateBody=str(template),
        Tags=load_tags(),
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
                'must only contain lower case letters, numbers, and hyphens',
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
            },
        }),
        DeletionPolicy('Retain'),
    ))
    cft.resources.add(Resource(
        'MediaStorageBucket',
        'AWS::S3::Bucket',
        Properties({
            'BucketName': ref('MediaBucketName'),
            'AccessControl': 'PublicRead',
            'CorsConfiguration': {
                'CorsRules': [
                    {
                        'AllowedOrigins': ['*'],
                        'AllowedMethods': ['POST', 'PUT', 'DELETE'],
                        'AllowedHeaders': ['*'],
                        'ExposedHeaders': ['ETag'],
                        'MaxAge': 3000,
                    }
                ]
            }
        }),
        DeletionPolicy('Retain'),
    ))
    cft.outputs.add(Output(
        'MediaBucketName',
        ref('MediaStorageBucket'),
        {'Fn::Sub': '${AWS::StackName}Media'},
        'Name of S3 bucket for Django media files'
    ))

    return cft


if __name__ == '__main__':
    main()
