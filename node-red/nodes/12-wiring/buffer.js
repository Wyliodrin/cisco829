/**
 * Copyright 2013, 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

//Simple node to introduce a pause into a flow

module.exports = function(RED) {
    "use strict";

    function BufferNode(n) {
        RED.nodes.createNode(this,n);

        this.sendaction = n.send;
        this.sendarray = n.sendarray;
        this.size = parseInt(n.size);
        this.shift = n.shift;
        this.window = n.window;
        this.size_of_window = parseInt(n.size_of_window);
        this.mix_messages = n.mix_messages;

        this.data = null;
        this.pos = 0;

        if (this.size_of_window < 1) this.size_of_window = 1;

        var _ = require ('underscore');
        var util = require ('util');
        
        var that = this;

        var sendData = function ()
        {
            if (that.data)
            {
                delete that.data._msgid;
                that.send (_.clone(that.data));
                if (!that.window || !_.isArray(that.data.payload)) 
                {
                    that.data = null;
                    that.pos = 0;
                }
                else 
                {
                    // console.log ('window');
                    that.data.payload.splice (0, that.size_of_window);
                    that.pos = that.data.payload.length;
                }
            }
            else
            {
                that.info ('')
            }
        };

        var addToArray = function (msg)
        {
            // console.log (that.pos + " / "+ that.size);
            if (!that.data) that.data = {};
            for (var id in msg)
            {
                if (id != "topic" || msg["topic"].length > 0)
                {
                    if (!that.data[id]) that.data[id] = Array (that.size);
                    that.data[id][that.pos] = msg[id];
                }
            }
            that.pos = that.pos + 1;
        };

        this.on("input", function(msg) {
            if ((that.sendarray =="value" || that.sendaction == "event") && msg.event)
            {
                if (that.data)
                {
                    that.send (_.extend (msg, that.data));
                    that.data = null;
                    that.pos = 0;
                }
                else
                {
                    that.warn ("data is null");
                }
            }
            else
            if (!msg.event)
            {
                if (that.sendarray == "value")
                {
                    if (that.mix_messages)
                    {
                        if (!that.data) that.data = msg;
                        else
                        for (var id in msg)
                        {
                            if (!that.data[id] || that.shift == "shift") that.data[id] = msg[id];
                        }
                    }
                    else
                    {
                        if (!that.data || that.shift == "shift") that.data = msg;    
                    }
                }
                else
                {
                    if (that.pos == that.size && that.shift == "shift")
                    {
                        for (var id in that.data)
                        {
                            that.data[id].shift ();
                        }
                        that.pos = that.pos - 1;
                    }
                    if (that.pos < that.size)
                    {
                        // f (!that.data) that.data = {};
                        addToArray (msg);
                    }
                }
                if (that.pos == that.size && that.sendaction == "full") sendData ();
                // console.log (util.inspect (that.data));
            }
        });

        this.on("close", function() {
            
        });
    }
    RED.nodes.registerType("buffer",BufferNode);

    function SetEventNode(n) {
        RED.nodes.createNode(this,n);

        var that = this;

        this.on("input", function(msg) {
            if (!msg.event) msg.event = "event";
            that.send (msg);
        });

    }
    RED.nodes.registerType("set event",SetEventNode);
}
