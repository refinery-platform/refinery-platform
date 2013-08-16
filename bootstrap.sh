#!/usr/bin/env bash

# Git is required for librarian-puppet
/usr/bin/apt-get -qq update && /usr/bin/apt-get -y install git
gem install librarian-puppet && cd /vagrant && librarian-puppet install

# temp workaround, to be moved into Puppetfile
puppet module install puppetlabs/rabbitmq --modulepath=/vagrant/modules --force
