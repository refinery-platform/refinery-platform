# <img src="https://pbs.twimg.com/profile_images/519505652083748864/bG9itLTl_400x400.png" height=30px width=30px>&nbsp;Refinery Platform 
[![Build Status](https://travis-ci.org/refinery-platform/refinery-platform.svg?branch=develop)](https://travis-ci.org/refinery-platform/refinery-platform) 
[![Code Health](https://landscape.io/github/refinery-platform/refinery-platform/develop/landscape.svg?style=flat)](https://landscape.io/github/refinery-platform/refinery-platform/develop) 
[![Coverage Status](https://img.shields.io/codecov/c/github/refinery-platform/refinery-platform/develop.svg)](https://codecov.io/github/refinery-platform/refinery-platform?branch=develop)

* Additional information about how to administer and develop Refinery can be found in the [wiki](http://github.com/refinery-platform/refinery-platform/wiki)
* [Production deployments](https://github.com/refinery-platform/refinery-platform/wiki/AWS-deployment) require access to Amazon Web Services
* Refinery supports the latest version of Chrome (Linux and OS X), Firefox (Linux and OS X), and Safari (OS X)

## Installing and Launching for Development

### Prerequisites
* Install [Git][gi] (2.3.2+), [Vagrant][va] (1.8.1+) and [Virtualbox][vb] (5.0.16+)
* [Add SSH key to your GitHub account](https://help.github.com/articles/adding-a-new-ssh-key-to-your-github-account/)
* Note: this procedure has only been tested on local development machines running OS X 10.10+

### Configure and Load Virtual Machine
```bash
$ git clone git@github.com:refinery-platform/refinery-platform.git
$ cd refinery-platform
$ vagrant up
```

The above step should take about 15 minutes depending on the speed of your machine and Internet connection. If you get an error, simply retry by:
```bash
$ vagrant provision
```

Open <http://192.168.50.50:8000/> in your web browser.

### Configure Deployment Environment on the Host

Create a Python 2.7 virtual environment (optional but recommended, assumes `virtualenvwrapper` is installed):
```bash
$ mkvirtualenv -a $(pwd) refinery-deployment
```

Install deployment tools (assumes header files for Python are installed):
```bash
$ pip install -r deployment/requirements.txt
```

Install [Pre-Commit Hooks](https://github.com/refinery-platform/refinery-platform/wiki/Development-Environment#pre-commit-hook)

Use `fabricrc.sample` to update or initialize Fabric configuration, for example:
```bash
$ cp fabricrc.sample ~/.fabricrc
```

To pull the latest code and update Refinery installation:
```bash
$ fab vm update
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

Please see [installation notes](https://github.com/refinery-platform/refinery-platform/wiki/setting-up-galaxy) for more details, including information on how to configure Galaxy for this setup.

## Troubleshooting

- Refinery deployment requires a lot of external dependencies. You might have to run `vagrant provision` repeatedly to install all
  dependencies successfully. *Any errors* in the output of `vagrant provision` indicate that you have to re-run the command.
- If you run into a build error in OS X when trying to install Fabric: `export C_INCLUDE_PATH=/usr/local/include`
- If you have a VPN connection running, you may need to disconnect and reconnect before you can access the VM. In some cases you may have to reboot the host machine.
- To make sure all the required services are running after the VM was restarted or shut down, you need to provision again: `vagrant reload --provision` or `vagrant up --provision`

[gi]: http://git-scm.com/
[va]: http://www.vagrantup.com/
[vb]: https://www.virtualbox.org/
[in]: https://refinery-platform.readthedocs.org/en/latest/administrator/setup.html
