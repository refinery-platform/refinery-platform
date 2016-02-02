web.json: web_cfn.py
	cfn_py_generate web_cfn.py web.json

web-stack: web.json .PHONY
	aws cloudformation create-stack --stack-name refinery-web-$$(date +%Y%m%dT%H%M) --template-body file://web.json

volume.json: volume_cfn.py
	cfn_py_generate volume_cfn.py volume.json

volume-stack: volume.json .PHONY
	aws cloudformation create-stack --stack-name refinery-volume-$$(date +%Y%m%dT%H%M) --template-body file://volume.json

.PHONY:
