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

  egress {  # Implicit with AWS, but Terraform requires that it be explicit:
    from_port   = 0
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
  key_name               = "mccalluc"
  vpc_security_group_ids = ["${aws_security_group.allow_ssh.id}"]

  tags {
    Name = "${var.name} (terraform demo host)"
  }
}

#resource "aws_key_pair" "mccalluc" {
#  # Eventually, we want to get the keys from github, but for now
#  # I just want to be able to shell in and check that things work.
#  key_name   = "mccalluc"
#  public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC4GgdjtDnVwPM2HGFIJAnoc79skrS1H0QA3VoVOYV/lAKtWTtbGv8/KCx7aDc7iDFmY8XkmImY2tAtZLO4q+wVcjGJdkQIcZdOOhAbS9zK8d1eqIRkrF3dSU5R2RUDFoXKbODkJsS+VjSxRwP+RW5TAgJRUNl+kRQ03q3LYlRqNWo7171gcKIUZb2DzTjQrgWdfKGFM9bw26h3fFApnXI7fyXOjp82q2RL8GAQgZ1FPxhK///4LQoVva+lM7rJ/hp4IC4+ZQRGpe18zEJUxBRZQJmaqEM/SQs2EtlA3ybiwrTH3y1OYNVxUinmViMpy1UCSkEhzAjt6FaYQzfVBwFz"
#}