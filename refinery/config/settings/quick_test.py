# Special Django config for testing

# DO NOT use for running the application server

# Speeds up test runs by skipping migrations
# Disables logging to provide a clean output of test results

# Usage: manage.py test --settings=config.settings.quick_test

from .base import *  # NOQA

logging.disable(logging.CRITICAL)

# TODO: replace MIGRATION_MODULES with a dict after Django 1.9 upgrade
# https://simpleisbetterthancomplex.com/tips/2016/08/19/django-tip-12-disabling-migrations-to-speed-up-unit-tests.html


class DisableMigrations(object):
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return 'notmigrations'


MIGRATION_MODULES = DisableMigrations()
