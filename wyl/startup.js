
"use strict";

var SerialPort = require ('serialport').SerialPort;
var debug = require ('debug')('wyliodin:app:server');
var pty = require ('pty.js');
var child_process = require ('child_process');
var _ = require ('lodash');
var fs = require ('fs');
var path = require ('path');
var os = require ('os');
var async = require ('async');
var runAnotherProject = null;
var redis = require ("redis");

/* loading board setup */

var board = require ('./board.js');

debug ('Reading name');

var boardname = os.hostname();

try
{
	boardname = fs.readFileSync ('/wyliodrin/boardname').toString ();
}
catch (exception)
{
	
}


debug ('Reading board type');
var boardtype = fs.readFileSync ('/etc/wyliodrin/boardtype').toString();

debug ('Board type '+boardtype);
if (!boardtype)
{
	console.log ('Unknown board type');
	process.exit (-10);
}

var env = {
	HOME: '/wyliodrin',
	wyliodrin_board: boardtype,
	wyliodrin_version: version
};

debug ('Loading settings from /etc/wyliodrin/settings_'+boardtype+'.json');
var SETTINGS = require ('/etc/wyliodrin/settings_'+boardtype+'.json');

var CONFIG_FILE = {};

try
{
	require (SETTINGS.CONFIG_FILE);
}
catch (e)
{
	debug ('wyliodrin.json missing, standard setup')
	CONFIG_FILE.jid = '';
}

/* ********************************* */

var version = require ('./package.json').version;

var pam = null;

try
{
	pam = require ('authenticate-pam');
}
catch (e)
{
	debug ('error loading authenticate-pam');
}

var SOCKET = 1;
var SERIAL = 2;

var EventEmitter = require ('events').EventEmitter;

var net = require ('net');

var socketConnected = false;

var packets = new EventEmitter ();

var socket = null;

var ifconfig = require ('wireless-tools/ifconfig');
var iwconfig = require ('wireless-tools/iwconfig');

var taskManager = null;
var networkManager = null;

var nm = require ('./nm.js');

var tcpp = require ('tcp-ping');

var networkPing = function ()
{
	tcpp.ping ({address:'www.google.com', attempts: 5}, function (error, host)
	{
		// console.log (error);
		// console.log (host);
		if (!error && !isNaN(host.avg)) network = true;
		else network = false;
		setTimeout (networkPing, (network?60:10)*1000);
		status ();
	});
}

networkPing ();

/* Signals */

var client = null;

{
	var subscriber = redis.createClient ();
	client = redis.createClient ();

	subscriber.on ('error', function (error)
	{
		console.log ('subscriber redis '+error);
	});

	subscriber.subscribe ("wyliodrin-project", function (channel, count)
	{
		debug ("Subscribed");
	});

	subscriber.on ("message", function (channel, message)
	{
		if (message.indexOf ('signal:app-project')===0)
		{
			var projectId = message.substring(7);
			sendValues (projectId);
		}
	});

	client.on ('error', function (error)
	{
		console.log ('client redis '+error);
	});

	debug ('Erasing signals');
	client.ltrim ('app-project', 0, -1);
}

if (board[boardtype].signals === 'udp')
{
	var dgram = require('dgram');
	var udpserver = dgram.createSocket('udp4');
	udpserver.on('error', function (err) 
	{
		console.log('server error: '+err.stack);
		udpserver.close();
	});
	udpserver.on('message', function (msg, rinfo) 
	{
		var data = msg.toString().split (' ');
		if (data.length >= 2)
		{
			var s = {};
			s[data[0]] = parseFloat(data[1]);
			var t = data[2];
			sendLowPriority ('v', {t:t, s:s});
		}
	});
	udpserver.on('listening', function () 
	{
		var address = server.address();
		console.log('server listening '+address.address+':'+address.port);
	});
	udpserver.bind(7200);
}

var runmanager = {
	'nodejs':{},
	'python':{}
};

var network = false;

process.title = 'wyliodrin-app-server';

var PROJECT_PID_TEMP = '/tmp/.app-project';

debug ('Reading projectpid');
var projectpid = 0;
try
{
	projectpid = fs.readFileSync (PROJECT_PID_TEMP);
	debug ('projectpid '+projectpid);
}
catch (e)
{

}

