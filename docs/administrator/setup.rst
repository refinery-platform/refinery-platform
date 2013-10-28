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
    
To instantiate administrator-modifiable content on the Refinery website, e.g.,
the contents of the "About" page, load the default content into the database:  
    
.. code-block:: bash

	> python manage.py loaddata core/fixtures/default-pages.json


Obtaining the Software
----------------------

The source code for Refinery can be downloaded from the Github repository_
either by cloning the repository or by downloading a zip archive. 

Settings
--------

Before Refinery can be installed a number of variables - so called "settings" -
have to be configured. In addition to the settings discussed here, please also
see the complete list of all Refinery :ref:`settings` that can be customized.

Galaxy
------

Galaxy is required to run analyses in Refinery and to provide support for archiving.

*Website*
   https://bitbucket.org/galaxy/galaxy-dist

*Version*
   `Aug 12, 2013 Galaxy Distribution <http://wiki.galaxyproject.org/DevNewsBriefs/2013_08_12>`_

*Notes*
   Refinery running in the VM can access Galaxy instance running on the host at http://192.168.50.1:8080

   On the host you will need to:

   - Set $GALAXY_DATABASE_DIR env variable to the absolute path of the $GALAXY_ROOT/database folder of your local Galaxy instance installed on the host if you want to copy files directly it.

   - Create a symlink /vagrant/media that points to the absolute path of the media subdirectory inside the Refinery project directory.
