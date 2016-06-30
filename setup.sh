#!/bin/sh

mkdir /opt

#######start node
cd node

cp -a bin/. /usr/bin/
cp -a lib/. /usr/lib/
cp -a include/. /usr/include/
cp -a share/. /usr/share/

chmod +x /usr/bin/node

cd ..
#####end node

#####start redis
cd redis

cp redis-cli /usr/bin/redis-cli
cp redis-server /usr/bin/redis-server
chmod +x /usr/bin/redis-cli
chmod +x /usr/bin/redis-server

cp redis /etc/init.d/redis
chmod +x /etc/init.d/redis

ln -s ../init.d/redis /etc/rc2.d/S98redis
ln -s ../init.d/redis /etc/rc3.d/S98redis
ln -s ../init.d/redis /etc/rc4.d/S98redis
ln -s ../init.d/redis /etc/rc5.d/S98redis

cd ..
#end redis


#####start wyliodrin-app-server
mkdir /opt/wyliodrin
cp -rp wyliodrin-app-server /opt/wyliodrin/wyliodrin-app-server

ln -s /opt/wyliodrin /wyliodrin

mkdir /wyliodrin/projects
mkdir /wyliodrin/projects/build

cd /wyliodrin/wyliodrin-app-server

mkdir /etc/wyliodrin
echo -n cisco829 > /etc/wyliodrin/boardtype
cp setup/settings_cisco829.json /etc/wyliodrin

cp scripts/cisco829/wyliodrin-app-server /etc/init.d/wyliodrin-app-server

chmod +x /etc/init.d/wyliodrin-app-server

ln -s ../init.d/wyliodrin-app-server /etc/rc2.d/S99wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc3.d/S99wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc4.d/S99wyliodrin-app-server
ln -s ../init.d/wyliodrin-app-server /etc/rc5.d/S99wyliodrin-app-server
#####end wyliodrin-app-server