var sendingValues = false;
var storedValues = false;

var _send = null;

var sendQueue = [];
var sendLowPriorityQueue = [];

var serialSending = false;
var socketSending = false;

var msgpack = require ('msgpack-lite');

var isConnected = false;

var EventEmitter = require ('events').EventEmitter;

var PACKET_SEPARATOR = CONFIG_FILE.serialpacketseparator || 255;
var PACKET_ESCAPE = CONFIG_FILE.serialpacketseparator || 0;
var BUFFER_PACKET_SEPARATOR = new Buffer([PACKET_SEPARATOR, PACKET_SEPARATOR]);
var BUFFER_SIZE = CONFIG_FILE.serialbuffersize || 4096;
var receivedFirstPacketSeparator = false;
var login = false;

var receivedData = new Buffer (BUFFER_SIZE);
var receivedDataPosition = 0;
var previousByte = 0;

var serial = null;

try
{
	if (board[boardtype].serial !== null)
	{
		serial = new SerialPort (board[boardtype].serial, {
			baudrate: CONFIG_FILE.serialbaudrate || 115200,
		}, false);

		serial.open (function (error)
		{
			if (!error)
			{
				debug ('Serial connected');
				isConnected = true;
				send ('', null);
				send ('ping', null);
				status ();
			}
			else
			{
				console.log (error);
			}	
		});

		serial.on ('error', function (error)
		{
			debug ('Serial port error '+error);
			console.log (error);
		});

		serial.on ('data', function (data)
		{
			if (socket !== null) 
			{
				debug ('Serial data, socket');
				socket.end ();
				reset (SERIAL);
			}
			// console.log (data.length);
			// console.log (data.toString ());
			for (var pos = 0; pos < data.length; pos++)
			{
				// console.log (data[pos]);
				receivedDataPacket (data[pos]);
			}
		});
	}
}
catch (e)
{
	debug ('Serial '+e);
}

if (serial !== null)
{
	reset (SERIAL);
}
else
{
	reset (SOCKET);
}

function status ()
{
	debug ('Sending status');
	send ('i', {n:boardname, c:boardtype.toString(), r:projectpid!==0, i:network});
}

function sendVersion ()
{
	debug ('Sending version');
	send ('sv', {v:version});
}

var timer = 50;

var server = net.createServer (function (_socket)
{
	if (!socket)
	{
		socket = _socket;
		debug ('Socket connection');
		reset (SOCKET);
		socket.on ('data', function (data)
		{
			// console.log (data.length);
			for (var pos = 0; pos < data.length; pos++)
			{
				// console.log (data[pos]);
				receivedDataPacket (data[pos]);
			}
		});

		socket.on ('error', function ()
		{
			debug ('Socket error '+socket);
			reset (SERIAL);
			login = false;
			socket = null;
		});

		socket.on ('end', function ()
		{
			reset (SERIAL);
			debug ('Socket disconnect');
			login = false;
			socket = null;
		})
	}
	else
	{
		debug ('There is another connection already');
		_socket.end ();
	}
});

function publish ()
{
	var sudo = SETTINGS.run.split(' ');
	var run = 'node';
	var params = ['publish.js', 'p', server.address().port, board[boardtype].avahi, boardname, boardtype];
	if (sudo[0]==='sudo')
	{
		params.splice (0, 0, run);
		run = 'sudo';
	}
	child_process.execFile (run, params, function (error, stdout, stderr)
	{
	});
}

server.listen (CONFIG_FILE.server || 7000, function (err)
{
	publish ();
});

// catch ctrl+c event and exit normally
process.on('SIGINT', function () 
{
	console.log('Ctrl-C...');
	process.exit(2);
});

//catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', function(e) 
{
	console.log('Uncaught Exception...');
	console.log(e.stack);
	process.exit(99);
});

process.on ('exit', function ()
{
	var sudo = SETTINGS.run.split(' ');
	var run = 'node';
	var params = ['publish.js', 's', board[boardtype].avahi];
	if (sudo[0]==='sudo')
	{
		params.splice (0, 0, run);
		run = 'sudo';
	}
	child_process.execFile (run, params);
})

var shell = null;
var project = null;
var startingProject = false;

