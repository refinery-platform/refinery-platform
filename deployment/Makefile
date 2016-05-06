# This is a real file, but it depends on the github checksum,
# so we always want to build it. (and it's fast)
web.json: .PHONY
	python stack.py > web.json

web-stack: web.json .PHONY
	TZ=UTC date +refinery-web-%Y%m%dT%H%M > aws-config/stack-name
	aws cloudformation create-stack --capabilities CAPABILITY_IAM --stack-name $$(cat aws-config/stack-name) --template-body file://web.json

volume.json: .PHONY
	python volume_cfn.py > volume.json

volume-stack: volume.json .PHONY
	aws cloudformation create-stack --stack-name refinery-volume-$$(date +%Y%m%dT%H%M) --template-body file://volume.json

.PHONY:
