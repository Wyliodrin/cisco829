
"use strict";

var fs = require ('fs');
var child_process = require ('child_process');

var a = process.argv[2];
var p = process.argv[3];
var restart = process.argv[4];
var name = process.argv[5];
var boardtype = process.argv[6];

if (!name) name = "%h";

if (a === 'p')
{
	fs.writeFileSync ('/etc/avahi/services/wyliodrinapp.service', '<service-group> <name replace-wildcards="yes">%h</name> <service protocol="ipv4"> <type>_wyapp._tcp</type> <port>'+p+'</port><txt-record>name='+name+'</txt-record><txt-record>category='+boardtype+'</txt-record><txt-record>platform=linux</txt-record></service> </service-group>');
	if (restart === 'restart')
	{
		child_process.exec ('/etc/init.d/avahi-daemon restart');
	}
}
else if (a === 's')
{
	fs.unlinkSync ('/etc/avahi/services/wyliodrinapp.service');
	if (restart === 'restart')
	{
		child_process.exec ('/etc/init.d/avahi-daemon restart');
	}
}