function addToBuffer (data)
{
	// TODO put maximum limit
	// debug ('Adding '+data+' to receivedData');
	if (receivedDataPosition >= receivedData.length)
	{
		// TODO verify a maximum size
		debug ('Data size exceeded, enlarging data with '+receivedData.length);
		var r = receivedData;
		receivedData = new Buffer (r.length*2);
		for (var pos=0; pos < r.length; pos++)
		{
			receivedData[pos] = r[pos];
		}
		receivedDataPosition = pos;
	}
	receivedData[receivedDataPosition] = data;
	receivedDataPosition=receivedDataPosition+1;
}

function packet ()
{
	debug ('Packet of size '+receivedDataPosition+' received');
	var data = receivedData.slice (0, receivedDataPosition);
	receivedDataPosition = 0;
	// console.log (data.length)
	var m;
	try
	{
		m = msgpack.decode (data);
	}
	catch (e)
	{
		console.log ('Received a packet with errors');
	}
	return m;
}

function openShell (p)
{
	if (!shell)
	{
		shell = pty.spawn(board[boardtype].shell, [], {
		  name: 'xterm-color',
		  cols: p.c,
		  rows: p.r,
		  cwd: '/wyliodrin',
		  env: _.assign (process.env, env)
		});

		shell.on ('error', function (error)
		{
			// send ('s', {a:'k', e:error});
			// send ('s', {a:'k', t:'Shell closed\n'});
			shell = null;
		});

		shell.on('data', function(data) {
		  	sendLowPriority ('s', {a:'k', t:data});
		});

		shell.on ('exit', function ()
		{
			send ('s', {a:'k', t:'Shell closed\n'});
			shell = null;
		})
	}
	shell.resize (p.c, p.r);
}


function keysShell (keys)
{
	if (shell) shell.write (keys);
}

function resizeShell (cols, rows)
{
	if (shell) shell.resize (cols, rows);
}

function stopProject ()
{
	if (projectpid !== 0)
	{
		child_process.exec (SETTINGS.stop+' '+projectpid);
		projectpid = 0;
		fs.unlink (PROJECT_PID_TEMP);
		if (project === null) status ();
	}
}



function processes (list)
{
    child_process.exec ('ps -eo pid,%cpu,vsz,comm,tty | tr -s \' \'', function (error, stdout, stderr)
    {
        if (stdout.trim().length==0)
        {
        	child_process.exec ('ps | tr -s \' \'', function (error, stdout, stderr)
        	{
        		listprocesse (stdout, list);
        	});
        }
        else
        {
        	listprocesse (stdout, list);
        }
    });
}

function kill (pid, done)
{
	//console.log (networkConfig.stop+' '+pid);
    child_process.exec (SETTINGS.stop+' '+pid, function (error, stdout, stderr)
    {

    	//console.log(error);
    	//console.log(stdout);
        if (done) done (error);
    });
}

function listprocesse (psls, pslist)
{
	var ps = []; 
    var lines = psls.split ('\n');
    var columns = lines[0].trim().split (' ');
    lines.splice (0,1);
    lines.forEach (function (process)
    {
        if (process!='')
        {
            var pscolumns = process.trim().split (' ');
            var pss = {};
            for (var i=0; i<columns.length; i++)
            {
                pss[columns[i]] = pscolumns[i];
            }
            ps.push (pss);
        }
    });
    ps.splice (ps.length-3, 3);
    pslist (ps);
}

