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
~~~~~~~~~~~~~~~~~~~

We highly recommended to create a ``virtualenv`` for your Refinery installation.


External Software
-----------------

Galaxy
~~~~~~

Galaxy is required to run analyses in Refinery and to provide support for archiving.

*Website*
   http://www.galaxyproject.org

*Version*
   ???
   

Postgresql
~~~~~~~~~~

Apache HTTP Server
~~~~~~~~~~~~~~~~~~

Apache Solr
~~~~~~~~~~~

Refinery uses Solr for searching and faceted browsing.

*Website*
   http://lucene.apache.org/solr

*Version*
   4.0.0-alpha or later

RabbitMQ
~~~~~~~~

This is the preferred message broker for the `Celery <http://celeryproject.org>`_ distributed task queue.
Refinery uses Celery and RabbitMQ to handle long-running tasks.

*Website*
   http://www.rabbitmq.com

*Version*
   ???