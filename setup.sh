#!/bin/sh

echo "Making paths"
rm -r /home/root/*
mkdir /opt
mkdir /opt/wyliodrin
mkdir /usr/wyliodrin

ln -s /opt/wyliodrin /wyliodrin
echo "Done"


echo "Installing NodeJS"
#######start node
cd node

cp -a bin/. /usr/bin/
cp -a lib/. /usr/lib/
cp -a include/. /usr/include/
cp -a share/. /usr/share/

chmod +x /usr/bin/node

cd ..
rm -rf node
#####end node
echo "Done"


echo "Installing Redis"
#####start redis
cd redis

cp redis-cli /usr/bin/redis-cli
cp redis-server /usr/bin/redis-server
chmod +x /usr/bin/redis-cli
chmod +x /usr/bin/redis-server

cp redis /etc/init.d/redis
chmod +x /etc/init.d/redis

ln -s ../init.d/redis /etc/rc2.d/S90redis
ln -s ../init.d/redis /etc/rc3.d/S90redis
ln -s ../init.d/redis /etc/rc4.d/S90redis
ln -s ../init.d/redis /etc/rc5.d/S90redis

cd ..
rm -rf redis
#end redis
echo "Done"




echo "Installing Node-Red"
#####start node-red
mkdir /wyliodrin/node-red
cp -a node-red/. /wyliodrin/node-red
rm -rf node-red
#####end node-red
echo "Done"


echo "Installing Loraserver"
adduser --disabled-password cisco

cp -a pgsqllib/usr/lib/* /usr/lib
cp -a pgsqllib/usr/include/* /usr/include
rm /usr/lib/libkeyutils.so.1
rm /usr/lib/libkeyutils.so
ln -s libkeyutils.so.1.5 libkeyutils.so
ln -s libkeyutils.so.1.5 libkeyutils.so.1
rm -rf pgsqllib

cp -a pgsql /software/
unzip /software/pgsql/data.zip -d /software/pgsql
rm /software/pgsql/data.zip
chown -R cisco /software/pgsql
rm -rf pgsql
chmod +x /software/pgsql/bin/postgres
chmod u+rwx /software/pgsql/data
chmod g-rwx /software/pgsql/data
chmod o-rwx /software/pgsql/data

cp loraserver /software/
chmod +x /software/loraserver
rm loraserver

cp lorascripts/pgsql /etc/init.d/pgsql
chmod +x /etc/init.d/pgsql

cp lorascripts/loraserver /etc/init.d/loraserver
chmod +x /etc/init.d/loraserver

ln -s ../init.d/pgsql /etc/rc2.d/S85pgsql
ln -s ../init.d/pgsql /etc/rc3.d/S85pgsql
ln -s ../init.d/pgsql /etc/rc4.d/S85pgsql
ln -s ../init.d/pgsql /etc/rc5.d/S85pgsql

ln -s ../init.d/loraserver /etc/rc2.d/S90loraserver
ln -s ../init.d/loraserver /etc/rc3.d/S90loraserver
ln -s ../init.d/loraserver /etc/rc4.d/S90loraserver
ln -s ../init.d/loraserver /etc/rc5.d/S90loraserver

rm lorascripts

su cisco -c "/software/pgsql/bin/postgres -D /software/pgsql/data" &
NET_ID=010203 BAND=EU_863_870 HTTP_BIND=0.0.0.0:8000 POSTGRES_DSN=postgres://loraserver:dbpassword@localhost/loraserver?sslmode=disable DB_AUTOMIGRATE=True /software/loraserver &



echo "Done"


echo "Installing Wyliodrin Server"
#####start wyliodrin-app-server
cp -rp wyliodrin-app-server /usr/wyliodrin/wyliodrin-app-server
rm -rf wyliodrin-app-server


mkdir /wyliodrin/projects
mkdir /wyliodrin/projects/build

cd /usr/wyliodrin/wyliodrin-app-server

mkdir /etc/wyliodrin
echo -n cisco829 > /etc/wyliodrin/boardtype
cp setup/settings_cisco829.json /etc/wyliodrin

cp scripts/cisco829/wyliodrin-app-server /etc/init.d/wyliodrin-app-server

chmod +x /etc/init.d/wyliodrin-app-server

ln -s ../init.d/wyliodrin-app-server /etc/rc2.d/S97wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc3.d/S97wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc4.d/S97wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc5.d/S97wyliodrin-app-server
#####end wyliodrin-app-server
echo "Done"

echo "Starting-up"
/etc/init.d/redis start
/etc/init.d/wyliodrin-app-server start &
echo "ALL DONE"


