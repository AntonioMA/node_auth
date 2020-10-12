#!/bin/bash
export REL_DIR=`dirname $0`
source $REL_DIR/env.sh

export LOG_FILE=$LOG_DIR/wowroom_$$.log
echo "Running the server at port 443 as $USER"

sudo SESSION_SECRET=$SESSION_SECRET CHROME_EXTENSION_ID=$CHROME_EXTENSION_ID \
     CSV_SEPARATOR=$CSV_SEPARATOR BASE_URL=$BASE_URL \
    `which node` server -d --user=$USER -p 443  --logLevel=$SERVER_LOG_LEVEL --logFile=$LOG_FILE \
                        -S -C $CERT_DIR

