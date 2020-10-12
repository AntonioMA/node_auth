#!/bin/sh

# Change this if you want to set up a fixed dir that is not the parent of this one
BASE_PATH=`dirname $0`/..

# Separator for the imported AND exported CSVs
CSV_SEPARATOR=";"

# Directory to store the logs on. The directory must exist
LOG_DIR=$BASE_PATH/logs

# Level for the server logs. Available levels are trace, log, warn, error (in severity order). Trace
# can be very verbose
SERVER_LOG_LEVEL=warn,error,log,trace

# The base URL for this server. Used for the Office 365 integration
BASE_URL=https://wowroom.ie.edu

# Directory where the public and private key for the server certificate live. You
# must change this
CERT_DIR=$BASE_PATH/liveCerts

# User to run the server as
USER=`whoami`

# From this point onwards, it's very rare to need to change something.
# The secret to generate session cookies
SESSION_SECRET=thisIsTheSecretForTheCookiesYouShouldChangeIt

# The id of the chrome extension. This should not change once installed
CHROME_EXTENSION_ID=fmmlkbppfpbconogfogbhlmopphddcgl

export USER LOG_DIR CERT_DIR USER CSV_SEPARATOR BASE_URL SESSION_SECRET CHROME_EXTENSION_ID
