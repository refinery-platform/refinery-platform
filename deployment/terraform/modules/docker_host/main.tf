resource "aws_security_group" "allow_docker" {
  name        = "${var.security_group_name}"
  description = "Allow connection to docker engine from within VPC"
  vpc_id      = "${var.vpc_id}"

  # Allow access on IANA User ports:
  # https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml
  # The canonical port for communication with docker over tcp (2375) is
  # included within this range. Docker containers will recieve a random port within this range.
  ingress {
    from_port   = 1024
    to_port     = 49151
    protocol    = "tcp"
    cidr_blocks = ["${var.vpc_cidr_block}"]
  }

  egress {
    from_port   = 0             # Implicit with AWS, but Terraform requires that it be explicit:
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags {
    Name = "${var.security_group_name}"
  }
}

resource "aws_instance" "docker_host" {
  ami                    = "ami-2757f631"
  subnet_id              = "${var.private_subnet_id}"
  instance_type          = "t2.small"
  vpc_security_group_ids = ["${aws_security_group.allow_docker.id}"]
  root_block_device {
    volume_size = "20"
  }
  user_data = <<EOF
#!/bin/bash
set -o errexit
set -o verbose
sudo apt-get update
sudo apt -yq install docker.io
sudo mkdir /lib/systemd/system/docker.service.d
sudo echo -e '[Service]\nExecStart=\nExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:${var.docker_tcp_port}' > /lib/systemd/system/docker.service.d/startup_options.conf
sudo systemctl daemon-reload
sudo service docker restart
EOF

  # systemd config based on https://success.docker.com/article/How_do_I_enable_the_remote_API_for_dockerd

  tags {
    Name = "${terraform.workspace} (terraform docker host)"
  }
}
