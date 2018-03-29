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

`terraform apply` will yield outputs that need to be passed along for
CloudFormation stack creation. You can either start from scratch with ERB:

```shell
erb ../../aws-config/config.yaml.erb > ../../aws-config/config.yaml
```

Or if you have local tweaks you want to preserve, fill in by hand and then
diff to make sure you have the right changes:

```shell
diff <(erb ../../aws-config/config.yaml.erb) ../../aws-config/config.yaml
```
