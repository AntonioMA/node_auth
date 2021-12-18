#!/bin/bash

case $# in
  2|3) ;;
  *) echo "usage: addClient.sh client_id callbacks [auth_type]"
     echo "  Possible values for auth_type are client_secret_post, client_secret_basic, private_key_jwt, and none"
     exit 1
  ;;
esac

export HYDRA_ENDPOINT="http://127.0.0.1:4445"
export CLIENT_ID=$1
shift
export CALLBACKS=$1
shift
export TOKEN_AUTH_METHOD=$1
TOKEN_AUTH_METHOD=${TOKEN_AUTH_METHOD:-client_secret_basic}

export SECRET=$(hexdump -e '"%x"' -n 20 < /dev/random)

./hydra clients create \
    --endpoint ${HYDRA_ENDPOINT} \
    --id ${CLIENT_ID} \
    --secret ${SECRET} \
    --grant-types authorization_code,refresh_token \
    --response-types code,id_token \
    --scope openid,offline,email \
    --callbacks ${CALLBACKS} \
    --token-endpoint-auth-method ${TOKEN_AUTH_METHOD}

echo Client $CLIENT_ID created. Secret: $SECRET
# glooctl create secret oauth --namespace gloo-system --name hydra --client-secret d995c12f21c1f0b51f2ea14ec261f1d974cc1a1
# kubectl delete secret -n gloo-system hydra
