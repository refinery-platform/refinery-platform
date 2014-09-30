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
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

    $ git clone git@github.com:parklab/refinery-platform.git
    $ cd refinery-platform
    $ vagrant up
The above step should take about 15 minutes depending on the speed of your
machine and Internet connection.  If you get an error, simply retry by:

.. code-block:: bash

    $ vagrant provision

Open http://192.168.50.50:8000/ in your web browser.

Configure Deployment Environment
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Create a Python virtual environment (optional but recommended, assumes
virtualenvwrapper is installed):

.. code-block:: bash

    $ mkvirtualenv -a $(pwd) refinery-deployment

Install Fabric:

.. code-block:: bash
    $ pip install -r deployment/requirements.txt

To pull the latest code and update Refinery installation:

.. code-block:: bash

    $ fab vm update

Refinery Operations on the VM
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Connect to the initialized VM:

.. code-block:: bash

    $ vagrant ssh
    $ workon refinery-platform
    $ ./manage.py

Please see `installation notes
<https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html>`_
for more details, including information on how to configure Galaxy for this setup.

Troubleshooting
~~~~~~~~~~~~~~~

* Refinery deployment requires a lot of external dependencies. You might have to run ``vagrant provision`` repeatedly to install all dependencies successfully. *Any errors* in the output of ``vagrant provision`` indicate that you have to re-run the command.
* If you have a VPN connection running, you may need to disconnect and reconnect before you can access the VM.  In some cases you may have to reboot the host machine.
