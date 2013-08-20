Refinery Platform
=================

Installation instructions
-------------------------

Install `Python <http://www.python.org/>`_, `Git <http://git-scm.com/>`_,
`Vagrant <http://www.vagrantup.com/>`_ and
`Virtualbox <https://www.virtualbox.org/>`_.

You may have to import the right VM image:

.. code-block:: bash

    > vagrant box add precise32 http://files.vagrantup.com/precise32.box

Then deploy:

.. code-block:: bash

    > git clone git@github.com:parklab/refinery-platform.git
    > cd refinery-platform
    > vagrant up
The above step should take about 15 minutes depending on the speed of your machine and
Internet connection.  If you get an error, simply retry by:

.. code-block:: bash

    > vagrant reload

Then connect to the initialized VM and start Refinery services:

.. code-block:: bash

    > vagrant ssh
    > cd /vagrant/refinery && workon refinery-platform
    > supervisord

Open http://localhost:8000/ in your web browser.

Please see `installation notes
<https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html>`_
for more details.
