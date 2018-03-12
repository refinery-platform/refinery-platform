output "upload_bucket_name" {
  value = "${module.object_storage.upload_bucket_name}"
}

output "identity_pool_id" {
  value = "${module.identity_pool.identity_pool_id}"
}

output "vpc_id" {
  value = "${module.vpc.vpc_id}"
}

output "public_subnet_id_a" {
  value = "${module.vpc.public_subnet_id_a}"
}

output "public_subnet_id_b" {
  value = "${module.vpc.public_subnet_id_b}"
}

output "docker_hostname" {
  value = "tcp://${module.docker_host.docker_hostname}:2376"
}