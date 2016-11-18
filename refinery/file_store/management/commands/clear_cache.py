'''
Created on Nov 10, 2015

@author: scott
'''
import sys

from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):

    help = "clears the current memcached cache"
    """
    Name: handle
    Description:
    clears the current memcached cache
    """

    def handle(self, *args, **kwargs):
        try:
            cache.clear()
            sys.stdout.write("Cache successfully cleared")
        except Exception as e:
            sys.stderr.write(e)