function runProject (p)
{
	var dir = SETTINGS.build_file+'/app_project';
	var exec = child_process.exec;
	var ext = 'js';
	if (p.l === 'python') ext = 'py';
	else
	if (p.l === 'visual') ext = 'py';
	else
	if (p.l === 'shell') ext = 'sh';
	else
	if (p.l === 'streams') ext = 'streams';
	if (projectpid !== 0)
	{
		runAnotherProject = p;
		debug ('Stop project already started '+projectpid);
		stopProject ();
	}
	else
	{
		var sudo = SETTINGS.run.split(' ');
		if (sudo[0]==='sudo')
		{
			sudo = 'sudo';
		}
		else
		{
			sudo = '';
		}
		var firmwaremakefile = '';
		if (board[boardtype].firmware_makefile !== '')
		{
			firmwaremakefile = ' && cp ./makefile/'+board[boardtype].firmware_makefile+' '+dir+path.dirname(board[boardtype].firmware)+'/Makefile';
		}
		runAnotherProject = null;
		debug ('Removing project');
		if (startingProject === false)
		{
			startingProject = true;
			exec ('mkdir -p '+dir+' && '+sudo+' rm -rf '+dir+'/* && mkdir -p '+dir+path.dirname(board[boardtype].firmware)+firmwaremakefile, function (err, stdout, stderr)
			{
				startingProject = false;
				debug ('err: '+err);
				debug ('stdout: '+stdout);
				debug ('stderr: '+stdout);
				if (stdout) send ('p', {a:'start', r:'s', s:'o', t:stdout});
				if (stderr) send ('p', {a:'start', r:'s', s:'e', t:stderr});
				if (err) send ('p', {a:'start', r:'e', e:err});
				if (!err) async.series ([
						function (done) { fs.writeFile (dir+'/main.'+ext, p.p, done); },
						function (done) { if (p.f) fs.writeFile (dir+board[boardtype].firmware, p.f, done); else setTimeout (done); },
						function (done) { fs.writeFile (dir+'/Makefile.'+boardtype, p.m, done); }
					],
					function (err, results)
					{
						if (err)
						{
							debug ('Error writing files '+dir+' error '+err);
						}
						else
						{
							var makerun = SETTINGS.run.split(' ');
							project = pty.spawn(makerun[0], makerun.slice (1), {
							  name: 'xterm-color',
							  cols: p.c,
							  rows: p.r,
							  cwd: dir,
							  env: _.assign (process.env, env, {wyliodrin_project:"app-project"})
							});
	
							projectpid = project.pid;
	
							fs.writeFileSync (PROJECT_PID_TEMP, projectpid);
	
							if (project) send ('p', {a:'start', r:'d'});
							else send ('p', {a:'start', r:'e'});
	
							status ();
	
							project.on('data', function(data) {
								if (runAnotherProject === null)
								{
							  		sendLowPriority ('p', {a:'k', t:data});
							  	}
							});
							project.resize (p.c, p.r);
							}
	
							project.on ('exit', function (error)
							{
								fs.unlink (PROJECT_PID_TEMP);
								project = null;
								projectpid = 0;
								// console.log (runAnotherProject);
								if (runAnotherProject !== null) 
								{
									runProject (runAnotherProject);
								}
								else 
								{
									send ('p', {a:'k', t:'Project exit with error '+error+'\n'});
									send ('p', {a:'stop'});
									status ();
								}
							})
					});
				// fs.writeFile (dir+'/main.'+ext, p.p, function (err)
				// {
				// 	if (err)
				// 	{
				// 		debug ('Error writing file '+dir+'/app_project/main.'+ext);
				// 	}
				// 	else
				// 	{
				// 		project = pty.spawn('sudo', ['-E', 'node', 'main.js'], {
				// 		  name: 'xterm-color',
				// 		  cols: p.c,
				// 		  rows: p.r,
				// 		  cwd: dir+'/app_project',
				// 		  env: process.env
				// 		});
	
				// 		project.on('data', function(data) {
				// 		  	send ('r', {a:'k', t:data});
				// 		});
				// 		project.resize (p.c, p.r);
				// 	}
				// });
			});
		}
	}
}

function resizeProject (cols, rows)
{
	if (project) project.resize (cols, rows);
}

function keysProject (keys)
{
	if (project) project.write (keys);
}

function wifi_connect (p)
{
	var sudo = SETTINGS.run.split(' ');
	var run = 'node';
	var params = ['network.js', board[boardtype].nettype, 'connect', p.i, p.s, p.p];
	fs.writeFileSync ('/wyliodrin/wifi.json', JSON.stringify (p));
	if (sudo[0]==='sudo')
	{
		params.splice (0, 0, run);
		run = 'sudo';
	}
	child_process.execFile (run, params, function (error, stdout, stderr)
	{
		send ('net', {a:'s', i:p.i, e:error});
	});
}

try
{
	var p = JSON.parse(fs.readFileSync ('/wyliodrin/wifi.json'));
	wifi_connect (p);
}
catch (e)
{
	
}

