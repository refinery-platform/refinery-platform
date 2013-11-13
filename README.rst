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

    $ vagrant box add precise32 http://files.vagrantup.com/precise32.box

Configure and Load Virtual Machine
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

    $ git clone git@github.com:parklab/refinery-platform.git
    $ cd refinery-platform
    $ vagrant up
The above step should take about 15 minutes depending on the speed of your machine and
Internet connection.  If you get an error, simply retry by:

.. code-block:: bash

    $ vagrant provision

Refinery deployment requires a lot of external dependencies. You might have to run ``vagrant provision`` repeatedly to install all dependencies successfully. *Any errors* in the output of ``vagrant provision`` indicate that you have to re-run the command.

Launch Refinery
~~~~~~~~~~~~~~~

Connect to the initialized VM and start Refinery services:

.. code-block:: bash

    $ vagrant ssh
    $ cd /vagrant/refinery && workon refinery-platform
    $ supervisord

Open http://192.168.50.50:8000/ in your web browser.

Please see `installation notes
<https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html>`_
for more details, including information on how to configure Galaxy for this setup.
