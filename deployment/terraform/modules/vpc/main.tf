resource "aws_vpc" "vpc" {
  cidr_block           = "${var.vpc_cidr_block}"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags {
    Name = "terraform"
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.public_cidr_block}"
  availability_zone       = "${var.availability_zone}"
  map_public_ip_on_launch = true

  tags {
    Name = "terraform public"
  }
}

resource "aws_subnet" "private_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.private_cidr_block}"
  availability_zone       = "${var.availability_zone}"

  tags {
    Name = "terraform private"
  }
}

resource "aws_internet_gateway" "public_gateway" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags {
    Name = "terraform public"
  }
}

resource "aws_internet_gateway" "egress_gateway" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags {
    Name = "terraform egress"
  }
}

resource "aws_route_table" "route_table" {
  vpc_id = "${aws_vpc.vpc.id}"

  route {
    cidr_block = "${var.public_cidr_block}"
    gateway_id = "${aws_internet_gateway.public_gateway.id}"
  }

  route {
    cidr_block = "${var.private_cidr_block}"
    egress_only_gateway_id = "${aws_internet_gateway.egress_gateway.id}"
  }

  tags {
    Name = "terraform"
  }
}
