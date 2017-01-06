# Django settings specialised for the AWS environment.
#
# See https://github.com/refinery-platform/refinery-platform/wiki/AWS for
# more details.

import requests

# Like prod, but overriding some things.
from .prod import *  # NOQA

# Ensure that the AWS private IP is an Allowed Host.
# (required for ELB pings to work,
# see https://github.com/refinery-platform/refinery-platform/issues/1239)

# Not checking for exceptions: if we can't get EC2 instance metadata,
# something horrible is wrong.
PRIVATE_IP = requests.get(
  "http://169.254.169.254/latest/meta-data/local-ipv4", timeout=1.0).text
ALLOWED_HOSTS.append(PRIVATE_IP)

PUBLIC_IP = requests.get(
  "http://169.254.169.254/latest/meta-data/public-ipv4", timeout=1.0).text
if PUBLIC_IP:
    ALLOWED_HOSTS.append(PUBLIC_IP)

EMAIL_BACKEND = 'django_smtp_ssl.SSLEmailBackend'
EMAIL_HOST_USER = get_setting('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = get_setting('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True
EMAIL_PORT = 465
