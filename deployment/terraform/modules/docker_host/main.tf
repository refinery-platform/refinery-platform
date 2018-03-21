resource "aws_security_group" "allow_docker" {
  name        = "${var.security_group_name}"
  description = "Allow connection to docker engine from within VPC"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 2376
    to_port     = 2376
    protocol    = "tcp"
    cidr_blocks = ["${var.vpc_cidr_block}"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
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
  instance_type          = "t2.micro"
  vpc_security_group_ids = ["${aws_security_group.allow_docker.id}"]
  user_data = <<EOF
#!/bin/bash
set -o errexit
set -o verbose
sudo apt-get update
sudo apt -yq install docker.io
sudo mkdir /lib/systemd/system/docker.service.d
sudo echo -e '[Service]\nExecStart=\nExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376' > /lib/systemd/system/docker.service.d/startup_options.conf
sudo systemctl daemon-reload
sudo service docker restart
EOF

  # systemd config based on https://success.docker.com/article/How_do_I_enable_the_remote_API_for_dockerd

  tags {
    Name = "${terraform.workspace} (terraform docker host)"
  }
}
