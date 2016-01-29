web.json: aws_cfn.py
	cfn_py_generate aws_cfn.py web.json

web-stack: web.json .PHONY
	aws cloudformation create-stack --stack-name refinery-web-$$(date +%Y%m%dT%H%M) --template-body file://web.json

ebs.json: ebs_cfn.py
	cfn_py_generate ebs_cfn.py ebs.json

volume-stack: ebs.json .PHONY
	aws cloudformation create-stack --stack-name refinery-volume-$$(date +%Y%m%dT%H%M) --template-body file://ebs.json

.PHONY:
