#!/usr/bin/env python
import os
import sys

import django

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    os.environ["DJANGO_SETTINGS_MODULE"] = 'config.settings.dev'

    from django.core.management import execute_from_command_line

    django.setup()
    execute_from_command_line(sys.argv)
