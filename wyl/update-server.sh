#!/bin/bash


SERVER="/usr/wyliodrin/wyliodrin-app-server/"

if [ "$wyliodrin_board" = 'raspberrypi' -o "$wyliodrin_board" == 'udooneo' ];
then

echo "Updating " $wyliodrin_board

cd /tmp
rm -rf wyliodrin-app-server
git clone https://github.com/Wyliodrin/wyliodrin-app-server
cd wyliodrin-app-server
cp package.json $SERVER
cd $SERVER
(npm install && cp -R /tmp/wyliodrin-app-server/* $SERVER) || (echo "Update fail" ; exit 50)
echo "Update done, restarting server"
echo "**********************************************************************"
echo "If you are using a network connection, please reconnect to your board."
echo "**********************************************************************"
nohup supervisorctl restart wyliodrin-app-server &> /dev/null

else
echo "Unknown board, update fail"
exit 50

fi
