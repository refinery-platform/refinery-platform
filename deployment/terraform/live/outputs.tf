output "identity_pool_id" {
  value = "${module.identity_pool.identity_pool_id}"
}

output "vpc_id" {
  value = "${module.vpc.vpc_id}"
}

output "public_subnet_id" {
  value = "${module.vpc.public_subnet_id}"
}

output "docker_hostname" {
  value = "${module.docker_host.docker_hostname}"
}

output "s3_bucket_name_base" {
  value = "${local.s3_bucket_name_base}"
}

output "elb_security_group_id" {
  value = "${module.vpc.elb_security_group_id}"
}

output "app_server_security_group_id" {
  value = "${module.vpc.app_server_security_group_id}"
}

output "db_hostname" {
  value = "${module.database.instance_hostname}"
}

output "iam_smtp_user" {
  value = "${module.app_server.iam_smtp_user}"
}

output "app_server_profile_id" {
  value = "${module.app_server.instance_profile_id}"
}
