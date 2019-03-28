#!/usr/bin/env bash

# initial configuration for Vagrant box

# https://serverfault.com/a/670688
export DEBIAN_FRONTEND=noninteractive

# print commands and their expanded arguments
set -x

/usr/bin/apt-get clean && /usr/bin/apt-get -qq update && /usr/bin/apt-get -y autoremove

/usr/bin/apt-get -q -y install git htop nmon ruby-dev tree

/usr/bin/gem install librarian-puppet -v 2.2.3 --no-rdoc --no-ri

cd /vagrant/deployment/puppet && librarian-puppet install