packets.on ('message', function (t, p)
{
	debug ('Receive message with tag '+t);
	// Shell
	if (t === 's')
	{
		// open
		if (p.a === 'o')
		{
			if (!shell)
			{
				openShell (p);
			}
		}
		else
		if (p.a === 'r')
		{
			resizeShell (p.c, p.r);
		}
		else
		if (p.a === 'k')
		{
			if (shell) keysShell (p.t);
			else send ('s', {a:'e', e:'noshell'});
		}
	}
	else
	// Task Manager
	if (t === 'tm')
	{
		if (p.a === 'run')
		{
			if (taskManager === null)
			{
				processes (function (listofprocesse)
				{
					send ('tm', listofprocesse);
				});
				var s = 5000;
				if (_.isNumber (p.s)) s = p.s*1000;
				taskManager = setInterval (function ()
				{
					processes (function (listofprocesse)
					{
						send ('tm', listofprocesse);
					});
				}, s);
			}
		}
		else
		if (p.a === 'exit')
		{
			kill (p.PID);
		}
		else
		if (p.a === 'stop')
		{
			if (taskManager !== null)
			{
				clearInterval (taskManager);
				taskManager = null;
			}
		}
	}
	else
	// Update
	if (t === 'u')
	{
		if (p.a === 'i')
		{
			debug ('Update wyliodrin-server');
			var script = './update-server.sh';
			var params = [];
			var sudo = SETTINGS.run.split(' ');
			if (sudo[0]==='sudo')
			{
				params.splice (0, 0, '-E', script);
				manager = 'sudo';
			}
			var runscript = child_process.spawn (manager, params, {env: env});
			runscript.stdout.on ('data', function (data)
			{
				send ('u', {a:'i', out:data.toString()});
			});
			runscript.stderr.on ('data', function (data)
			{
				send ('u', {a:'i', err:data.toString()});
			});
			runscript.on ('close', function (error)
			{
				send ('u', {a:'i', e:error});
			});
		}
	}
	else
	// Name
	if (t === 'n')
	{
		if (p.n && p.n.length > 0)
		{
			boardname = p.n;
			fs.writeFile ('/wyliodrin/boardname', boardname);
			publish ();
			status ();
		}
	}
	// Packages
	if (t === 'pm')
	{
		if (p.a === 'p')
		{
			var done = function (error, packages)
			{
				if (error) send ('pm', {a: 'p', l:p.l, e: error});
				else send ('pm', {a: 'p', l:p.l, p:packages});
			}

			if (p.l === 'nodejs') listPackagesNodejs (done);
			else
			if (p.l === 'python') listPackagesPython (done);
		}
		else
		if (p.a === 'i' || p.a === 'u')
		{
			debug ('Install package '+p.p+' langauge '+p.l);
			var manager = '';
			var params = [];
			if (p.l === 'nodejs')
			{
				manager = 'npm';
				if (p.a === 'i') params = ['-g', 'install'];
				else if (p.a === 'u') params = ['-g', 'uninstall'];
			}
			else if (p.l === 'python')
			{
				manager = 'pip';
				if (p.a === 'i') params = ['install'];
				else if (p.a === 'u') params = ['uninstall', '--yes'];
			}
			if (manager.length > 0)
			{
				params.push (p.p);
				var sudo = SETTINGS.run.split(' ');
				if (sudo[0]==='sudo')
				{
					params.splice (0, 0, manager);
					manager = 'sudo';
				}
				runmanager[p.l][p.p] = child_process.spawn (manager, params);
				runmanager[p.l][p.p].stdout.on ('data', function (data)
				{
					send ('pm', {a:'i', p:p.p, l:p.l, out:data.toString()});
				});
				runmanager[p.l][p.p].stderr.on ('data', function (data)
				{
					send ('pm', {a:'i', p:p.p, l:p.l, err:data.toString()});
				});
				runmanager[p.l][p.p].on ('close', function (error)
				{
					send ('pm', {a:'i', p:p.p, l:p.l, e:error});
					delete runmanager[p.l][p.p];
				});
			}
		}
		else
		if (p.a === 's')
		{
			if (runmanager[p.l] && runmanager[p.l][p.p])
			{
				// debug ('runmanager '+runmanager[p.l][p.p].pid);
				if (p.l === 'nodejs') child_process.exec ('sudo killall npm');
				else if (p.l === 'python') child_process.exec ('sudo killall pip');

			}
		}
	}
	else
	// Network
	if (t === 'net')
	{
		var networks = function (done)
		{
			var l = [];
			ifconfig.status (function (err, status)
			{
				if (err)
				{
					done (err);
				}
				else
				{
					var sendinterfaces = function ()
					{
						done (null, l);
					};
					_.each (status, function (sinterface)
					{
						if (sinterface.link === 'ethernet')
						{
							l.push ({
								ip:sinterface.ipv4_address, 
								m:sinterface.ipv4_subnet_mask, 
								b:sinterface.ipv4_broadcast,
								t:'e', 
								h:sinterface.address,
								i:sinterface.interface,
								up:sinterface.up
							});
						}
					});
					if (board[boardtype].nettype === 'iwconfig')
					{
						debug ('iwconfig');
						iwconfig.status (function (err, status)
						{
							if (err)
							{
								
							}
							else
							{
								_.each (l, function (sl)
								{
									_.each (status, function (sinterface)
									{
										if (sl.i === sinterface.interface)
										{
											sl.t = 'w';
											sl.s = sinterface.ssid;
											sl.q = sinterface.quality;
										}
									});
								});
							}
							sendinterfaces ();
						});
					}
					else
					if (board[boardtype].nettype === 'nm')
					{
						debug ('nm');
						nm.status (function (error, devices)
						{
							if (error)
							{

							}
							else
							{
								_.each (l, function (sl)
								{
									_.each (devices, function (dinterface)
									{
										if (sl.i === dinterface.interface)
										{
											sl.t = 'w';
											sl.s = dinterface.ssid;
											sl.q = dinterface.quality;
										}
									});
								});
							}
							sendinterfaces();
						});
					}
					else
					{
						sendinterfaces();
					}
				}
			});
		};
		if (p.a === 's')
		{
			var networks = [];
			var sudo = SETTINGS.run.split(' ');
			var run = 'node';
			var params = ['network.js', board[boardtype].nettype, 's', p.i];
			if (sudo[0]==='sudo')
			{
				params.splice (0, 0, run);
				run = 'sudo';
			}
			child_process.execFile (run, params, function (error, stdout, stderr)
			{
				if (error)
				{
					send ('net', {a:'s', i:p.i, e:error});
				}
				else
				{
					try
					{
						// console.log ();
						// console.log (stdout);
						// console.log ();
						var l = JSON.parse (stdout.toString());
						_.each (l, function (lnetwork)
						{
							networks.push ({
								s: lnetwork.ssid,
								p: lnetwork.security,
								rss: lnetwork.signal,
								q: lnetwork.quality
							});
						});
						send ('net', {a:'s', i:p.i, n:networks})
						// console.log (networks);
					}
					catch (e)
					{
						// console.log (e)
						send ('net', {a:'s', i:p.i, e:45});
					}
				}
			});
		}
		else if (p.a === 'd')
		{
			var networks = [];
			var sudo = SETTINGS.run.split(' ');
			var run = 'node';
			var params = ['network.js', board[boardtype].nettype, 'disconnect', p.i];
			if (sudo[0]==='sudo')
			{
				params.splice (0, 0, run);
				run = 'sudo';
			}
			try
			{
				fs.unlinkSync ('/wyliodrin/wifi.json');
			}
			catch (e)
			{
				
			}
			child_process.execFile (run, params, function (error, stdout, stderr)
			{
				send ('net', {a:'s', i:p.i, e:error});
			});
		}
		else if (p.a === 'c')
		{
			var networks = [];
			wifi_connect (p);
		}
		else
		if (p.a === 'run')
		{
			var s = 5000;
			if (_.isNumber (p.s)) s = p.s*1000;
			if (networkManager === null)
			{
				networks (function (err, l)
				{
					if (err)
					{
						send ('net', {a:'l', e:err});
					}
					else
					{
						send ('net', {a:'l', n:l});
					}
				});
				networkManager = setInterval (function ()
				{
					networks (function (err, l)
					{
						if (err)
						{
							send ('net', {a:'l', e:err});
						}
						else
						{
							send ('net', {a:'l', n:l});
						}
					});
				}, s);
			}
		}
		else
		if (p.a === 'stop')
		{
			if (networkManager !== null)
			{
				clearInterval (networkManager);
				networkManager = null;
			}
		}
	}
	// I
	if (t === 'i')
	{
		status ();
		sendVersion ();
	}
	else
	// Run
	if (t === 'p')
	{
		if (p.a === 'start')
		{
			runProject (p);
		}
		else if (p.a === 'stop')
		{
			stopProject ();
		}
		else if (p.a === 'k')
		{
			keysProject (p.t);
		}
	}
	else
	// Signal
	if (t === 'v')
	{
		if (client)
		{
			client.publish ('communication_client:signal:'+p.s, JSON.stringify ({from: 'wyliodrin_app', data:''+p.v}));
		}
	}
	// Ping
	if (t === 'ping')
	{
		send ('pong', null);
	}
});

