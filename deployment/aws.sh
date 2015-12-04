#!/bin/sh

set -x

# This script is intened to be executed on AWS instance after
# the bootstraph.sh script. The bootstrap.sh script is common
# to both Vagrant and AWS. Both bootstrap.sh and aws.sh (this
# script) are supplied via cloudinit userdata.

/usr/bin/apt-get -q -y install htop

mkdir /srv/refinery-platform
chown ubuntu:ubuntu /srv/refinery-platform
sudo su -c 'git clone -b '"$GIT_BRANCH"' https://github.com/parklab/refinery-platform.git /srv/refinery-platform' ubuntu

cd /srv/refinery-platform/deployment
sudo su -c '/usr/local/bin/librarian-puppet install' ubuntu

/usr/bin/puppet apply --modulepath=/srv/refinery-platform/deployment/modules /srv/refinery-platform/deployment/manifests/aws.pp
