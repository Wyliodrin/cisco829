
"use strict";

var debug = require ('debug')('wyliodrin.app.server.nm');
var child_process = require ('child_process');

function status (done)
{
	child_process.exec ('nmcli -t -f general,ap dev list', function (error, stdout, stderr)
	{
		if (error)
		{
			debug (error);
			done (error);
		}
		else
		{
			var devices = [];
			var device = null;
			var ssid = null;
			var quality = null;
			var list = stdout.split ('\n');
			for (var pos = 0; pos<list.length; pos++)
			{
				var regex = /([^:]+):([^$]+)/;
				var line = list[pos].match (regex);
				if (line && line.length > 2)
				{
					var propertyname = line[1];
					var propertyvalue = line[2];
					// debug ('propertyname '+propertyname);
					if (propertyname === 'GENERAL.DEVICE')
					{
						debug ('interface '+propertyvalue);
						device = {
							interface: propertyvalue
						};
						ssid = null;
						quality = null;
					}
					else
					if (propertyname === 'GENERAL.TYPE')
					{
						debug ('type '+propertyvalue);
						if (propertyvalue === '802-11-wireless')
						{
							devices.push (device);
						}
					}
					else
					if (propertyname.indexOf ('.SSID')>=0)
					{
						debug ('ssid '+propertyvalue);
						ssid = propertyvalue.substring (1, propertyvalue.length-1);
					}
					else
					if (propertyname.indexOf ('.SIGNAL')>=0)
					{
						debug ('quality '+propertyvalue);
						quality = parseInt (propertyvalue);
					}
					else
					if (propertyname.indexOf ('.ACTIVE')>=0)
					{
						if (propertyvalue === 'yes')
						{
							if (device !== null && ssid !== null) 
							{
								device.ssid = ssid;
								device.quality = quality;
							}
						}
					}
				}
			}
			done (null, devices);
		}
	});
}

module.exports.status = status;