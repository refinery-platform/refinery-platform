resource "aws_vpc" "vpc" {
  cidr_block           = "${var.vpc_cidr_block}"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = "${merge(var.tags, map("Name", terraform.workspace))}"
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = "${aws_vpc.vpc.id}"
  cidr_block              = "${var.public_cidr_block}"
  availability_zone       = "${var.availability_zone_a}"
  map_public_ip_on_launch = true
  tags                    = "${merge(
    var.tags, map("Name", "${terraform.workspace} public subnet")
  )}"
}

resource "aws_subnet" "private_subnet_a" {
  vpc_id            = "${aws_vpc.vpc.id}"
  cidr_block        = "${var.private_cidr_block_a}"
  availability_zone = "${var.availability_zone_a}"
  tags              = "${merge(
    var.tags, map("Name", "${terraform.workspace} private subnet a")
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
    var.tags, map("Name", "${terraform.workspace} private subnet b")
  )}"
}

resource "aws_internet_gateway" "public_gateway" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", terraform.workspace))}"
}

resource "aws_route_table" "public_route_table" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", "${terraform.workspace} public"))}"
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
  vpc  = true
  tags = "${merge(var.tags, map("Name", terraform.workspace))}"
}

resource "aws_nat_gateway" "docker_nat" {
  allocation_id = "${aws_eip.docker_nat.id}"
  subnet_id     = "${aws_subnet.public_subnet.id}"
  depends_on    = ["aws_internet_gateway.public_gateway"]
  tags = "${merge(var.tags, map("Name", terraform.workspace))}"
}

resource "aws_route_table" "private_route_table" {
  vpc_id = "${aws_vpc.vpc.id}"
  tags   = "${merge(var.tags, map("Name", "${terraform.workspace} nat"))}"
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = "${aws_nat_gateway.docker_nat.id}"
  }
}

resource "aws_route_table_association" "private_subnet" {
  subnet_id      = "${aws_subnet.private_subnet_a.id}"
  route_table_id = "${aws_route_table.private_route_table.id}"
}

resource "aws_security_group" "elb" {
  # using standalone security group rule resources to avoid cycle errors
  description = "Refinery: allow HTTP/S ingress and HTTP egress"
  name        = "${terraform.workspace}-elb"
  tags        = "${var.tags}"
  vpc_id      = "${aws_vpc.vpc.id}"
}

resource "aws_security_group_rule" "http_ingress" {
  description       = "Refinery: allow HTTP ingress from Internet to ELB"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  security_group_id = "${aws_security_group.elb.id}"
}

resource "aws_security_group_rule" "https_ingress" {
  description       = "Refinery: allow HTTPS ingress from Internet to ELB"
  type              = "ingress"
  cidr_blocks       = ["0.0.0.0/0"]
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  security_group_id = "${aws_security_group.elb.id}"
}

resource "aws_security_group_rule" "http_egress" {
  description              = "Refinery: allow HTTP egress from ELB to app server"
  type                     = "egress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = "${aws_security_group.elb.id}"
  source_security_group_id = "${aws_security_group.app_server.id}"
}

resource "aws_security_group" "app_server" {
  description = "Refinery: allow HTTP and SSH access to app server instance"
  name        = "${terraform.workspace}-appserver"
  tags        = "${var.tags}"
  vpc_id      = "${aws_vpc.vpc.id}"

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = ["${aws_security_group.elb.id}"]
  }

  ingress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
  }

  egress {
    # implicit with AWS but Terraform requires this to be explicit
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
