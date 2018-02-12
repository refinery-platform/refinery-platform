output "upload_bucket_name" {
  value = "${module.object_storage.upload_bucket_name}"
}

output "identity_pool_id" {
  value = "${module.identity_pool.identity_pool_id}"
}

output "docker_hostname" {
  value = "${module.docker_host.docker_hostname}"
}