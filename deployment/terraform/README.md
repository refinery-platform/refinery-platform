# Terraform

> **NOTE:** Terraform is required for the following step. Please visit 
https://www.terraform.io/downloads.html to download. See 
[Terraform wiki page](https://github.com/refinery-platform/refinery-platform/wiki/Terraform) 
for more details.

Create the terraform-managed assets by running the following commands in the 
`deployment/terraform/live` directory. `<workspace-name>` should be given a 
meaningful name; generally, something that describes that stack(s) to be 
created while working within it.

```shell
terraform workspace new <workspace-name>
TF_LOG=DEBUG terraform apply
```

`terraform apply` will yield some outputs that will need to be passed along to 
the CloudFormation stack creation. You'll need to populate these 
terraform-specific variables in `deployment/aws-config/config.yaml` 
with their corresponding outputs from a successful `terraform apply` command.

Example `terraform apply` output:
```
Apply complete! Resources: 18 added, 0 changed, 0 destroyed.

Outputs:

identity_pool_id = us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
public_subnet_id = subnet-xxxxxxxx
rds_db_subnet_group_name = rds subnet group
s3_bucket_name_base = example-workspace
upload_bucket_name = example-workspace-upload
vpc_id = vpc-xxxxxxxx
```


At the moment of typing this the config.yaml variables to populate are:
```
COGNITO_IDENTITY_POOL_ID: <identity_pool_id>
VPC_ID: <vpc_id>
PUBLIC_SUBNET_ID: <public_subnet_id>
RDS_DB_SUBNET_GROUP_NAME: <rds_db_subnet_group_name>
S3_BUCKET_NAME_BASE: <s3_bucket_name_base>
``` 