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

output "rds_db_subnet_group_name" {
  value = "${module.rds.rds_db_subnet_group_name}"
}

output "s3_bucket_name_base" {
  value = "${local.s3_bucket_name_base}"
}