.. include global.rst

Upgrading an Existing Refinery Instance
=======================================

Migrations
----------

First:

>>> ./manage.py syncdb

Next:

>>> ./manage.py migrate --list

