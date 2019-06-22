# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  # All Vagrant configuration is done here. The most common configuration
  # options are documented and commented below. For a complete reference,
  # please see the online documentation at vagrantup.com.

  # Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "ubuntu/xenial64"
  config.vm.box_version = "20190514.0.1"
  config.vm.hostname = "refinery"
  # nic_type set to virtio to increase guest network performance (https://superuser.com/a/850389)
  config.vm.network "private_network", ip: "192.168.50.50", nic_type: "virtio"

  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.cpus = 2
    # To increase guest network performance (https://superuser.com/a/850389)
    v.customize ["modifyvm", :id, "--nictype1", "virtio"]
  end

  config.ssh.forward_agent = true  # to enable cloning from Github over SSH

  # If you'd like to be able to copy data from your host into the VM, set
  # REFINERY_VM_TRANSFER_DIR on the host to a directory of your choice
  if ENV['REFINERY_VM_TRANSFER_DIR']
    config.vm.synced_folder ENV['REFINERY_VM_TRANSFER_DIR'], "/vagrant/transfer"
  end

  # Install Librarian-puppet and modules before puppet provisioning
  config.vm.provision :shell, path: "deployment/bootstrap.sh"

  config.vm.provision :puppet do |puppet|
    puppet.manifests_path = "deployment/puppet/manifests"
    puppet.manifest_file  = "site.pp"
  end

  # workaround for services that start on boot before /vagrant is available
  # http://stackoverflow.com/a/23986680
  config.vm.provision :shell, inline: "service solr restart 1> /dev/null", run: "always"

end
