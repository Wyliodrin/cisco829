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

    var ndarray = null;
    var ndarray_fft = null;
    var window_functions = null;
    var _ = require ("underscore");
    var ps = null;
    var fs = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                ndarray = require ("ndarray");
                ndarray_fft = require ("ndarray-fft");
                window_functions = require ("scijs-window-functions");
                ps = require ("child_process");
                fs = require ('fs');
            }
        }
    }

    function OctaveNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.func = n.func;
        this.timeout = n.timeout;
        // var functionText = "addpath ('~/jsonlab')\nmsg = loadjson ("+dat+")\n"+this.func+"\n"+"savejson (msg, \"dat\")\n");
        this.topic = n.topic;

        var id_e = -1;
        
        try {
            var that = this;
            this.on("input", function(msg) {
                id_e++;
                try {
                    var val = JSON.stringify (msg);
                    var dat = "/tmp/dat"+that.id+"."+id_e+".tmp";
                    var functionText = "addpath ('~/jsonlab')\nmsg = loadjson ('"+val+"');\n"+this.func+"\n"+"savejson ('dat', msg, \""+dat+"\");\n";
                    var matlab = ps.spawn ("octave", ["--eval", functionText, "-q"]);
                    // console.log (functionText);
                    matlab.stdout.on ('data', function (stdout)
                    {
                        if (n.stdout == true)
                        {
                            console.log (stdout.toString());
                        }
                    });
                    matlab.stderr.on ('data', function (stderr)
                    {
                        if (n.stderr == true)
                        {
                            console.log (stderr.toString());
                        }
                    });
                    matlab.on ('close', function (code)
                    {
                        if (code !== 0)
                        {
                            // console.log ('dat exit '+code);
                        }
                        else
                        {
                            fs.readFile (dat, function (err, data)
                            {
                                if (err)
                                {
                                    that.error (err);
                                }
                                else
                                {
                                    // console.log (data.toString());
                                    try
                                    {
                                        that.send (JSON.parse (data.toString()).dat);
                                    }
                                    catch (e)
                                    {
                                        that.error ("dat file error "+e);
                                    }
                                }
                                setTimeout (function ()
                                {
                                    fs.unlink (dat);
                                }, 450);
                            });
                        }
                        // fs.writeFile (dat, null);
                        

                    });
                    

                    
                } catch(err) {
                    this.error(err.toString());
                }
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("octave",OctaveNode);

    function PythonNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.func = n.func;
        this.timeout = n.timeout;
        // var functionText = "addpath ('~/jsonlab')\nmsg = loadjson ("+dat+")\n"+this.func+"\n"+"savejson (msg, \"dat\")\n");
        this.topic = n.topic;
        
        this.python = null;

        var id_e = -1;
        
        try {
            var that = this;
            this.on("input", function(msg) {
                if (msg.signal)
                {
                    if (that.python)
                    {
                        that.python.kill (msg.signal);
                    }
                }
                else
                {
                    id_e++;
                    try {
                        var val = JSON.stringify (msg);
                        var dat = "/tmp/dat"+that.id+"."+id_e+".tmp";
                        var functionText = "import sys\nimport json\nmsg = json.loads ('"+val+"');\n"+this.func+"\n"+"with open (\""+dat+"\", 'w') as outputfile:\n\  json.dump (msg, outputfile)\n";
                        that.python = ps.spawn ("python", ["-c", functionText]);
                        // console.log (functionText);
                        that.python.stdout.on ('data', function (stdout)
                        {
                            if (n.stdout == true)
                            {
                                console.log (stdout.toString());
                            }
                        });
                        that.python.stderr.on ('data', function (stderr)
                        {
                            if (n.stderr == true)
                            {
                                console.log (stderr.toString());
                            }
                        });
                        that.python.on ('close', function (code)
                        {
                            if (code !== 0)
                            {
                                // console.log ('dat exit '+code);
                            }
                            else
                            {
                                fs.readFile (dat, function (err, data)
                                {
                                    if (err)
                                    {
                                        that.error (err);
                                    }
                                    else
                                    {
                                        // console.log (data.toString());
                                        try
                                        {
                                            that.send (JSON.parse (data.toString()));
                                        }
                                        catch (e)
                                        {
                                            that.error ("dat file error "+e);
                                        }
                                    }
                                    setTimeout (function ()
                                    {
                                        fs.unlink (dat);
                                    }, 450);
                                });
                            }
                            // fs.writeFile (dat, null);
                            
    
                        });
                        
    
                        
                    } catch(err) {
                        this.error(err.toString());
                    }
                }
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("python",PythonNode);

    RED.library.register("functions");

    function RLanguageNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.func = n.func;
        this.timeout = n.timeout;
        // var functionText = "addpath ('~/jsonlab')\nmsg = loadjson ("+dat+")\n"+this.func+"\n"+"savejson (msg, \"dat\")\n");
        this.topic = n.topic;

        var id_e = -1;
        
        try {
            var that = this;
            this.on("input", function(msg) {
                id_e++;
                try {
                    var val = JSON.stringify (msg);
                    var dat = "/tmp/dat_r"+that.id+"."+id_e+".tmp";
                    var f = "/tmp/dat_rf"+that.id+"."+id_e+".tmp";
                    var functionText = "library('rjson');\nmsg <- fromJSON (json_str='"+val+"');\n"+this.func+"\n"+"writeLines (toJSON (msg, method=\"C\"), \""+dat+"\");\n";
                    fs.writeFile (f, functionText, function (err)
                    {
                        if (!err)
                        {
                            var rlanguage = ps.spawn ("R", ["-f", f, "--slave", "-q"]);
                            // console.log (functionText);
                            rlanguage.stdout.on ('data', function (stdout)
                            {
                                if (n.stdout == true)
                                {
                                    console.log (stdout.toString());
                                }
                            });
                            rlanguage.stderr.on ('data', function (stderr)
                            {
                                if (n.stderr == true)
                                {
                                    console.log (stderr.toString());
                                }
                            });
                            rlanguage.on ('close', function (code)
                            {
                                fs.unlink (f);
                                if (code !== 0)
                                {
                                    // console.log ('dat exit '+code);
                                }
                                else
                                {
                                    fs.readFile (dat, function (err, data)
                                    {
                                        if (err)
                                        {
                                            that.error (err);
                                        }
                                        else
                                        {
                                            // console.log (data.toString());
                                            try
                                            {
                                                that.send (JSON.parse (data.toString()));
                                            }
                                            catch (e)
                                            {
                                                that.error ("dat file error "+e);
                                            }
                                        }
                                        setTimeout (function ()
                                        {
                                            fs.unlink (dat);
                                        }, 450);
                                    });
                                }
                                // fs.writeFile (dat, null);
                                

                            });
                        }
                        else
                        {
                            this.error (err.toString());
                        }
                    });
                    
                } catch(err) {
                    this.error(err.toString());
                }
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("r language",RLanguageNode);
    // RED.library.register("functions");

    function FFT(n) {
        load ();
        RED.nodes.createNode(this,n);

        this.window_function = n.window_function;
        this.inverse = n.inverse;
        
        var that = this;

        this.on("input", function(msg) {
            if (_.isArray (msg.payload))
            {
                var arrayr = null;
                var arrayi = null;

                if (msg.r && _.isArray (msg.r)) 
                {
                    arrayr = _.clone (r);
                }
                else if (_.isArray(msg.payload[0]))
                {
                    arrayr = _.clone (msg.payload[0]);    
                }
                else
                {
                    arrayr = _.clone (msg.payload);
                }
                if (msg.i && _.isArray (msg.i)) 
                {
                    arrayr = _.clone (i);
                }
                else if (_.isArray(msg.payload[1]))
                {
                    arrayi = _.clone (msg.payload[1]);
                }

                if (!this.inverse)
                {
                    var win_function = window_functions[this.window_function];
                    if (!win_function) win_function = window_functions.rectangular;
                    if (arrayr)
                    {
                        for (var i = 0; i < arrayr.length; i++) 
                        {
                            arrayr[i] = arrayr[i]*win_function (i, arrayr.length);
                        }
                    }
                    if (arrayi)
                    {
                        for (var i = 0; i < arrayi.length; i++) 
                        {
                            arrayi[i] = arrayi[i]*win_function (i, arrayi.length);
                        }
                    }
                }
                else
                {
                    
                }

                if (arrayr && !arrayi)
                {
                    arrayi = new Array (arrayr.length);
                    for (var i=0; i<arrayi.length; i++) arrayi[i] = 0;
                }

                if (_.isArray(arrayr) && _.isArray(arrayi))
                {
                    var array_r = ndarray (arrayr);
                    var array_i = ndarray (arrayi);
                    // console.log (array_r.data);
                    // console.log (array_i.data);
                    ndarray_fft ((!that.inverse?1:-1), array_r, array_i);
                    var arrayv = new Array (arrayr.length);
                    for (var i = 0; i<arrayv.length; i++)
                    {
                        arrayv[i] = Math.sqrt (array_r.data[i]*array_r.data[i]+array_i.data[i]*array_i.data[i]);
                    }
                    this.send ({payload:arrayv , r: array_r.data, i: array_i.data});
                }
                else
                {
                    this.error ('Payload, r and i should be arrays');
                }
            }
            else
            {
                this.error ("Payload should be an array");
            }
        });

        this.on("close", function() {
            
        });
    }
    RED.nodes.registerType("fourier",FFT);
}
