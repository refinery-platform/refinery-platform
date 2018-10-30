#!/bin/sh
# aws.sh

set -x

# This script is intended to be executed on AWS instance after
# the bootstraph.sh script. The bootstrap.sh script is common
# to both Vagrant and AWS. Both bootstrap.sh and aws.sh (this
# script) are supplied via cloudinit userdata.

env

# Normally supplied as input, but use a default if not.
GIT_BRANCH=${GIT_BRANCH:-develop}

printf '%s' "${CONFIG_YAML}" | base64 -d > /home/ubuntu/config.yaml
printf '%s' "${CONFIG_JSON}" | base64 -d > /home/ubuntu/config.json

# Fetch the source code repo (from github),
# and switch to the desired commit/branch.
mkdir /srv/refinery-platform
chown ubuntu:ubuntu /srv/refinery-platform
sudo su -c '
  git clone https://github.com/refinery-platform/refinery-platform.git /srv/refinery-platform
  cd /srv/refinery-platform
  git checkout '"$GIT_BRANCH"'
' ubuntu

ln -s /home/ubuntu/config.yaml /srv/refinery-platform/refinery/config/override-config.yaml

cd /srv/refinery-platform/deployment

# Create SMTP credentials and
# place them in (facter) environment variables.
. bin/create-smtp-credentials

export FACTER_ADMIN="$ADMIN"
export FACTER_DEFAULT_FROM_EMAIL="$DEFAULT_FROM_EMAIL"
export FACTER_SERVER_EMAIL="$DEFAULT_FROM_EMAIL"
export FACTER_EMAIL_HOST_USER="$EMAIL_HOST_USER"
export FACTER_EMAIL_HOST_PASSWORD="$EMAIL_HOST_PASSWORD"
export FACTER_SITE_URL="$SITE_URL"
export FACTER_SITE_NAME="$SITE_NAME"

sudo su -c '/usr/local/bin/librarian-puppet install' ubuntu

/usr/bin/puppet apply --modulepath=/srv/refinery-platform/deployment/modules /srv/refinery-platform/deployment/manifests/aws.pp
