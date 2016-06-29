#!/bin/sh

#opkg update
#opkg installgit gcc make node-serialport node-tty.js avr-toolchain arduino-files -d mnt

#cp -R /opt/usr/lib/node_modules/tty.js/node_modules/pty.js /opt/usr/lib/node_modules

mkdir /opt/wyliodrin

ln -s /opt/wyliodrin /wyliodrin

mkdir /wyliodrin/projects
mkdir /wyliodrin/projects/build

cd /wyliodrin

#git clone git://www.github.com/wyliodrin/wyliodrin-app-server
#cd wyliodrin-app-server
cd wyl 

mkdir /etc/wyliodrin
echo -n cisco829 > /etc/wyliodrin/boardtype
cp setup/settings_cisco829.json /etc/wyliodrin
cp scripts/cisco829/S99wyliodrin-app-server /etc/rc.d/ ###

#cp cisco829/wyliodrin.py /usr/lib/python2.7

#reboot
