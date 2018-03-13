resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "rds subnet group"
  subnet_ids = [
    "${var.private_subnet_a}",
    "${var.private_subnet_b}"
  ]
}