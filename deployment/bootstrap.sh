#!/usr/bin/env bash

export DEBIAN_FRONTEND=noninteractive

/usr/bin/apt-get clean && /usr/bin/apt-get -qq update

# "make" and "puppet" are required on AWS, and already installed
# on Vagrant (so adding them again is quick).
/usr/bin/apt-get -q -y install git ruby-dev make puppet

/usr/bin/gem install librarian-puppet -v 2.2.3 --no-rdoc --no-ri && cd /vagrant/deployment && librarian-puppet install
