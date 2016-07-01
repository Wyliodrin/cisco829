/**
 * Copyright 2013 IBM Corp.
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

module.exports = function(RED) {
    "use strict";
    var util = null;
    var vm = null;
    var events = require ('events');
    var _ = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            RED.valueChanged = new events.EventEmitter();
            _ = require ("underscore");
            // console.log (RED.valueChanged);
        }
    }

    function SetValueNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.value = n.value;
        this.global = RED.settings.functionGlobalContext || {};

        var node = this;
        
        node.global[node.value] = node.initial;

        try {
            this.on("input", function(msg) {
                msg.x = node.global[node.value];
                node.send (msg);
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("set x value",SetValueNode);

    function CallbackNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.value = n.value;
        this.messages = {};
        this.callbacks = {};

        var node = this;
        var that = this;

        try {
            this.on("input", function(msg) {
                function send (msg, _callback)
                {
                    that.messages[_callback] = _.clone (msg);
                    msg._callback = _callback;
                    console.log ('stored message '+msg._callback);
                    that.send ([msg, null]);
                }
                if (msg._callback && !that.messages[msg._callback])
                {
                    var _callback = _.uniqueId (msg._msgid);
                    that.callbacks[_callback] = msg._callback;
                    delete msg._callback;
                    send (msg, _callback);
                }
                else if (msg._callback && that.messages[msg._callback])
                {
                    // console.log ('message found '+msg._callback);
                    var _callback = msg._callback;
                    msg = _.extendOwn (that.messages[msg._callback], msg);
                    delete msg._callback;
                    // console.log ('message retrieved '+msg._callback);
                    if (that.callbacks[_callback])
                    {
                        // console.log ('callback found '+msg._callback);
                        msg._callback = that.callbacks[_callback];
                        // console.log ('callback '+msg._callback);
                        delete that.callbacks[_callback];
                    }
                    delete that.messages[_callback];
                    that.send ([null, msg]);
                }
                else
                {
                    var _callback = _.uniqueId (msg._msgid);
                    send (msg, _callback);
                }
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("message callback",CallbackNode);

    function ValueNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.value = n.value;
        this.initial = n.initial;
        this.publish = n.publish;
        this.global = RED.settings.functionGlobalContext || {};

        var node = this;
        
        node.global[node.value] = node.initial;
        if (!RED.settings.socketValues)
        {
          RED.settings.socketValues = {};  
        }

        if (node.publish) RED.settings.socketValues[node.value] = "publish"; 

        try {
            this.on("input", function(msg) {
                node.global[node.value] = msg.payload;
                // console.log (RED.valueChanged);
                if (RED.valueChanged && node.publish == true) RED.valueChanged.emit ('value', node.value);
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("value",ValueNode);
}
