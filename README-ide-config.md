# PyCharm Configuration

After checking out `refinery-platform` and building it in Vagrant,
you should open the project in PyCharm and configure your environment. 
(For more detail, see the [wiki](https://github.com/refinery-platform/refinery-platform/wiki/Development-Environment).)

## [Enable Django support](https://www.jetbrains.com/help/pycharm/django.html)

PyCharm > Preferences > Languages & Frameworks > Django

- For "Django project root", select the `refinery` directory in your checkout, not the root of the checkout.
- For "Settings", select "config/settings/base.py".
- "Manage script" should be filled in automatically.
- "Show structure" does not work for me. TODO?

## [Configure remote interpreter via Vagrant](https://www.jetbrains.com/help/pycharm/configuring-remote-interpreters-via-vagrant.html)

PyCharm > Preferences > Project > Project Interpreter

- From the drop-down beside the selector, pick "Add Remote".
- In the modal, click the "Vagrant" radio-button, 
    - and fill in "Vagrant Instance Folder" with the path to your checkout.
    - "Vagrant Host URL" should be automatically filled in.
    - "Python interpretter path" should be set to `/home/vagrant/.virtualenvs/refinery-platform/bin/python` to match that provided by virtualenv.

## [Run/Debug Configuration](https://www.jetbrains.com/help/pycharm/run-debug-configuration-django-server.html)

Run > Run... > Edit Configurations...

- Hit "+" and in "Add New Configuration" select "Django server".
- Give your new configuration the name "gdev".
- Enter "0.0.0.0" as "Host".
- You may already have the environment variable "PYTHONUNBUFFERED=1".
- Add "DJANGO_SETTINGS_MODULE=config.settings.gdev".
- Add "PYTHON_PATH=/home/vagrant/.virtualenvs/refinery-platform/lib/python2.7/site-packages"
- Confirm that "Python interpreter" has picked up the Vagrant Python.

For `gdev` to be effective, `grunt watch` must be running:

```
vagrant ssh
cd /vagrant/refinery/ui
workon refinery-platform
grunt watch
```

And finally, remember that you won't see JS changes without a page reload.
