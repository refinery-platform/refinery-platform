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
- HTTP access only works in the default security group allows
  inbound access on port 80.

## Generate JSON file and start stack:

```shell
cd refinery-platform/deployment
cfn_py_generate aws_cfn.py deploy.json
aws cloudformation create-stack --stack-name test-$(date +%Y%m%dT%H%M) --template-body file://deploy.json
```

This creates a stack with a new name every time, you might
prefer to re-use the stack name and delete it when you want to
create a new stack.
