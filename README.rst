Refinery Platform
=================

Installing and Launching for Development
----------------------------------------

Prerequisites
~~~~~~~~~~~~~

Install `Git <http://git-scm.com/>`_,
`Vagrant <http://www.vagrantup.com/>`_ (1.2.7 or later) and
`Virtualbox <https://www.virtualbox.org/>`_ (4.2.16 or later). Mac OS X 10.9 "Mavericks" users should install Vagrant 1.3.5 and VirtualBox 4.3.2.

You may also have to import the right VM image:

.. code-block:: bash

    > vagrant box add precise32 http://files.vagrantup.com/precise32.box

Configure and Load Virtual Machine
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

    > git clone https://github.com/parklab/refinery-platform.git
    > cd refinery-platform
    > vagrant up
The above step should take about 15 minutes depending on the speed of your machine and
Internet connection.  If you get an error, simply retry by:

.. code-block:: bash

    > vagrant provision

A common error is failure to install the puppetlabs-firewall module, which is a `known error in the module <https://github.com/puppetlabs/puppetlabs-firewall/issues/228>`_ and should be fixed in the next release. The module will install without issues on the second attempt.

Launch Refinery
~~~~~~~~~~~~~~~

Connect to the initialized VM and start Refinery services:

.. code-block:: bash

    > vagrant ssh
    > cd /vagrant/refinery && workon refinery-platform
    > supervisord

Open http://192.168.50.50:8000/ in your web browser.

Please see `installation notes
<https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html>`_
for more details, including information on how to configure Galaxy for this setup.