function escape (data)
{
	var l = 0;
	for (var i=0; i<data.length; i++)
	{
		if (data[i]===PACKET_SEPARATOR) l = l+2;
		else l = l+1;
	}
	if (l===data.length) return data;
	else
	{
		var dataserial = new Buffer (l);
		var li=0;
		for (var i=0; i<data.length; i++)
		{
			if (data[i] === PACKET_SEPARATOR)
			{
				dataserial[li]=data[i];
				li++;
				dataserial[li]=PACKET_ESCAPE;
				li++;
			}
			else
			{
				dataserial[li] = data[i];
				li++;
			}
		}
		return dataserial;
	}
}

function reset (type)
{
	receivedFirstPacketSeparator = false;
	receivedDataPosition = 0;
	previousByte = 0;
	login = false;
	if (type === SERIAL)
	{
		_send = _serialSend;
	}
	else
	{
		_send = _socketSend;
	}
}

function receivedDataPacket (data)
{
	if (!receivedFirstPacketSeparator)
	{
		if (data === PACKET_SEPARATOR && previousByte === PACKET_SEPARATOR)
		{
			receivedFirstPacketSeparator = true;
			previousByte = 0;
		}
		else
		{
			debug ('Received random bytes');
			previousByte = data;
		}
	}
	else
	{
		// console.log (data);
		if (data === PACKET_SEPARATOR)
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				var m = packet ();
				console.log (m);
				if (!socket || login)
				{
					packets.emit ('message', m.t, m.d);
				}
				else
				{
					if (m.t === 'login')
					{
						var username = m.d.username;
						var password = m.d.password;
						if (!username) username = '';
						if (!password) password = '';
						if (pam)
						{
							pam.authenticate (username, password, function (error)
							{
								if (!error) 
								{
									debug ('Login');
									login = true;
									send ('', null);
									status ();
									// sendVersion ();
								}
								else 
								{
									debug ('Login error');
									socket.end ();
									login = false;
								}
							});
						}
						else
						{
							login = true;
							send ('', null);
							status ();
						}
					}
				}
				previousByte = 0;
			}
			else
			{
				previousByte = data;
			}
		}
		else
		if (data === PACKET_ESCAPE)
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				addToBuffer (previousByte);
				previousByte = 0;
			}
			else
			{
				addToBuffer (data);
				previousByte = data;
			}
		}
		else
		{
			if (previousByte === PACKET_SEPARATOR)
			{
				debug ('Random bytes for port '+this.port+' using connectionId '+this.connection.connectionId);
			}
			addToBuffer(data);
			previousByte = data;
		}
	}
	
}

