.. _dependencies:

Dependencies
============

Python
------

Refinery requires Python 2.7.3. For package dependencies please see ``requirements.txt``. Requirements can be installed using ``pip``
as follows:

.. code-block:: bash

   > pip install -U -r requirements.txt

You might need to install NumPy manually before running the above command (you can find the version in ``requirements.txt``).
For example:

.. code-block:: bash

   > pip install numpy==1.7.0


Virtual Environment
^^^^^^^^^^^^^^^^^^^

We highly recommended to create a ``virtualenv`` for your Refinery installation.


External Software
-----------------

Galaxy
^^^^^^

Galaxy is required to run analyses in Refinery and to provide support for archiving.

*Website*
   http://www.galaxyproject.org

*Version*
   ???

*Notes*
   On your host you will need to:

   - Set $GALAXY_DATABASE_DIR env variable to the absolute path of the $GALAXY_ROOT/database folder of your local Galaxy instance installed on the host if you want to copy files directly it.

   - Create a symlink /vagrant/media that points to the absolute path of the media subdirectory inside the Refinery project directory.

Postgresql
^^^^^^^^^^

Apache HTTP Server
^^^^^^^^^^^^^^^^^^

Apache Solr
^^^^^^^^^^^

Refinery uses Solr for searching and faceted browsing.

*Website*
   http://lucene.apache.org/solr

*Version*
   4.0.0-alpha or later
   
Configuration
"""""""""""""

We recommend to run Solr using the bundled Jetty webserver. The Solr example configuration included in the standard download
is sufficient and should be run like this:

.. code-block:: bash   

   cd <solr-download-directory>
   java -Dsolr.solr.home=<refinery-installation-directory>/solr/ -jar start.jar > <path-to-solr-log-file> 2>&1 &
      
By default Jetty will allow connections to Solr from any IP address. This is not secure and not required to run Refinery. We recommend to 
allow connections to Solr only from ``localhost``. Note that this requires Solr to run on the same host as Refinery. If Solr should run on another host change
the IP address used below accordingly. 

To configure Jetty to only accept connections from ``localhost`` do the following:
   
1. Go to ``<solr-download-directory>/etc``.
2. Open ``jetty.xml``.
3. Locate ``<Call name="addConnector">`` in ``jetty.xml``. Be aware that the default ``jetty.xml`` file contains an ``addConnector`` block that is commented out. 
4. Supply a default value of "127.0.0.1" for the ``jetty.host`` system property used to configure ``Host`` as follows:

	.. code-block:: xml   

		<Set name="Host"><SystemProperty name="jetty.host" default="127.0.0.1"/></Set>

5. Make sure that the ``jetty.host`` system variable is not set. 
6. Restart Jetty using the command shown above.
7. In the ``settings_local.py`` of your Refinery installation configure ``REFINERY_SOLR_BASE_URL`` as follows:

	.. code-block:: python   

		REFINERY_SOLR_BASE_URL = "http://localhost:8983/solr/"
    
8. Restart the WSGI server running Refinery to reload your settings.

RabbitMQ
^^^^^^^^

This is the preferred message broker for the `Celery <http://celeryproject.org>`_ distributed task queue.
Refinery uses Celery and RabbitMQ to handle long-running tasks.

*Website*
   http://www.rabbitmq.com

*Version*
   ???
