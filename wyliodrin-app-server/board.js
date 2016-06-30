
"use strict";

var board = {
	'raspberrypi':
	{
		serial:'/dev/ttyAMA0',
		firmware:'/Arduino/src/Arduino.ino',
		firmware_makefile: '',
		signals:'redis',
		nettype:'iwconfig',
		shell:'bash',
		avahi:'publish'
	},
	'beagleboneblack':
	{
		serial:'/dev/ttyGS0',
		firmware:'',
		firmware_makefile: '',
		signals:'redis',
		nettype:'iwconfig',
		shell:'bash',
		avahi:'publish'
	},
	'udooneo':
	{
		serial:'/dev/ttyGS0',
		firmware:'/Arduino/Arduino.ino',
		firmware_makefile: '',
		signals:'redis',
		nettype:'nm',
		shell:'bash',
		avahi:'publish'
	},
	'arduinoyun':
	{
		serial:null,
		firmware:'/Arduino/Arduino.ino',
		firmware_makefile: 'arduinoyun.mk',
		signals:'udp',
		nettype:'iwconfig',
		shell:'sh',
		avahi:'restart'
	},
	'cisco829':
	{
		serial:null,
		firmware:'',
		firmware_makefile: '',
		signals:'redis',
		nettype:'iwconfig',
		shell:'sh',
		avahi:'restart'
	}
};

module.exports = board;
