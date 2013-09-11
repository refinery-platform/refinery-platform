.. _repository: http://www.github.com/parklab/refinery-platform

Setting up a Refinery Instance from Scratch
===========================================

.. toctree::
   :maxdepth: 2

   dependencies
   settings

Refinery is a Django-based web application implemented in Python and JavaScript.
For a full list of all external dependencies please see :ref:`dependencies`.

Installation
------------

The easiest method to install Refinery is to follow instructions in the README
file.
Note:
Installation process will fail if any of the ports forwarded from the VM are in
use on the host machine (please see Vagrantfile for the list of ports).
After installation has finished you will need to create a Django superuser:

.. code-block:: bash

    > python manage.py createsuperuser

Obtaining the Software
----------------------

The source code for Refinery can be downloaded from the Github repository_
either by cloning the repository or by downloading a zip archive. 

Settings
--------

Before Refinery can be installed a number of variables - so called "settings" -
have to be configured. In addition to the settings discussed here, please also
see the complete list of all Refinery :ref:`settings` that can be customized.
