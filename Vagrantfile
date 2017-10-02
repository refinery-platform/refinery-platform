# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  # All Vagrant configuration is done here. The most common configuration
  # options are documented and commented below. For a complete reference,
  # please see the online documentation at vagrantup.com.

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "ubuntu/trusty64"
  config.vm.box_version = "20170619.0.0"
  config.vm.hostname = "refinery"
  config.vm.network "private_network", ip: "192.168.50.50"

  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.cpus = 1
  end

  config.ssh.forward_agent = true  # to enable cloning from Github over SSH

  # If you'd like to be able to copy data from an instance of Galaxy
  # that's installed on the host, set $GALAXY_DATABSE_DIR environment
  # variable to the absolute path of the $GALAXY_ROOT/database folder
  if ENV['GALAXY_DATABASE_DIR']
#    puts("INFO: Using host directory #{ENV['GALAXY_DATABASE_DIR']} to exchange data with Galaxy.")
    config.vm.synced_folder ENV['GALAXY_DATABASE_DIR'], ENV['GALAXY_DATABASE_DIR']
  else
    config.vm.provision :shell, :inline =>
<<GALAXY_WARNING_SCRIPT
    echo 1>&2 'WARNING: $GALAXY_DATABASE_DIR is not set: copying files from local Galaxy instance will not work.'
GALAXY_WARNING_SCRIPT
  end

  # If you'd like to be able to copy data from your host into the VM, set
  # REFINERY_VM_TRANSFER_DIR on the host to a directory of your choice.
  if ENV['REFINERY_VM_TRANSFER_DIR']
    config.vm.synced_folder ENV['REFINERY_VM_TRANSFER_DIR'], "/vagrant/transfer"
#    puts("INFO: Using host directory #{ENV['REFINERY_VM_TRANSFER_DIR']} to import datasets.")
  else
#   puts("WARNING: $REFINERY_VM_TRANSFER_DIR is not set: importing datasets from the command line will not work.")
  end

  # Install Librarian-puppet and modules before puppet provisioning
  config.vm.provision :shell, path: "deployment/bootstrap.sh"

  config.vm.provision :puppet do |puppet|
    puppet.manifests_path = "deployment/manifests"
    puppet.manifest_file  = "default.pp"
    puppet.module_path = "deployment/modules"  # requires modules dir to exist when this file is parsed
    puppet.options = "--hiera_config /vagrant/deployment/hiera.yaml"  # to avoid missing file warning
  end

  # workaround for services that start on boot before /vagrant is available
  # http://stackoverflow.com/a/23986680
  config.vm.provision :shell, inline: "service solr restart 1> /dev/null", run: "always"

end
