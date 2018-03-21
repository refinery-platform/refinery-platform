resource "aws_vpc" "vpc" {
  cidr_block           = "${var.vpc_cidr_block}"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags {
    Name = "${terraform.workspace} (terraform)"
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.public_cidr_block}"
  availability_zone       = "${var.availability_zone_a}"
  map_public_ip_on_launch = true

  tags {
    Name = "${terraform.workspace} (terraform public subnet)"
  }
}

resource "aws_subnet" "private_subnet_a" {
  vpc_id            = "${aws_vpc.vpc.id}"
  cidr_block        = "${var.private_cidr_block_a}"
  availability_zone = "${var.availability_zone_a}"

  tags {
    Name = "${terraform.workspace} (terraform private subnet a)"
  }
}

/*
This subnet currently isn't utilized other than to satisfy the
requirements of module.rds.aws_db_subnet_group. It will be utilized once
we have a multi-AZ RDS instance
*/
resource "aws_subnet" "private_subnet_b" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.private_cidr_block_b}"
  availability_zone       = "${var.availability_zone_b}"

  tags {
    Name = "${terraform.workspace} (terraform private subnet b)"
  }
}

resource "aws_internet_gateway" "public_gateway" {
  vpc_id = "${aws_vpc.vpc.id}"

  tags {
    Name = "${terraform.workspace} (terraform)"
  }
}

resource "aws_route_table" "route_table" {
  vpc_id = "${aws_vpc.vpc.id}"

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.public_gateway.id}"
  }

  tags {
    Name = "${terraform.workspace} (terraform public)"
  }
}

resource "aws_route_table_association" "public_subnet" {
  subnet_id      = "${aws_subnet.public_subnet.id}"
  route_table_id = "${aws_route_table.route_table.id}"
}

