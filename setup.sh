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
rm -rf node
#####end node

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

####start avahi
cd avahi

ln -s / /avahi

cp -a etc/. /etc/
cp -a usr/. /usr/

chmod +x /usr/sbin/avahi-daemon

cp avahi /etc/init.d/avahi
chmod +x /etc/init.d/avahi

ln -s ../init.d/avahi /etc/rc2.d/S98avahi
ln -s ../init.d/avahi /etc/rc3.d/S98avahi
ln -s ../init.d/avahi /etc/rc4.d/S98avahi
ln -s ../init.d/avahi /etc/rc5.d/S98avahi



cd ..
rm -rf avahi

####end avahi


#####start node-red
cp -rp node-red/wyliodrin /wyliodrin/node-red
rm -rf node-red
#####end node-red


#####start wyliodrin-app-server
mkdir /opt/wyliodrin
mkdir /usr/wyliodrin

cp -rp wyliodrin-app-server /usr/wyliodrin/wyliodrin-app-server
rm -rf wyliodrin-app-server
ln -s /opt/wyliodrin /wyliodrin

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


/etc/init.d/redis start
/etc/init.d/wyliodrin-app-server


