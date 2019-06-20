#!/usr/bin/env bash

# initial configuration for Vagrant box

# https://serverfault.com/a/670688
export DEBIAN_FRONTEND=noninteractive

# print commands and their expanded arguments
set -x

/usr/bin/apt-get clean
/usr/bin/wget -q https://apt.puppetlabs.com/puppet5-release-xenial.deb
/usr/bin/dpkg -i puppet5-release-xenial.deb
/usr/bin/apt-get -qq update
/usr/bin/apt-get -y autoremove

/usr/bin/apt-get -q -y install git htop nmon puppet-agent ruby-dev tree

export PATH=/opt/puppetlabs/bin:$PATH

/usr/bin/gem install librarian-puppet -v 3.0.0 --no-rdoc --no-ri

cd /vagrant/deployment/puppet
librarian-puppet config path /opt/puppetlabs/puppet/modules --local
librarian-puppet config tmp /tmp --local
librarian-puppet install
