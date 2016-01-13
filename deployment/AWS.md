# Deployment on Amazon AWS

## Summary

Generate AWS Cloud Formation template file using `cfn-pyplates` and create stack using AWS cli tools. Clone the code and install the deployment tools:
```shell
git clone git@github.com:parklab/refinery-platform.git
pip install -r refinery-platform/deployment/requirements.txt
```

## AWS account requirements

- The AWS account must have a key pair with KeyName `id_rsa`.
- SSH access only works if the default security group allows
  inbound access on port 22 (the SSH port).
- HTTP access only works if the default security group allows
  inbound access on port 80.
- A role called "refinery-web" must already exist and it must
  grant readonly access to the RDS API. (technically it is an
  instance-profile that is used, but creating a role also creates
  an instance-profile).
- A named RDS (PostgreSQL) must exist in the account.

## Generate JSON file and start stack:

A CloudFormation stack is
described by a JSON file
(`deploy.json` below) and
created with the AWS CLI command
`aws cloudformation create-stack`.

You should have the name of your RDS in hand. I use
`rds-refinery` below.

```shell
cd refinery-platform/deployment
cfn_py_generate aws_cfn.py deploy.json
aws cloudformation create-stack --stack-name test-$(date +%Y%m%dT%H%M) --template-body file://deploy.json --parameters 'ParameterKey=RDSName,ParameterValue=rds-refinery'
```

This creates a stack with a new name every time. The name of the
stack is _test-YYYYMMDDTHHMM_.

Change the value after the `--stack-name` option if you want to
use a different name.

## Stopping or Deleting a stack

Stacks aren't really stopped, they're deleted. You can either use
the AWS Web Console (click the cube in top left, then "Cloud
Formation"), or the command line tools:

```
aws cloudformation delete-stack --stack-name StackNameHere
```
