resource "aws_security_group" "allow_docker" {
  name        = "${var.security_group_name}"
  description = "Allow connection to docker engine from within VPC"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port   = 0
    to_port     = 2376
    protocol    = "tcp"
    cidr_blocks = ["${var.private_cidr_block}"]
  }

  ingress {
    from_port   = 0
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["${var.private_cidr_block}"]
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

resource "aws_instance" "docker_host" {
  ami                    = "ami-2757f631"
  subnet_id              = "${var.private_subnet_id}"
  instance_type          = "t2.micro"
  vpc_security_group_ids = ["${aws_security_group.allow_docker.id}"]

  tags {
    Name = "terraform docker host"
  }
}