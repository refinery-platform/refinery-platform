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

.. code-block:: bash

    > git clone git@github.com:parklab/refinery-platform.git
    > cd refinery-platform
    > vagrant up
This step should take 15-20 minutes depending on the speed of your machine and
Internet connection.

.. code-block:: bash

    > vagrant ssh
    > cd /vagrant/refinery && workon refinery-platform
    > supervisord

Open http://localhost:8000/ in your web browser.
