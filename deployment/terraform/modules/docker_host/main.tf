variable "cidr_block" {
  type = "string"
  default = "10.0.0.0/16"
}

variable "security_group_id" {
  type = "string"
  default = "my_security_group_id"
}

variable "security_group_name" {
  type = "string"
  default = "allow_docker"
}



resource "aws_vpc" "main" {
  cidr_block = "${var.cidr_block}"
}

resource "aws_security_group" "allow_docker" {
  name        = "${var.security_group_name}"
  description = "Allow connection to docker engine from within the VPC"
  vpc_id      = "${aws_vpc.main.id}"

  ingress {
    from_port   = 0
    to_port     = 2376
    protocol    = "tcp"
    cidr_blocks = ["${var.cidr_block}"]
  }

  egress {  # Implicit with AWS, but Terraform requires that it be explicit:
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name = "${var.security_group_name}"
  }
}

resource "aws_instance" "docker_host" {
  ami           = "ami-2757f631"
  instance_type = "t2.micro"
  vpc_security_group_ids = ["${aws_security_group.allow_docker.id}"]
}