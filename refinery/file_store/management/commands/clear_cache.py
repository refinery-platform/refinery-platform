'''
Created on Nov 10, 2015

@author: scott
'''
import logging
from django.core.management.base import BaseCommand
from django.core.cache import cache

logger = logging.getLogger(__name__)


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
            print "Cache successfully cleared!"
        except Exception as e:
            logger.debug(e)