function sendLowPriority (tag, data)
{
	sendLowPriorityQueue.push ({t: tag, d: data});
	_send ();
}

function send (tag, data)
{
	sendQueue.push ({t: tag, d: data});
	_send ();
}

function listPackagesNodejs (done)
{
	debug ('List packages nodejs');
	child_process.exec ('npm -g --depth=0 --json ls', function (error, stdout, stderr)
	{
		if (error)
		{
			debug ('List packages nodejs error '+error);
			done (error);
		}
		else
		{
			try
			{
				var npmpackages = JSON.parse (stdout).dependencies;
				var packages = [];
				_.each (npmpackages, function (packagevalue, name)
				{
					packages.push ({n:name, v:packagevalue.version})
				});
				// console.log (packages);
				done (null, packages);
			}
			catch (e)
			{
				debug ('List packages nodejs error '+e);
				done (e);
			}
		}
	});
}

function listPackagesPython (done)
{
	debug ('List packages nodejs');
	child_process.exec ('pip list', function (error, stdout, stderr)
	{
		if (error)
		{
			debug ('List packages python error '+error);
			done (error);
		}
		else
		{
			try
			{
				var pippackages = stdout.split ('\n');
				var packages = [];
				var regex = /([^\s]+)\s\(([^\)]+)\)/;
				_.each (pippackages, function (packagevalue)
				{
					if (packagevalue.length > 0)
					{
						var value = packagevalue.match(regex);
						if (value.length > 0)
						{
							packages.push ({n:value[1], v:value[2]});
						}
						// console.log (packagevalue.match(regex));
					}
				});
				// console.log (packages);
				done (null, packages);
			}
			catch (e)
			{
				debug ('List packages python error '+e);
				done (e);
			}
		}
	});
} 

