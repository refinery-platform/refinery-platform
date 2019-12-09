terraform {
  required_version = "~> 0.10"

  backend "s3" {
    key                  = "terraform.tfstate"
    workspace_key_prefix = "sites"
  }
}

provider "aws" {
  version = "~> 1.0"
  region  = "${var.region}"
}

provider "external" {
  version = "~> 1.0"
}

provider "random" {
  version = "~> 2.0"
}

data "external" "git" {
  program = ["/bin/sh", "${path.module}/git-info.sh"]
}

resource "random_string" "rds_master_user_password" {
  length  = 8
  upper   = false
  special = false
}

resource "random_string" "django_admin_password" {
  length  = 8
  upper   = false
  special = false
}

locals {
  s3_bucket_name_base      = "${replace(terraform.workspace, "/[^A-Za-z0-9]/", "-")}"
  rds_master_user_password = "${var.rds_master_user_password != "" ? var.rds_master_user_password : random_string.rds_master_user_password.result}"
  tags                     = "${merge(
    var.tags,
    map(
      "owner", lookup(var.tags, "owner", "") != "" ? lookup(var.tags, "owner", "") : data.external.git.result["email"],
      "product", "refinery",
      "terraform", "true"
    )
  )}"
}

module "object_storage" {
  source           = "../modules/s3"
  bucket_name_base = "${local.s3_bucket_name_base}"
  origin_protocol  = "${var.ssl_certificate_id == "" ? "http" : "https"}"
  origin_domain    = "${var.site_domain}"
  tags             = "${local.tags}"
}

module "identity_pool" {
  source                   = "../modules/cognito"
  identity_pool_name       = "${replace(terraform.workspace, "/[^A-Za-z0-9_ ]/", " ")}"
  upload_bucket_name       = "${module.object_storage.upload_bucket_name}"
  iam_resource_name_prefix = "${terraform.workspace}"
}

module "docker_host" {
  source                = "../modules/docker_host"
  docker_instance_count = "${var.docker_instance_count}"
  vpc_cidr_block        = "${var.vpc_cidr_block}"
  private_subnet_id     = "${module.vpc.private_subnet_a_id}"
  vpc_id                = "${module.vpc.vpc_id}"
  resource_name_prefix  = "${terraform.workspace}"
  tags                  = "${local.tags}"
}

module "vpc" {
  source                   = "../modules/vpc"
  vpc_cidr_block           = "${var.vpc_cidr_block}"
  public_cidr_block        = "${var.public_cidr_block}"
  private_cidr_block_a     = "${var.private_cidr_block_a}"
  private_cidr_block_b     = "${var.private_cidr_block_b}"
  availability_zone_a      = "${var.availability_zone_a}"
  availability_zone_b      = "${var.availability_zone_b}"
  docker_nat_gateway_count = "${var.docker_instance_count > 0 ? 1 : 0}"
  resource_name_prefix     = "${terraform.workspace}"
  tags                     = "${local.tags}"
}

module "database" {
  source                       = "../modules/rds"
  app_server_security_group_id = "${module.web.instance_security_group_id}"
  availability_zone            = "${var.availability_zone_a}"
  master_user_password         = "${local.rds_master_user_password}"
  private_subnet_a             = "${module.vpc.private_subnet_a_id}"
  private_subnet_b             = "${module.vpc.private_subnet_b_id}"
  resource_name_prefix         = "${terraform.workspace}"
  snapshot_id                  = "${var.rds_snapshot_id}"
  vpc_id                       = "${module.vpc.vpc_id}"
  tags                         = "${local.tags}"
  alarm_sns_arn                = "${var.alarm_sns_arn}"
}

module "web" {
  source                               = "../modules/ec2"
  static_bucket_name                   = "${module.object_storage.static_bucket_name}"
  upload_bucket_name                   = "${module.object_storage.upload_bucket_name}"
  media_bucket_name                    = "${module.object_storage.media_bucket_name}"
  log_bucket_name                      = "${module.object_storage.log_bucket_name}"
  identity_pool_id                     = "${module.identity_pool.identity_pool_id}"
  instance_count                       = "${var.app_server_instance_count}"
  instance_type                        = "${var.app_server_instance_type}"
  key_pair_name                        = "${var.app_server_key_pair_name}"
  subnet_id                            = "${module.vpc.public_subnet_id}"
  ssh_users                            = "${var.app_server_ssh_users}"
  git_commit                           = "${var.git_commit != "" ? var.git_commit : data.external.git.result["commit"]}"
  django_admin_password                = "${var.django_admin_password != "" ? var.django_admin_password : random_string.django_admin_password.result}"
  django_default_from_email            = "${var.django_default_from_email}"
  django_server_email                  = "${var.django_server_email}"
  django_admin_email                   = "${var.django_admin_email}"
  rds_endpoint_address                 = "${module.database.instance_hostname}"
  rds_superuser_password               = "${local.rds_master_user_password}"
  docker_host                          = "${module.docker_host.docker_hostname}"
  site_name                            = "${var.site_name}"
  site_domain                          = "${var.site_domain}"
  ssl_certificate_id                   = "${var.ssl_certificate_id}"
  django_email_subject_prefix          = "${var.django_email_subject_prefix}"
  refinery_banner                      = "${var.refinery_banner}"
  refinery_banner_anonymous_only       = "${var.refinery_banner_anonymous_only}"
  refinery_custom_navbar_item          = "${var.refinery_custom_navbar_item}"
  refinery_google_analytics_id         = "${var.refinery_google_analytics_id}"
  refinery_google_recaptcha_site_key   = "${var.refinery_google_recaptcha_site_key}"
  refinery_google_recaptcha_secret_key = "${var.refinery_google_recaptcha_secret_key}"
  refinery_s3_user_data                = "${var.refinery_s3_user_data}"
  refinery_welcome_email_subject       = "${var.refinery_welcome_email_subject}"
  refinery_welcome_email_message       = "${var.refinery_welcome_email_message}"
  refinery_user_files_columns          = "${var.refinery_user_files_columns}"
  data_volume_size                     = "${var.data_volume_size}"
  data_volume_type                     = "${var.data_volume_type}"
  data_volume_snapshot_id              = "${var.data_volume_snapshot_id}"
  resource_name_prefix                 = "${terraform.workspace}"
  tags                                 = "${local.tags}"
  alarm_sns_arn                        = "${var.alarm_sns_arn}"
}
