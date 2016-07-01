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

    var dualShock = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                dualShock = require('dualshock-controller');
            }
        }
    }

    function PSNode(n) {
        load ();
        RED.nodes.createNode(this,n);

        this.data = null;
        this.pos = 0;
        this.config = n.config;
        this.accelerometerSmoothing = n.accelerometerSmoothing;
        this.analogStickSmoothing = n.analogStickSmoothing;
        
        var that = this;

        var controller = dualShock (
        {
            config: that.config,
            accelerometerSmoothing: that.accelerometerSmoothing,
            analogStickSmoothing: that.analogStickSmoothing
        });

        var controllerConfiguration = require ('dualshock-controller/controllerConfigurations/'+that.config);

        controller.connect ();

        //make sure you add an error event handler
        controller.on('error', function(data) {
          that.error (data);
        });

        //add event handlers:
        controller.on('left:move', function(data) {
          that.send ({payload: data, topic: 'left:joystick'});
        });
        controller.on('right:move', function(data) {
          that.send ({payload: data, topic: 'right:joystick'});
        });
        controller.on('connected', function(data) {
          that.log (data);
        });
        for (var i = 0; i < controllerConfiguration.buttons.length; i++) {
            controller.on(controllerConfiguration.buttons[i].name + ":press", function (data) 
                {
                    that.send ({payload: data, topic: 'press'});
                });
            controller.on(controllerConfiguration.buttons[i].name + ":release", function (data) 
                {
                    that.send ({payload: data, topic: 'release'});
                });
            controller.on(controllerConfiguration.buttons[i].name + ":analog", function (data)
                {
                    that.send ({payload: data, topic: 'analog'});
                });
            controller.on(controllerConfiguration.buttons[i].name + ":hold", function (data)
                {
                    that.send ({payload: data, topic: 'hold'});
                });
        }

        this.on("close", function() {
            controller.disconnect ();    
        });
    }
    RED.nodes.registerType("playstation",PSNode);
}
