import os
import random
import sys

from cfn_pyplates.core import JSONableDict
import yaml


class Output(JSONableDict):
    """Builds on cfn_pyplates.core.Output to include export dictionary"""
    def __init__(self, name, value, export=None, description=None):
        update_dict = {'Value': value}
        if description is not None:
            update_dict['Description'] = description
        if export is not None:
            update_dict['Export'] = {'Name': export}
        super(Output, self).__init__(update_dict, name)


def load_tags():
    """
    Load AWS resource tags from aws-config/tags.yaml.
    Tags are returned as a list of dict:

    [
      {
        'Key': 'project',
        'Value': 'refinery',
      },
    ]
    """

    tags = {}
    try:
        with open("aws-config/tags.yaml") as f:
            tags.update(yaml.load(f))
    except (IOError, yaml.YAMLError) as exc:
        sys.stderr.write("Error reading AWS resource tags: {}\n".format(exc))
        raise RuntimeError

    if 'owner' not in tags:
        tags['owner'] = os.popen("git config --get user.email").read().rstrip()

    return [{'Key': k, 'Value': v} for k, v in tags.items()]


def load_config():
    """Configuration is loaded from `aws-config/config.yaml`

    An automatically generated section (for a small number of keys) may be
    added to this file

    A pair (dict, string) is returned:
    the config as a dictionary and a string that is the contents of the file
    """

    config = _load_config_file("config.yaml")

    # Generate warning for old keys that we no longer use.
    report_obsolete_keys(config)

    report_missing_keys(config)

    # Generate some special keys that are optional to specify.
    generated_config = {}
    config_bucket_name = config['S3_BUCKET_NAME_BASE'] + "-config"
    generated_config['S3_CONFIG_BUCKET'] = config_bucket_name
    log_bucket_name = config['S3_BUCKET_NAME_BASE'] + "-log"
    generated_config['S3_LOG_BUCKET'] = log_bucket_name

    # Update the config, by adding the automatically generated keys.
    config.update(generated_config)

    with open("aws-config/config.yaml", 'r') as f:
        config_string = f.read()

    return config, config_string


def _load_config_file(filename):
    """Load a single file"""

    config_dir = "aws-config"
    full_path = os.path.join(config_dir, filename)

    with open(full_path) as f:
        y = yaml.load(f)
        if y:
            return y

    # Convert "null" to empty dict()
    return {}


def report_obsolete_keys(config):
    """
    Report obsolete keys that are no longer used.
    Just a warning; carries on anyway.
    """

    ignored = ['VOLUME', 'S3_CONFIG_BUCKET']
    bad = []
    for key in ignored:
        if key in config:
            bad.append(key)
    if bad:
        sys.stderr.write("{:s} no longer used, ignoring\n".format(
            bad))


def report_missing_keys(config):
    """
    Collect and report list of missing keys.
    Prints to stderr, then raises exception if there are missing keys.
    """

    required = ['ELB_SECURITY_GROUP_ID', 'IAM_SMTP_USER',
                'S3_BUCKET_NAME_BASE', 'STACK_NAME']
    bad = []
    for key in required:
        if key not in config:
            bad.append(key)
    if bad:
        sys.stderr.write("aws-config/ must have values for:\n{!r}\n".format(
            bad))
        raise RuntimeError
    return True
