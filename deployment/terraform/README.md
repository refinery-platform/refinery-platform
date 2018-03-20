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
CloudFormation stack creation. You can either fill these values into an
existing `deployment/aws-config/config.yaml` by hand, or start from scratch
with ERB:

```shell
erb deployment/aws-config/config.yaml.erb > deployment/aws-config/config.yaml
```
