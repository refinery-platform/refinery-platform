# <img src="https://pbs.twimg.com/profile_images/519505652083748864/bG9itLTl_400x400.png" height=30px width=30px>&nbsp;Refinery Platform [![Build Status](https://travis-ci.org/parklab/refinery-platform.svg?branch=develop)](https://travis-ci.org/parklab/refinery-platform) [![Coverage Status](https://img.shields.io/codecov/c/github/parklab/refinery-platform/develop.svg)](https://codecov.io/github/parklab/refinery-platform?branch=develop)

Additional information about how to administrate and develop Refinery can be found in the [wiki](http://github.com/parklab/refinery-platform/wiki).

## Installing and Launching for Development

### Prerequisites

Install [Git][gi], [Vagrant][va] (1.8.1+) and [Virtualbox][vb] (5.0.12+).

### Configure and Load Virtual Machine

```bash
$ git clone git@github.com:parklab/refinery-platform.git
$ cd refinery-platform
$ vagrant up
```

The above step should take about 15 minutes depending on the speed of your machine and Internet connection. If you get an error, simply retry by:

```bash
$ vagrant provision
```

Open <http://192.168.50.50:8000/> in your web browser.

### Configure Deployment Environment on the Host

Create a Python 2.7 virtual environment (optional but recommended, assumes virtualenvwrapper is installed, for example in Ubuntu: `apt-get install virtualenvwrapper`):

```bash
$ mkvirtualenv -a $(pwd) refinery-deployment
```

Install development tools (assumes header files for Python are installed, for example in Ubuntu: `apt-get install python-dev`):

```bash
$ pip install -r deployment/requirements.txt
```

Use fabricrc.sample to update or initialize Fabric configuration, for example:

```bash
$ cp fabricrc.sample ~/.fabricrc
```

To pull the latest code and update Refinery installation:

```bash
$ fab vm update
```

Install pre-commit hooks:

```bash
$ pre-commit install
```

### Refinery Operations on the VM

Connect to the initialized VM:

```bash
$ vagrant ssh
$ workon refinery-platform
$ ./manage.py [command]
```

Log in to Refinery (<http://192.168.50.50:8000/>) with the default guest user account (username: guest, password: guest).

Log in to Django admin UI (<http://192.168.50.50:8000/admin/>) with the default superuser account (username: admin, password: refinery).

Please see [installation notes] for more details, including information on how to configure Galaxy for this setup.

## Troubleshooting

- Refinery deployment requires a lot of external dependencies. You might have to run `vagrant provision` repeatedly to install all
  dependencies successfully. *Any errors* in the output of `vagrant provision` indicate that you have to re-run the command.
- If you run into a build error in OS X when trying to install Fabric: `export C_INCLUDE_PATH=/usr/local/include`
- If you have a VPN connection running, you may need to disconnect and reconnect before you can access the VM. In some cases you may have to reboot the host machine.

[gi]: http://git-scm.com/
[va]: http://www.vagrantup.com/
[vb]: https://www.virtualbox.org/
[in]: https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html
