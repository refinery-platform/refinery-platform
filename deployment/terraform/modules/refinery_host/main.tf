resource "aws_security_group" "allow_ssh" {
  # TODO: Create Terraform security groups that reflect those currently in use.
  name        = "${var.security_group_name}"
  description = "Temporarily allow SSH"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 0
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
    Name = "${var.security_group_name}"
  }
}

resource "aws_instance" "refinery_host" {
  # TODO: Use appropriate AMI/instance/etc.
  ami                    = "ami-2757f631"
  count                  = "${var.refinery_host_count}"
  subnet_id              = "${var.public_subnet_id}"
  instance_type          = "t2.micro"
  vpc_security_group_ids = ["${aws_security_group.allow_ssh.id}"]
}