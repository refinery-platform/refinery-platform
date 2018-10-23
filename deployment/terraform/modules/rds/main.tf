resource "aws_db_subnet_group" "default" {
  name       = "${var.resource_name_prefix}"
  subnet_ids = ["${var.private_subnet_a}", "${var.private_subnet_b}"]
  tags       = "${var.tags}"
}

resource "aws_security_group" "db" {
  description = "Refinery: allow incoming connections to PostgreSQL DB"
  name = "${var.resource_name_prefix}-db"
  tags = "${var.tags}"
  vpc_id = "${var.vpc_id}"

  ingress {
    from_port = 5432
    to_port   = 5432
    protocol  = "tcp"
    security_groups = ["${var.app_server_security_group_id}"]
  }
}

resource "aws_db_instance" "default" {
  allocated_storage          = 5
  auto_minor_version_upgrade = false
  availability_zone          = "${var.availability_zone}"
  backup_window              = "23:34-00:04"
  backup_retention_period    = 15
  copy_tags_to_snapshot      = true
  db_subnet_group_name       = "${aws_db_subnet_group.default.id}"
  engine                     = "postgres"
  engine_version             = "10.4"
  final_snapshot_identifier  = "${var.resource_name_prefix}-final"
  identifier                 = "${var.resource_name_prefix}"
  instance_class             = "db.t2.small"
  password                   = "${var.master_user_password}"
  publicly_accessible        = false
  snapshot_identifier        = "${var.snapshot_id}"
  storage_type               = "gp2"
  tags                       = "${var.tags}"
  username                   = "root"
  vpc_security_group_ids     = ["${aws_security_group.db.id}"]
}
