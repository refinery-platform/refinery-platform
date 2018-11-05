#!/usr/bin/env python

# See
# https://github.com/refinery-platform/refinery-platform/wiki/AWS-installation
# for notes on how to use this to deploy to Amazon AWS
#
# References
# cfn-pyplates: https://cfn-pyplates.readthedocs.org/
# AWS Cloudformation: https://aws.amazon.com/cloudformation/
# CloudInit: https://help.ubuntu.com/community/CloudInit
import argparse
import json
import sys

import boto3
from cfn_pyplates import core, functions
from utils import load_config, load_tags

VERSION = '1.1'


def main():
    parser = argparse.ArgumentParser(
        version=VERSION,
        description="""Script to generate AWS CloudFormation JSON templates
        used to create Refinery Platform stacks"""
    )
    parser.add_argument(
        'command', choices=('name', 'dump', 'create')
    )
    args = parser.parse_args()

    config = load_config()

    if args.command == 'name':
        sys.stdout.write("{}\n".format(config['STACK_NAME']))
    elif args.command == 'dump':
        template = make_template(config)
        sys.stdout.write("{}\n".format(template))
    elif args.command == 'create':
        template = make_template(config)
        cloudformation = boto3.client('cloudformation')
        response = cloudformation.create_stack(
            StackName=config['STACK_NAME'],
            TemplateBody=str(template),
            Capabilities=['CAPABILITY_IAM'],
            Tags=load_tags()
        )
        sys.stdout.write("{}\n".format(json.dumps(response, indent=2)))


def make_template(config):
    """Make a fresh CloudFormation template object and return it"""

    instance_tags = load_tags()

    # Stack Name is also used for instances.
    instance_tags.append({'Key': 'Name',
                         'Value': config['STACK_NAME']})

    config['tags'] = instance_tags

    cft = core.CloudFormationTemplate(description="Refinery Platform main")

    # ELB per
    # http://cfn-pyplates.readthedocs.io/en/latest/examples/options/template.html

    # Insecure, Port 80, HTTP listener
    http_listener = {
        'LoadBalancerPort': '80',
        'Protocol': 'HTTP',
        'InstanceProtocol': 'HTTP',
        'InstancePort': '80',
        'PolicyNames': []
    }
    listeners = [http_listener]

    if 'TLS_CERTIFICATE' in config:
        # Secure, Port 443, HTTPS listener
        https_listener = {
            'LoadBalancerPort': '443',
            'Protocol': 'HTTPS',
            'InstanceProtocol': 'HTTP',
            'InstancePort': '80',
            'PolicyNames': [],
            'SSLCertificateId': config['TLS_CERTIFICATE']
        }
        listeners.append(https_listener)

    cft.resources.elb = core.Resource(
        'LoadBalancer', 'AWS::ElasticLoadBalancing::LoadBalancer',
        {
            'AccessLoggingPolicy': {
                'EmitInterval': functions.ref('LogInterval'),
                'Enabled': True,
                'S3BucketName': config['S3_LOG_BUCKET'],
                # 'S3BucketPrefix' unused
            },
            'ConnectionSettings': {
                'IdleTimeout': 180  # seconds
            },
            'HealthCheck': {
                'HealthyThreshold': '2',
                'Interval': '30',
                'Target': 'HTTP:80/',
                'Timeout': '5',
                'UnhealthyThreshold': '4'
            },
            'Instances': [config['APP_SERVER_INSTANCE_ID']],
            'LoadBalancerName': config['STACK_NAME'],
            'Listeners': listeners,
            'SecurityGroups': [config['ELB_SECURITY_GROUP_ID']],
            'Subnets': [config["PUBLIC_SUBNET_ID"]],
            'Tags': load_tags(),
        })

    cft.parameters.add(
        core.Parameter('LogInterval', 'Number', {
                'Default': 60,
                'Description':
                "How often, in minutes, the ELB emits its logs to the "
                "configured S3 bucket. The ELB log facility restricts "
                "this to be 5 or 60.",
            }
        )
    )

    return cft


if __name__ == '__main__':
    main()
