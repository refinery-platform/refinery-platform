# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  # All Vagrant configuration is done here. The most common configuration
  # options are documented and commented below. For a complete reference,
  # please see the online documentation at vagrantup.com.

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "precise32"
  config.vm.provision :shell, :path => "bootstrap.sh"
  config.vm.hostname = "refinery"
  config.vm.network :private_network, ip: "192.168.50.50"

  config.vm.provider "virtualbox" do |v|
    v.customize ["modifyvm", :id, "--memory", "1024"]
  end

  # If you'd like to be able to copy data from an instance of Galaxy
  # that's installed on the host, set $GALAXY_DATABSE_DIR environment
  # variable to the absolute path of the $GALAXY_ROOT/database folder
  if ENV['GALAXY_DATABASE_DIR']
    config.vm.synced_folder ENV['GALAXY_DATABASE_DIR'], ENV['GALAXY_DATABASE_DIR']
  else
   puts("$GALAXY_DATABASE_DIR is not set: copying files from local Galaxy instance will not work.")
  end

  config.vm.provision :puppet do |puppet|
    puppet.manifests_path = "manifests"
    puppet.manifest_file  = "default.pp"
    # puppet.module_path = "modules"  # requires modules dir to exist when this file is parsed
    puppet.options = "--modulepath /vagrant/modules"
  end
end
