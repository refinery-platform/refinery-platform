'''
Created on Aug 23, 2012

@author: nils
'''

# a context processor to pass settings variables to views by default
# from: http://stackoverflow.com/questions/433162/can-i-access-constants-in-settings-py-from-templates-in-django?lq=1

from django.conf import settings

def extra_context(context):
    # return the value you want as a dictionnary. you may add multiple values in there.
    return { 'REFINERY_BOOTSTRAP_CSS': settings.REFINERY_BOOTSTRAP_CSS }