resource "aws_vpc" "vpc" {
  cidr_block           = "${var.private_cidr_block}"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags {
    label = "refinery" # TODO: Do we need tags?
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.public_cidr_block}"
  availability_zone       = "${var.availability_zone}"
  map_public_ip_on_launch = false

  tags {
    label = "refinery" # TODO: Do we need tags?
  }
}

resource "aws_subnet" "private_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.private_cidr_block}"
  availability_zone       = "${var.availability_zone}"

  tags {
    label = "refinery" # TODO: Do we need tags?
  }
}