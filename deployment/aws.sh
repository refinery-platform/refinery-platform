#!/bin/sh
# aws.sh

set -x

# This script is intended to be executed on AWS instance after
# the bootstraph.sh script. The bootstrap.sh script is common
# to both Vagrant and AWS. Both bootstrap.sh and aws.sh (this
# script) are supplied via cloudinit userdata.

env

printf '%s' "${CONFIG_YAML}" | base64 -d > /home/ubuntu/config.yaml
printf '%s' "${CONFIG_JSON}" | base64 -d > /home/ubuntu/config.json

ln -s /home/ubuntu/config.yaml /srv/refinery-platform/refinery/config/override-config.yaml

cd /srv/refinery-platform/deployment

sudo su -c '/usr/local/bin/librarian-puppet install' ubuntu

/usr/bin/puppet apply --modulepath=/srv/refinery-platform/deployment/modules /srv/refinery-platform/deployment/manifests/aws.pp
