#!/usr/bin/env bash
set -o errexit

# This has no role in our current production deployment, but it does make
# clear what is necessary for a public facing machine to talk to a docker host.

die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 2 ] || die "Provide verb and ssh key name"

VERB=$1
KEY=$2

yes yes | TF_LOG=debug terraform $VERB \
  -var "identity_pool_name=$KEY" \
  -var "key_name=$KEY" \
  -var "name=$KEY" \
  -var "refinery_host_count=1"

REFINERY_HOST=`terraform output refinery_hostname`
DOCKER_HOST=`terraform output docker_hostname`
cat <<EOF
##############

# Make sure it worked:
ssh ubuntu@$REFINERY_HOST -i ~/.ssh/$KEY.pem
echo \$DOCKER_HOST       # Should point to $DOCKER_HOST
docker info | grep Name  # Ditto, but with dashes
docker ps                # All docker commands should work

# If there's a problem:
# Uncomment the port 22 ingress in docker_host/main.tf, and re-apply.
# Then:
scp -i ~/.ssh/$KEY.pem ~/.ssh/$KEY.pem ubuntu@$REFINERY_HOST:$KEY.pem
ssh ubuntu@$REFINERY_HOST -i ~/.ssh/$KEY.pem
ssh ubuntu@$DOCKER_HOST -i $KEY.pem

##############
EOF