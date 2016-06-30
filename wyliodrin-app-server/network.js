
"use strict";

var child_process = require ('child_process');

var iwlist = require ('wireless-tools/iwlist');
var wpa_supplicant = require ('wireless-tools/wpa_supplicant');

var device = process.argv[2];
var a = process.argv[3];
var nadapter = process.argv[4];

if (a === 's')
{
	if (device === 'iwconfig')
	{
		child_process.exec ('ifconfig '+nadapter+' up', function (error, stdout, stderr)
		{
			iwlist.scan (nadapter, function (err, networks)
			{
				if (err)
				{
					console.log (err);
					process.exit (50);
				}
				else
				{
					console.log (JSON.stringify (networks));
				}
			});
		});
	}
	else
	if (device === 'nm')
	{
		child_process.exec ('nmcli dev wifi list iface '+nadapter, function (error, stdout, stderr)
		{
			if (!error)
			{
				var arrWifiList = stdout.split(/\r?\n/);
		      	var finalList = [];
		      
			      for (var i = 1; i < arrWifiList.length - 1; i++) { //skip first and last lines
			          var start_pos = arrWifiList[i].indexOf('\'') + 1;
			          var end_pos = arrWifiList[i].lastIndexOf('\'');
			          var networkName = arrWifiList[i].substring(start_pos,end_pos);
			          var isProtected = false;
			          if (arrWifiList[i].indexOf("WPA") > -1 || arrWifiList[i].indexOf("WEP") > -1) {
			              isProtected = true;
			          }
			          start_pos = arrWifiList[i].indexOf('MB/s') + 4;
			          var signal = arrWifiList[i].substring(start_pos).trim();
			          signal = parseInt(signal.substring(0, 3).trim());
			          
			          finalList.push({
			              ssid: networkName,
			              security: (isProtected?'wpa':'open'),
			              quality: signal
			          });
			      }
			      
			      finalList = finalList.sort(function(a, b) {
			        if (a.signal > b.signal) {
			            return -1;
			        } else {
			            if (a.signal < b.signal) {
			                return 1;
			            } else {
			                return 0;
			            }
			        }
			      });
			      console.log (JSON.stringify (finalList));
			}
			else
			{
				console.log (error);
				process.exit (50);
			}
		});
	}
}
else if (a === 'connect')
{
	var ssid = process.argv[5];
	var psk = process.argv[6];
	if (device === 'iwconfig')
	{
		wpa_supplicant.disable (nadapter, function (err)
		{
			wpa_supplicant.enable ({
				interface: nadapter,
				ssid: ssid,
				passphrase: psk,
				driver: 'wext'

			}, function (err)
			{
				if (err)
				{
					process.exit (50);
				}
				else
				{

				}
			});
		});
	}
	else
	if (device === 'nm')
	{
		child_process.execFile ('nmcli', ['dev', 'wifi', 'connect', ssid, 'iface', nadapter, 'password', psk], function (error, stdout, stderr)
		{
			if (error)
			{
				console.log (error);
				process.exit (50);
			}
			else
			{

			}
		});
	}
}
else if (a === 'disconnect')
{
	if (device === 'iwconfig')
	{
		wpa_supplicant.disable (nadapter, function (err)
		{
			if (err)
			{
				process.exit (50);
			}
			else
			{
				
			}
		});
	}
	else
	if (device === 'nm')
	{
		child_process.execFile ('nmcli', ['dev', 'disconnect', 'iface', nadapter], function (error, stdout, stderr)
		{
			if (error)
			{
				console.log (error);
				process.exit (50);
			}
			else
			{

			}
		});
	}
}

