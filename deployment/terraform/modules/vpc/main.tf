resource "aws_vpc" "vpc" {
  cidr_block           = "${var.vpc_cidr_block}"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = "${merge(var.tags, map("Name", var.resource_name_prefix))}"
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.public_cidr_block}"
  availability_zone       = "${var.availability_zone_a}"
  map_public_ip_on_launch = true
  tags                    = "${merge(
    var.tags, map("Name", "${var.resource_name_prefix} public subnet")
  )}"
}

resource "aws_subnet" "private_subnet_a" {
  vpc_id            = "${aws_vpc.vpc.id}"
  cidr_block        = "${var.private_cidr_block_a}"
  availability_zone = "${var.availability_zone_a}"
  tags              = "${merge(
    var.tags, map("Name", "${var.resource_name_prefix} private subnet a")
  )}"
}

/*
This subnet currently isn't utilized other than to satisfy the
requirements of module.rds.aws_db_subnet_group. It will be utilized once
we have a multi-AZ RDS instance
*/
resource "aws_subnet" "private_subnet_b" {
  vpc_id            = "${aws_vpc.vpc.id}"
  cidr_block        = "${var.private_cidr_block_b}"
  availability_zone = "${var.availability_zone_b}"
  tags              = "${merge(
    var.tags, map("Name", "${var.resource_name_prefix} private subnet b")
  )}"
}

resource "aws_internet_gateway" "public_gateway" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", var.resource_name_prefix))}"
}

resource "aws_route_table" "public_route_table" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", "${var.resource_name_prefix} public"))}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.public_gateway.id}"
  }
}

resource "aws_route_table_association" "public_subnet" {
  subnet_id      = "${aws_subnet.public_subnet.id}"
  route_table_id = "${aws_route_table.public_route_table.id}"
}

resource "aws_eip" "docker_nat" {
  count = "${var.docker_nat_gateway_count}"
  vpc   = true
  tags  = "${merge(var.tags, map("Name", var.resource_name_prefix))}"
}

resource "aws_nat_gateway" "docker_nat" {
  count         = "${var.docker_nat_gateway_count}"
  allocation_id = "${aws_eip.docker_nat.id}"
  subnet_id     = "${aws_subnet.public_subnet.id}"
  depends_on    = ["aws_internet_gateway.public_gateway"]
  tags          = "${merge(var.tags, map("Name", var.resource_name_prefix))}"
}

resource "aws_route_table" "private_route_table" {
  count  = "${var.docker_nat_gateway_count}"
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", "${var.resource_name_prefix} nat"))}"
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = "${aws_nat_gateway.docker_nat.id}"
  }
}

resource "aws_route_table_association" "private_subnet" {
  count          = "${var.docker_nat_gateway_count}"
  subnet_id      = "${aws_subnet.private_subnet_a.id}"
  route_table_id = "${aws_route_table.private_route_table.id}"
}