function _serialSend ()
{
	if (serial !== null)
	{
		if (serialSending === false)
		{
			var message = null;
			if (sendQueue.length>0)
			{
				message = sendQueue[0];
				sendQueue.splice (0,1);
			}
			else if (sendLowPriorityQueue.length>0)
			{
				message = sendLowPriorityQueue[0];
				sendLowPriorityQueue.splice (0,1);
			}
			if (message)
			{
				debug ('Serial sending tag '+message.t+' data '+JSON.stringify (message.d));
				var m = escape(msgpack.encode (message));
				// console.log (msgpack.decode (new Buffer (m, 'base64')));
				// console.log (m.toString ());
				if (isConnected)
				{
					serialSending = true;
					serial.write (m, function (err, result)
					{
						if (!err)
						{
							debug ('Serial sent '+m.length+' bytes');
						}
						else 
						{
							debug ('Serial send error '+m);
							console.log (err);
						}
					});
					serial.write (BUFFER_PACKET_SEPARATOR, function (err, result)
					{
						serialSending = false;
						_serialSend ();
						// console.log (err);
					});
				}
				else
				{
					debug ('Serial ignore packet');
					process.nextTick (function ()
					{
						_socketSend ();
					});
				}
			}
		}
		else
		{
			debug ('Serial already sending');
		}
	}
	else
	{
		debug ('Serial uninitialised');
	}
}

function _socketSend ()
{
	if (socketSending === false)
	{
		var message = null;
		if (sendQueue.length>0)
		{
			message = sendQueue[0];
			sendQueue.splice (0,1);
		}
		else if (sendLowPriorityQueue.length>0)
		{
			message = sendLowPriorityQueue[0];
			sendLowPriorityQueue.splice (0,1);
		}
		if (message)
		{
			debug ('Socket sending tag '+message.t+' data '+JSON.stringify (message.d));
			var m = escape(msgpack.encode (message));
			// console.log (msgpack.decode (new Buffer (m, 'base64')));
			// console.log (m.toString ());
			if (login)
			{
				socketSending = true;
				socket.write (m, function (err)
				{
					if (!err)
					{
						debug ('Socket sent '+m.length+' bytes');
					}
					else 
					{
						debug ('Socket send error '+m);
						console.log (err);
					}
				});
				socket.write (BUFFER_PACKET_SEPARATOR, function (err, result)
				{
					socketSending = false;
					_socketSend ();
					// console.log (err);
				});
			}
			else
			{
				debug ('Socket ignore packet')
				process.nextTick (function ()
				{
					_socketSend ();
				});
			}
		}
	}
	else
	{
		debug ('Socket already sending');
	}
}

function sendValues (projectId)
{
	if (!sendingValues)
	{
		sendingValues = true;
		debug ('Signal');
		client.lrange (projectId, 0, 100, function (err, signals)
		{
			if (err)
			{
				debug ('Signals error '+err);
			}
			else if (signals.length > 0)
			{
				storedValues = false;
				_.each (signals, function (signal)
				{
					var s = JSON.parse (signal);
					sendLowPriority ('v', {t:s.timestamp, s:s.signals});
				});
				client.ltrim (projectId, signals.length, -1, function (err)
				{
					if (err)
					{
						debug ('Signals error '+err);
					}
					sendingValues = false;
					if (storedValues) sendValues (projectId);
				});
			}
			else
			{
				sendingValues = 0;
			}
		});
	}
	else
	{
		debug ('Already sending signals');
		storedValues = true;
	}
}

// setInterval (function ()
// {
// 	send ('i', {c:boardtype.toString()});
// }, 1000);

