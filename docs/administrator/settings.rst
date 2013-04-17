.. _settings:

Settings
========

Refinery settings are configured in ``settings_local.py``.

.. note::
   You should never edit the settings directly in ``settings.py`` to avoid conflicts when upgrading.

Required Settings
-----------------



Optional Settings
-----------------

``REFINERY_FILE_SOURCE_MAP = {}``
   Optional dictionary for translating file URLs into file system paths (and vice versa)
   format: *{'pattern': 'replacement'}*
   where *pattern* is a string to search for in source and then replace with *replacement* string.
   May contain more than one pattern-replacement pair (only the first match will be used).

``REFINERY_BANNER = ''``
   Optional string to display a message near the top of every page (HTML tags allowed).

``REFINERY_BANNER_ANONYMOUS_ONLY = False``
   Optional setting to display REFINERY_BANNER to anonymous users only.
