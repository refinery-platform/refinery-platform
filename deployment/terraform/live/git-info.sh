#!/bin/sh

# used by Terraform to obtain the current Git commit for deployment on AWS

# produce a JSON object containing the commit value
jq -n --arg commit "$(git rev-parse HEAD)" --arg email "$(git config --get user.email)" '{"commit": $commit, "email": $email}'
