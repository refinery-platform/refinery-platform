.. _dependencies:

Dependencies
============

Python
------

Refinery requires Python 2.7.3. For package dependencies please see ``requirements.txt``. Requirements can be installed using ``pip``
as follows:

.. code-block:: bash

   > pip install -U -r requirements.txt

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
   
Setup
"""""

We recommend to run Solr using the bundled Jetty webserver. Solr has to run on the same host as the Refinery application. 
The Solr example configuration included in the standard download is sufficient and should be run like this::
   
   cd <solr-download-directory>
   java -Dsolr.solr.home=<refinery-installation-directory>/solr/ -jar start.jar > <path-to-solr-log-file> 2>&1 &
      
By default Jetty will allow connections to Solr from all IP addresses. This is not secure and not required to run Refinery. We recommend to 
allow connections to Solr only from ``localhost``. This can be configured as follows:
   
   #. Go to ``<solr-download-directory>/etc``
   #. Open ``jetty.xml``
   #. Locate ``<Call name="addConnector">`` in ``jetty.xml``. Be aware that the default ``jetty.xml`` file contains an ``addConnector`` block that is commented out. 
   #. Supply a default value of "127.0.0.1" for the ``jetty.host`` system property used to configure ``Host`` as follows::
   
      Set <Set name="Host"><SystemProperty name="jetty.host" default="127.0.0.1"/></Set>
      
   #. Restart Jetty using the command shown above.  

RabbitMQ
^^^^^^^^

This is the preferred message broker for the `Celery <http://celeryproject.org>`_ distributed task queue.
Refinery uses Celery and RabbitMQ to handle long-running tasks.

*Website*
   http://www.rabbitmq.com

*Version*
   ???