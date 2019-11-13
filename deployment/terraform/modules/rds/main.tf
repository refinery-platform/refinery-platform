resource "aws_db_subnet_group" "default" {
  name       = "${var.resource_name_prefix}"
  subnet_ids = ["${var.private_subnet_a}", "${var.private_subnet_b}"]
  tags       = "${var.tags}"
}

resource "aws_security_group" "db" {
  description = "Refinery: allow incoming connections to PostgreSQL DB"
  name        = "${var.resource_name_prefix}-db"
  tags        = "${var.tags}"
  vpc_id      = "${var.vpc_id}"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = ["${var.app_server_security_group_id}"]
  }
}

resource "aws_db_instance" "default" {
  allocated_storage          = 20
  auto_minor_version_upgrade = true
  availability_zone          = "${var.availability_zone}"
  backup_window              = "07:45-08:15"  # UTC
  backup_retention_period    = 15
  copy_tags_to_snapshot      = true
  db_subnet_group_name       = "${aws_db_subnet_group.default.id}"
  engine                     = "postgres"
  engine_version             = "10"
  # snapshot IDs must be unique
  final_snapshot_identifier  = "${var.resource_name_prefix}-final-${substr(uuid(), 0, 8)}"
  identifier                 = "${var.resource_name_prefix}"
  instance_class             = "db.t2.small"
  maintenance_window         = "Wed:08:30-Wed:09:00"  #UTC
  password                   = "${var.master_user_password}"
  publicly_accessible        = false
  snapshot_identifier        = "${var.snapshot_id}"
  storage_type               = "gp2"
  tags                       = "${var.tags}"
  username                   = "root"
  vpc_security_group_ids     = ["${aws_security_group.db.id}"]
  # avoid assigning a new value to final snapshot ID on every apply
  lifecycle {
    ignore_changes = ["final_snapshot_identifier"]
  }
}

resource "aws_cloudwatch_metric_alarm" "default_rds_cpu_utilization" {
  count               = "${var.alarm_sns_arn == "" ? 0 : 1}"
  alarm_name          = "${var.resource_name_prefix}-default-rds-cpu-utilization"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "5"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "25"
  alarm_description   = "Monitors CPU utilization of default RDS instance"
  alarm_actions       = [ "${var.alarm_sns_arn}" ]
  dimensions {
    DBInstanceIdentifier = "${aws_db_instance.default.id}"
  }

}
