# Deployment on Amazon AWS

## Summary

The overall process is:

- Fetch Refinery software and dependencies
- Configure Amazon AWS account
- Generate AWS CloudFormation template (using `cfn-pyplates`)
- Create CloudFormation stack

## Software

Clone the code and install the deployment tools:
```shell
git clone git@github.com:parklab/refinery-platform.git
pip install -r refinery-platform/deployment/requirements.txt
```

## AWS account requirements

- (The above `pip install` will install the AWS CLI tools)
- You should configure (`aws configure`) the AWS CLI with the
  Access Key ID and the Secret Access Key for the IAM account that
  you are going to use to create the stack.
- The AWS account must have an EC2 key pair with KeyName `id_rsa`
  (this is for SSH; to SSH in, you will need the corresponding
  private key).
- SSH access only works if the default security group allows
  inbound access on port 22 (the SSH port).
- HTTP access only works if the default security group allows
  inbound access on port 80.
- An IAM role called "refinery-web" must already exist and it must
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
In our case we generate the JSON
from a Python description using `cfn-pyplates`.

You should have the name of your RDS in hand.
I use `rds-refinery` below.

```shell
cd refinery-platform/deployment
cfn_py_generate aws_cfn.py deploy.json
aws cloudformation create-stack --stack-name test-$(date +%Y%m%dT%H%M) --template-body file://deploy.json --parameters 'ParameterKey=RDSName,ParameterValue=rds-refinery'
```

This creates a stack with a new name every time.
The name of the stack is _test-YYYYMMDDTHHMM_.

If you want to use a different name,
change the value after the `--stack-name` option.

## Stopping or Deleting a stack

Stacks aren't really stopped, they're deleted.
You can either
use the AWS Web Console
(click the cube in top left, then "Cloud Formation"),
or the command line tools:

```
aws cloudformation delete-stack --stack-name StackNameHere
```

(`aws cloudformation describe-stacks` will show all the stacks
in the AWS account)
