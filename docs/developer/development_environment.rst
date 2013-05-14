.. include ../global.rst

Development Environment
=======================

This section of the Refinery Platform documentation describes setting up Eclipse for Refinery development.

Eclipse Project defaults
------------------------

Main Module:

``${workspace_loc:refinery-platform}/${DJANGO_MANAGE_LOCATION}``

Program arguments:

``runserver --noreload``

Working directory:

``${workspace_loc:}``

Git
---
Make sure to use the SSH repository URL (instead of HTTPS) if you want to push code to Github without entering username and password.

.. code-block:: bash

   > git remote set-url origin git@github.com:parklab/refinery-platform.git
