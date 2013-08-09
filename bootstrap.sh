#!/usr/bin/env bash

# Git is required for librarian-puppet
/usr/bin/apt-get update && /usr/bin/apt-get -y install git
gem install librarian-puppet && cd /vagrant && librarian-puppet install

#MODULEPATH=/usr/share/puppet/modules
#mkdir -p $MODULEPATH

# puppet produces an error when a module is already installed
#if [ ! -d $MODULEPATH/postgresql ]; then
#  puppet module install --modulepath $MODULEPATH puppetlabs/postgresql
#fi
