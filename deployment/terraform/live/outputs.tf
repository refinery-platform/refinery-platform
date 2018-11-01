output "vpc_id" {
  value = "${module.vpc.vpc_id}"
}

output "public_subnet_id" {
  value = "${module.vpc.public_subnet_id}"
}

output "s3_bucket_name_base" {
  value = "${local.s3_bucket_name_base}"
}

output "elb_security_group_id" {
  value = "${module.vpc.elb_security_group_id}"
}

output "app_server_instance_id" {
  value = "${module.app_server.instance_id}"
}

output "app_server_instance_az" {
  value = "${module.app_server.instance_az}"
}
