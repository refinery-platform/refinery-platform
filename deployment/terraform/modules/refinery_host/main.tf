resource "aws_security_group" "allow_ssh" {
  # TODO: Create Terraform security groups that reflect those currently in use.
  name        = "${var.security_group_name}"
  description = "Temporarily allow SSH"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0             # Implicit with AWS, but Terraform requires that it be explicit:
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name = "${var.name} (terraform)"
  }
}

resource "aws_instance" "refinery_host" {
  # TODO: Use appropriate AMI/instance/etc.
  ami                    = "ami-2757f631"
  count                  = "${var.refinery_host_count}"
  subnet_id              = "${var.public_subnet_id}"
  instance_type          = "t2.micro"
  key_name               = "${var.key_name}"
  vpc_security_group_ids = ["${aws_security_group.allow_ssh.id}"]

  user_data = <<EOF
#!/bin/bash
set -o errexit
set -o verbose
sudo apt-get update
sudo apt -yq install docker.io
echo 'export DOCKER_HOST=tcp://${var.docker_hostname}:2376' >> ~ubuntu/.bashrc
EOF

  tags {
    Name = "${var.name} (terraform demo host)"
  }
}
