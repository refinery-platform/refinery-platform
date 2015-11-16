#!/usr/bin/env bash

export DEBIAN_FRONTEND=noninteractive

/usr/bin/apt-get clean && /usr/bin/apt-get -qq update

/usr/bin/apt-get -q -y install git ruby-dev

/usr/bin/gem install librarian-puppet -v 2.2.1 --no-rdoc --no-ri && cd /vagrant/deployment && librarian-puppet install
