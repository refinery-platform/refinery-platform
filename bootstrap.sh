#!/usr/bin/env bash

gem install librarian-puppet && cd /vagrant && librarian-puppet install

#MODULEPATH=/usr/share/puppet/modules
#mkdir -p $MODULEPATH

# puppet produces an error when a module is already installed
#if [ ! -d $MODULEPATH/postgresql ]; then
#  puppet module install --modulepath $MODULEPATH puppetlabs/postgresql
#fi
