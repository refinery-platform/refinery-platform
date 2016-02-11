#!/usr/bin/env python

"""
Tags local module.
"""

import glob
import os       # for os.popen

import yaml

# Get the local user's email address
email = os.popen("git config --get user.email").read().rstrip()


def load():
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
