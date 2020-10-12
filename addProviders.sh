#!/bin/bash
# Very simple script to add the providers to the REDIS database specified as REDIS_URL
echo Adding providers from $1 to: ${REDIS_URL:-local redis}
echo 'Press Ctrl+C if that is not correct or any enter key to continue'
read
PREFIX=otZS/Authenticator/
SEP=""

case $REDIS_URL in
    '')
        unset REDIS_PORT REDIS_HOST REDIS_PASSWD
    ;;
    *)
        export REDIS_PORT="-p `echo $REDIS_URL|sed 's%redis://h:%%g' | cut -f2 -d @| cut -f2 -d:`"
        export REDIS_HOST="-h `echo $REDIS_URL|sed 's%redis://h:%%g' | cut -f2 -d @| cut -f1 -d:`"
        export REDIS_PASSWD="-a `echo $REDIS_URL|sed 's%redis://h:%%g' | cut -f1 -d @`"
 ;;
esac

for i in $1/*_creds.json
do
  PROVIDER=`basename $i|cut -f1 -d_`
  KEY=${PREFIX}${PROVIDER}
  echo Storing provider $PROVIDER as $KEY
  node addJSONKey.js -k $KEY -f $i
  PROVIDERS=${PROVIDERS}${SEP}$PROVIDER
  SEP=','
done
if [ -f $1/calendar_credentials.json ] 
then
  node addJSONKey.js -k "otZS/Params/calendar_credentials" -f $1/calendar_credentials.json
else
  echo "Cannot add the calendar credentials key!"
fi
echo Setting providers to $PROVIDERS
redis-cli $REDIS_HOST $REDIS_PORT $REDIS_PASSWD set otZS/Params/authenticator_providers $PROVIDERS
