resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "${var.resource_name_prefix}"
  subnet_ids = ["${var.private_subnet_a}", "${var.private_subnet_b}"]
  tags       = "${var.tags}"
}
