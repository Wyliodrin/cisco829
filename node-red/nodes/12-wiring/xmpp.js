
"use strict";

module.exports = function(RED) {
	var redis = null;
    var subscribe = null;
    var publish = null;
    var _ = null;

    var messages = {};
    var callbacks = {};

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
        	if (RED.device)
        	{
        		redis = require ('redis');
                _ = require ("underscore");
        	}
        }
    }

    function sendMessage(config) {
        load ();
        RED.nodes.createNode(this,config);
        this.name = config.name;
        this.label = config.label;
        this.boardid = config.boardid;
        var that = this;
        this.on('input', function(msg) {
            if (!publish)
            {
                publish = redis.createClient ();
            }
            if (!this.boardid || this.boardid.trim().length == 0) this.boardid = msg.boardid;
            var ids = this.boardid.split (',');
            var label = that.label;
            if (!that.label || that.label.length==0) label = msg.label;
            for (var boardid in ids)
            {
                var m = null;
                if (config.message == true) 
                {
                    m = _.clone (msg);
                    m._msg = true;
                }
                else m = _.clone (msg.payload);
                var str = "";
                try
                {
                    str = JSON.stringify (m);
                }
                catch (e)
                {
                    var cache = false;
                    that.warn ('Eliminating some items due to cycles');
                    var s = {};
                    for (var element in m)
                    {
                        try
                        {
                            if (!_.isFunction (m[element]))
                            {
                                JSON.stringify (m[element]);
                                s[element] = m[element];
                            }
                            else
                            {
                                cache = true;
                            }
                        }
                        catch (e)
                        {
                            cache = true;
                        }
                    }
                    // console.log (s);
                    if (cache)
                    {
                        if (msg._callback)
                        {
                            var _callback = _.uniqueId (msg._msgid);
                            callbacks[_callback] = msg._callback;
                            delete msg._callback;
                            messages[_callback] = _.clone (msg);
                            s._callback = _callback;
                        }
                        else
                        {
                            var _callback = _.uniqueId (msg._msgid);
                            messages[_callback] = _.clone (msg);
                            s._callback = _callback;
                        }
                    }
                    str = JSON.stringify (s);
                }                
                // console.log ('sending: '+JSON.stringify ({id: ids[boardid].trim(), data:JSON.stringify(msg.payload)}));
                publish.publish ('communication_server:'+label, JSON.stringify ({id: ids[boardid].trim(), data:str}));
            }
        });
    }
    RED.nodes.registerType("send",sendMessage);

    function receiveMessage(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.label = config.label;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }

        this.subscribe.psubscribe ('communication_client:'+this.label);
        this.subscribe.on ('pmessage', function (pattern, channel, strmessage)
        {
            var message = JSON.parse (strmessage);
            var msg = {};
            var pmessage = JSON.parse (message.data);
            if (pmessage._msg == true) msg = pmessage;
            else msg.payload = pmessage;
            msg.label = channel.substring ('communication_client'.length+1);
            msg.sender = message.from;
            if (msg._callback && messages[msg._callback])
            {
                var _callback = msg._callback;
                msg = _.extendOwn (messages[msg._callback], msg);
                delete msg._callback;
                delete messages[msg._callback];
                if (callbacks[_callback])
                {
                    msg._callback = callbacks[_callback];
                    delete callbacks[_callback];
                }
            }
            that.send (msg);
        });
    }
    RED.nodes.registerType("receive",receiveMessage);

    function receiveSignal(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.signal = config.signal;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }

        this.subscribe.psubscribe ('communication_client:signal:'+this.signal);
        this.subscribe.on ('pmessage', function (pattern, channel, strmessage)
        {
            var message = JSON.parse (strmessage);
            var msg = 
            {
                signal: channel.substring ('communication_client:signal'.length+1),
                sender: message.from,
                payload: JSON.parse(message.data)
            };
            that.send (msg);
        });
    }
    RED.nodes.registerType("receivesignal",receiveSignal);

    function receiveSensors(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.mobile = config.mobile;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }
        // console.log ('mobile:'+this.mobile);
        this.subscribe.psubscribe ('communication_client:mobile:'+this.mobile);
        this.subscribe.on ('pmessage', function (pattern, channel, strmessage)
        {
            var message = JSON.parse (strmessage);
            var msg = 
            {
                sender: config.mobile,
                payload: JSON.parse(message.data)
            };
            that.send (msg);
        });
    }
    RED.nodes.registerType("mobile sensors",receiveSensors);
}

