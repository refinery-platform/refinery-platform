#!/bin/sh
# aws.sh

set -x

# This script is intended to be executed on AWS instance after
# the bootstraph.sh script. The bootstrap.sh script is common
# to both Vagrant and AWS. Both bootstrap.sh and aws.sh (this
# script) are supplied via cloudinit userdata.

# Normally supplied as input, but use a default if not.
GIT_BRANCH=${GIT_BRANCH:-develop}

/usr/bin/apt-get -q -y install htop
/usr/bin/apt-get -q -y install awscli jq postgresql-client-9.3

# Fetch the source code repo (from github),
# and switch to the desired commit/branch.
mkdir /srv/refinery-platform
chown ubuntu:ubuntu /srv/refinery-platform
sudo su -c '
  git clone https://github.com/parklab/refinery-platform.git /srv/refinery-platform
  cd /srv/refinery-platform
  git checkout '"$GIT_BRANCH"'
' ubuntu

cd /srv/refinery-platform/deployment

# Write AWS region to file (for later use).
export AWS_DEFAULT_REGION       # Set by inline cloudinit script.
if [ ! -z "$AWS_DEFAULT_REGION" ]
then
    printf '%s\n' "$AWS_DEFAULT_REGION" > /home/ubuntu/region
fi

# Set by inline cloudinit script.
export S3_CONFIG_URI
# Write s3-config to /home/ubuntu/s3-config
(cd /home/ubuntu &&
 /srv/refinery-platform/deployment/bin/get-s3-config)

# Tag the attached root volume
sh /srv/refinery-platform/deployment/bin/fix-untagged-volumes

# Discover IP endpoint for our PostgreSQL RDS, and place it in
# environment variables for puppet/facter to use
: ${RDS_NAME?RDS_NAME must be set}
bin/aws-rds-endpoint "$RDS_NAME" > /home/ubuntu/rds

# FACTER environment variables become facts for puppet;
# see https://puppetlabs.com/blog/facter-part-1-facter-101
export FACTER_RDS_HOST=$(jq -r .Address /home/ubuntu/rds)
export FACTER_RDS_PORT=$(jq -r .Port /home/ubuntu/rds)
export FACTER_RDS_ROLE="$RDS_ROLE"

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

# Create RDS user and database here, instead of using puppet
# (because drj couldn't work out how to do it in puppet)
export FACTER_RDS_ROLE_PASSWORD=password
# Already set by earlier part of userdata
export RDS_SUPERUSER_PASSWORD
PASSWORD=$FACTER_RDS_ROLE_PASSWORD bin/ensure-postgresql-role
bin/ensure-postgresql-database

sudo su -c '/usr/local/bin/librarian-puppet install' ubuntu

/usr/bin/puppet apply --modulepath=/srv/refinery-platform/deployment/modules /srv/refinery-platform/deployment/manifests/aws.pp
