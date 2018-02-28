#!/usr/bin/env bash
set -o errexit

die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 1 ] || die "Provide ssh key. (Also used for resource names.)"

yes yes | TF_LOG=debug terraform apply \
  -var "identity_pool_name=$1" \
  -var "key_name=$1" \
  -var "name=$1" \
  -var "refinery_host_count=1"

REFINERY_HOST=`terraform output refinery_hostname`
echo "ssh ubuntu@$REFINERY_HOST -i ~/.ssh/$1.pem"