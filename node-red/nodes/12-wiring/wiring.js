
"use strict";

module.exports = function(RED) {
	var wyliodrin = null;
    var http = null;
    var https = null;
    var url = null;
    var redis = null;
    var publish = null;
    var _ = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
        	if (RED.device)
        	{
                if (process.env.wyliodrin_board == "raspberrypi")
                {
                    process.env.GROVE_PI = 300;   
                }
        		wyliodrin = require ('wyliodrin');   
                http = require ('http');
                https = require ('https');
                url = require ('url');
                redis = require ('redis');
                _ = require ('underscore');
        	}
        }
    }

    if (!RED.wyliodrin) RED.wyliodrin = {};

    if (!RED.wyliodrin.pinModes) RED.wyliodrin.pinModes = [];

    function digitalWrite(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            var pin = config.pin;
            if (config.pin.length == 0) pin = msg.topic;
            if (RED.wyliodrin.pinModes[pin] !== wyliodrin.OUTPUT)
            {
                wyliodrin.pinMode (parseInt(pin), wyliodrin.OUTPUT);    
            }
        	wyliodrin.digitalWrite (parseInt(pin), parseInt (msg.payload));
            node.send(null);
        });
    }
    RED.nodes.registerType("digitalwrite",digitalWrite);

    function digitalRead(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }
        this.on('input', function(msg) {
            var pin = config.pin;
            if (config.pin.length == 0) pin = msg.topic;
            if (RED.wyliodrin.pinModes[pin] !== wyliodrin.INPUT)
            {
                wyliodrin.pinMode (parseInt(pin), wyliodrin.INPUT);    
            }
            if (msg.topic === undefined) msg.topic = pin;
            msg.payload = wyliodrin.digitalRead (parseInt(pin));
            node.send(msg);
        });
    }
    RED.nodes.registerType("digitalread",digitalRead);

    function shiftOut(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            var pin = config.pin;
            var clock = config.clock;
            var msblsb = config.msblsb;
            var register = config.register;
            var register_pin = config.register_pin;
            if (config.pin.length == 0) pin = msg.topic;
            if (config.clock.length == 0) clock = msg.clock;
            if (RED.wyliodrin.pinModes[pin] !== wyliodrin.OUTPUT)
            {
                wyliodrin.pinMode (parseInt(pin), wyliodrin.OUTPUT);    
            }
            if (RED.wyliodrin.pinModes[clock] !== wyliodrin.OUTPUT)
            {
                wyliodrin.pinMode (parseInt(clock), wyliodrin.OUTPUT);    
            }
            wyliodrin.shiftOut (parseInt(pin), parseInt(clock), parseInt(msblsb), parseInt (msg.payload));
            if (config.register !== "none")
            {
                if (config.register === "rising_edge")
                {
                    wyliodrin.digitalWrite (parseInt(config.register_pin), wyliodrin.LOW);
                    wyliodrin.digitalWrite (parseInt(config.register_pin), wyliodrin.HIGH);
                }
                else
                if (config.register === "falling_edge")
                {
                    wyliodrin.digitalWrite (parseInt(config.register_pin), wyliodrin.HIGH);
                    wyliodrin.digitalWrite (parseInt(config.register_pin), wyliodrin.LOW);
                }
            }
            node.send(null);
        });
    }
    RED.nodes.registerType("shift out",shiftOut);

    function shiftIn(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }
        this.on('input', function(msg) {
            var pin = config.pin;
            var clock = config.clock;
            var msblsb = config.msblsb;
            if (config.pin.length == 0) pin = msg.topic;
            if (config.clock.length == 0) clock = msg.clock;
            if (RED.wyliodrin.pinModes[pin] !== wyliodrin.INPUT)
            {
                wyliodrin.pinMode (parseInt(pin), wyliodrin.INPUT);    
            }
            if (RED.wyliodrin.pinModes[clock] !== wyliodrin.OUTPUT)
            {
                wyliodrin.pinMode (parseInt(clock), wyliodrin.OUTPUT);    
            }
            if (msg.topic === undefined) msg.topic = pin;
            msg.clock = clock;
            msg.payload = wyliodrin.shiftIn (parseInt(pin), parseInt(clock), parseInt(msblsb));
            node.send(msg);
        });
    }
    RED.nodes.registerType("shift in",shiftIn);

    function analogWrite(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            // if (RED.wyliodrin.pinModes[config.pin] !== wyliodrin.OUTPUT)
            // {
            //     wyliodrin.pinMode (parseInt(config.pin), wyliodrin.OUTPUT);    
            // }
            var pin = config.pin;
            if (config.pin.length == 0) pin = msg.topic;
            wyliodrin.analogWrite (parseInt(pin), parseInt (msg.payload));
            node.send(null);
        });
    }
    RED.nodes.registerType("analogwrite",analogWrite);

    function analogRead(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }
        this.on('input', function(msg) {
            var pin = config.pin;
            if (config.pin.length == 0) pin = msg.topic;
            var v = 0;
            if (isNaN(parseInt(config.average))) config.average = 1;

            var elements = parseInt (config.readarray);
            if (isNaN(elements)) elements = 1;

            var array = new Array (elements);
            for (var element=0; element < elements; element++)
            {
                v = 0;
                for (var i = 0 ; i<config.average; i++)
                {
                    v = v + wyliodrin.analogRead (parseInt(pin));
                }
                v = parseInt (parseFloat (v)/config.average);
                array[element] = v;
            }

            if (elements == 1) v = array[0];
            else v = array;
            if (msg.topic === undefined) msg.topic = 'A'+pin;
            msg.payload = v;
            node.send(msg);
        });
    }
    RED.nodes.registerType("analogread",analogRead);

    // function receiveSignal(config) {
    //     load ();
    //     RED.nodes.createNode(this,config);
    //     var node = this;

    //     this.on ('input', function (msg)
    //     {
    //         if (config.address && config.dashboarduuid && config.button)
    //         {
    //             var address = url.parse (config.address);
    //             var string = JSON.stringify ({
    //                 name: config.button,
    //                 dashboarduuid: config.dashboarduuid,
    //             });

    //             var r = http;
    //             if (address.protocol == 'https') r = https;
    //             var headers = {
    //               'Content-Type': 'application/json',
    //               'Content-Length': string.length,
    //               'Connection':'close'
    //             };

    //             var options = {
    //               host: address.hostname,
    //               port: address.port,
    //               path: '/signal/get_button',
    //               method: 'POST',
    //               headers: headers
    //             };
                
    //             var that = this; 

    //             // Setup the request.  The options parameter is
    //             // the object we defined above.
    //             var req = http.request(options, function(res) {
    //               res.setEncoding('utf-8');

    //               var responseString = '';

    //               res.on('data', function(data) {
    //                 responseString += data;
    //               });

    //               res.on('end', function() {
    //                 console.log (responseString);
    //                 try
    //                 {
    //                     var resultObject = JSON.parse(responseString);
    //                     if (resultObject.value != undefined) that.send ({topic: config.button, payload:resultObject.value});
    //                 }
    //                 catch (e)
    //                 {
    //                     console.log (e);
    //                 }
    //               });
    //             });

    //             req.on('error', function(e) {
    //               // TODO: handle error.
    //               // console.log (e);
    //             });

    //             req.write(string);
    //             req.end();
    //         }
    //     });

    // }
    // RED.nodes.registerType("button",receiveSignal);
    
    function sendSignal(config) {
        load ();
        RED.nodes.createNode(this,config);
        var node = this;
        this.on('input', function(msg) {
            if (config.to === "dashboard")
            {
            	if (_.isArray (msg.payload))
            	{
            		for (var i = 0; i<msg.payload.length; i++)
            		{
            			wyliodrin.sendSignalXY (config.signal, i, msg.payload[i]);
            		}
            	}
            	else
            	{
	                if (msg.flag)
	                {
	                   wyliodrin.sendSignalAndFlag (msg.flag, config.signal, parseFloat (msg.payload)); 
	                }
	                else if (msg.x)
	                {
	                   wyliodrin.sendSignalXY (config.signal, parseFloat(msg.x), parseFloat (msg.payload));
	                }
	                else
	                {
	            	   wyliodrin.sendSignal (config.signal, parseFloat (msg.payload));
	                }
            	}
            }
            else
            if (config.to === "device")
            {
                if (!publish)
                {
                    publish = redis.createClient ();
                }
                if (!config.deviceid || config.deviceid.trim().length == 0) config.deviceid = msg.deviceid;
                var ids = config.deviceid.split (',');
                var label = 'signal:'+config.signal;
                for (var deviceid in ids)
                {
                    // console.log ('sending: '+JSON.stringify ({id: ids[deviceid].trim(), data:JSON.stringify(parseFloat(msg.payload))}));
                    publish.publish ('communication_server:'+label, JSON.stringify ({id: ids[deviceid].trim(), data:JSON.stringify(parseFloat(msg.payload))}));
                }
            }
            // if (config.address && config.dashboarduuid)
            // {
            //     var address = url.parse (config.address);
            //     var string = JSON.stringify ({
            //         name: config.signal,
            //         timestamp:(new Date()).getTime() / 1000,
            //         value: parseFloat (msg.payload),
            //         dashboarduuid: config.dashboarduuid,
            //     });
            //     var r = http;
            //     if (address.protocol == 'https') r = https;
            //     var headers = {
            //       'Content-Type': 'application/json',
            //       'Content-Length': string.length,
            //       'Connection':'close'
            //     };

            //     var options = {
            //       host: address.hostname,
            //       port: address.port,
            //       path: '/signal/add_signal_value',
            //       method: 'POST',
            //       headers: headers
            //     };

            //     // Setup the request.  The options parameter is
            //     // the object we defined above.
            //     var req = http.request(options, function(res) {
            //       res.setEncoding('utf-8');

            //       var responseString = '';

            //       res.on('data', function(data) {
            //         responseString += data;
            //       });

            //       res.on('end', function() {
            //         // var resultObject = JSON.parse(responseString);
            //       });
            //     });

            //     req.on('error', function(e) {
            //       // TODO: handle error.
            //       // console.log (e);
            //     });

            //     req.write(string);
            //     req.end();
            // }



            node.send(null);
        });
    }
    RED.nodes.registerType("sendsignal",sendSignal);
}

