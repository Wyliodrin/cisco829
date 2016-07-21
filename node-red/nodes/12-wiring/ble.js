/*
 * Copyright (c) 2014. Knowledge Media Institute - The Open University
 * Modified by: Wyliodrin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * NodeRed node with support for interaction with BLEs
 *
 * @author <a href="mailto:carlos.pedrinaci@open.ac.uk">Carlos Pedrinaci</a> (KMi - The Open University)
 * based on the initial node by Charalampos Doukas http://blog.buildinginternetofthings.com/2013/10/12/using-node-red-to-scan-for-ble-devices/
 */

module.exports = function(RED) {

    var noble = null;
    var os = null;
    var dict = null;
    var _ = require ('underscore');
    var connections = null;

    var BLEFirmata = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                noble = require('noble');
                os = require('os');
                dict = require ('dict');

                console.log('Unblocking BLE');
                function puts(error, stdout, stderr) { console.log(stdout) };
                if (process.env.wyliodrin_board == "edison")
                {
                    var cps = require ('child_process');
                    cps.exec("systemctl stop bluetooth; rfkill unblock bluetooth; hciconfig hci0 up", puts);
                }

                connections = dict ();

                BLEFirmata = require ('ble-firmata');
            }
        }
    }

    function writeValue (type, value)
    {
        var data = null;
        if (type == 'string')
        {
            data = new Buffer (value+"", 'utf8');
            console.log (data);
        }
        else
        if (type == 'uint8')
        {
            data = new Buffer (1);
            data.writeUInt8 (value, 0);
        }
        else
        if (type == 'int8')
        {
            data = new Buffer (1);
            data.writeInt8 (value, 0);
        }
        else
        if (type == 'uint16')
        {
            data = new Buffer (2);
            data.writeUInt16LE (value, 0);
        }
        else
        if (type == 'int16')
        {
            data = new Buffer (2);
            data.writeInt16LE (value, 0);
        }
        else
        if (type == 'uint32')
        {
            data = new Buffer (4);
            data.writeUInt32LE (value, 0);
        }
        else
        if (type == 'int32')
        {
            data = new Buffer (4);
            data.writeInt32LE (value, 0);
        }
        else
        if (type == 'float')
        {
            data = new Buffer (4);
            data.writeFloatLE (value, 0);
        }
        return data;
    }

    function readValue (type, data)
    {
        var value = null;
        if (type == 'string')
        {
            value = data.toString('utf8');
        }
        else
        if (type == 'uint8')
        {
            value = data.readUInt8 (0);
        }
        else
        if (type == 'int8')
        {
            value = data.readInt8 (0);
        }
        else
        if (type == 'uint16')
        {
            value = data.readUInt16LE (0);
        }
        else
        if (type == 'int16')
        {
            value = data.readInt16LE (0);
        }
        else
        if (type == 'uint32')
        {
            value = data.readUInt32LE (0);
        }
        else
        if (type == 'int32')
        {
            value = data.readInt32LE (0);
        }
        else
        if (type == 'float')
        {
            value = data.readFloatLE (0);
        }
        return value;
    }

    function pconnect (peripheral, done)
    {
        // console.log ('connection request '+peripheral.uuid);
        var pdata = connections.get (peripheral.uuid);
        if (pdata)
        {
            if (pdata.connecting)
            {
                // console.log ('connection in progress '+peripheral.uuid);
                pdata.done.push (done);
            }
            else 
            {
                // console.log ('already connected '+peripheral.uuid);
                pdata.load++;
                done (null, pdata);
                // console.log ('connecting should be true '+pdata.peripheral.Uuid);
            }
        }
        else
        {
            connections.set (peripheral.uuid, {peripheral:peripheral, connecting:true, load: 0, done:[done], readwrites:[], readwrite: false, retry: false});
            pdata = connections.get (peripheral.uuid);
            peripheral.connect (function (err)
            {
                // console.log ('connecting '+peripheral.uuid);
                if (err)
                {
                    // console.log ('error connecting '+err+' '+peripheral.uuid)
                    _.each (pdata.done, function (func)
                    {
                        func (err, null);
                    });
                    connections.delete (peripheral.uuid);
                }
                else
                {
                    // console.log ('connected '+peripheral.uuid);
                    pdata.connecting = false;
                    _.each (pdata.done, function (func)
                    {
                        pdata.load++;
                        func (err, pdata);
                    });
                }
            });
        }
        console.log ('connect '+pdata.load+' '+pdata.peripheral.uuid);
    }

    function pdisconnect (peripheral)
    {
        // console.log ('disconnect request '+peripheral.uuid);
        var pdata = connections.get (peripheral.uuid);
        if (pdata)
        {
            pdata.load = pdata.load - 1;
            if (!pdata.connecting && pdata.load == 0)
            {
                // console.log ('disconnect '+peripheral.uuid);
                if (!pdata.retry && pdata.peripheral)
                {
                    console.log ('stop connection')
                    pdata.peripheral.disconnect ();
                }
                connections.delete (peripheral.uuid);
            }
            else
            {
                // console.log ('connection in use '+peripheral.uuid);
            }
            console.log ('disconnect '+pdata.load+' '+pdata.peripheral.uuid);
        }
        else
        {
            // console.log ('disconnecting '+peripheral.uuid);
            console.log ('disconnect')
            peripheral.disconnect ();
        }
    }

    function pread (peripheral, service, characteristic, done)
    {
        console.log ('pread '+peripheral.uuid);
        pconnect (peripheral, function (err, pdata)
        {
            if (err)
            {
                console.log ('read error '+peripheral.uuid);
                done (err, null);
            }
            else
            {
                pdata.readwrites.push (function (pdone)
                {
                    console.log ('read '+pdata.peripheral.uuid);
                    var connect = false;
                    pdata.peripheral.discoverSomeServicesAndCharacteristics(service, characteristic, function (err, services, characteristics)
                        {
                            if (!pdata.retry)
                            {
                                connect = true;
                                if (!err)
                                {
                                    console.log ('reading '+pdata.peripheral.uuid);
                                    characteristics[0].read (function (err, data)
                                    {
                                        if (err)
                                        {
                                            console.log (err);
                                            pdisconnect (pdata.peripheral);
                                            pdone ();
                                            done (err);
                                        }
                                        else
                                        {
                                            done (null, data);
                                            pdisconnect (pdata.peripheral);
                                            pdone ();
                                        }
                                    });
                                }
                                else
                                {
                                    console.log (err);
                                    pdisconnect (pdata.peripheral);
                                    pdone ();
                                    done (err);
                                }
                            }
                        });
                    pdata.peripheral.on ('disconnect', function ()
                    {
                        if (!connect)
                        {
                            console.log ('retry');
                            connect = null;
                            pdata.retry = true;
                            pdisconnect (pdata.peripheral);
                            pdone ();
                            done (new Error ());
                        }
                    });
                });
                if (!pdata.readwrite) pnextreadwrite (pdata);
            }
        });
    }

    function pwrite (peripheral, service, characteristic, data, done)
    {

        console.log ('pwrite '+peripheral.uuid);
        pconnect (peripheral, function (err, pdata)
        {
            if (err)
            {
                console.log ('write error '+peripheral.uuid);
                done (err, null);
            }
            else
            {
                pdata.readwrites.push (function (pdone)
                {
                    console.log ('write '+pdata.peripheral.uuid);
                    var connect = false;
                    pdata.peripheral.discoverSomeServicesAndCharacteristics(service, characteristic, function (err, services, characteristics)
                        {
                            if (!pdata.retry)
                            {
                                connect = true;
                                if (!err)
                                {
                                    console.log ('writing '+pdata.peripheral.uuid);
                                    if (characteristics.length > 0 && characteristics[0])
                                    {
                                        var response = 0;
                                        for (var i = 0; i<characteristics[0].properties.length; i++)
                                        {
                                            if (characteristics[0].properties[i] == 'write') response = response + 1;
                                            if (characteristics[0].properties[i] == 'writeWithoutResponse') response = response + 2;
                                        }
                                        if (response > 0)
                                        {
                                            characteristics[0].write (data, response & 2, function (err, data)
                                            {
                                                if (err)
                                                {
                                                    console.log (err);
                                                    pdisconnect (pdata.peripheral);
                                                    pdone ();
                                                    if (done) done (err);
                                                }
                                                else
                                                {
                                                    pdisconnect (pdata.peripheral);
                                                    pdone ();
                                                    done (null);
                                                }
                                            });
                                        }
                                        else
                                        {
                                            that.warn ('Characteristic is not writable');
                                        }
                                    }
                                    else
                                    {
                                        pdone ();
                                        pdisconnect (pdata.peripheral);
                                    }
                                }
                                else
                                {
                                    console.log (err);
                                    pdisconnect (pdata.peripheral);
                                    pdone ();
                                    done (err);
                                }
                            }
                        });
                    pdata.peripheral.on ('disconnect', function ()
                    {
                        if (!connect)
                        {
                            console.log ('retry');
                            connect = null;
                            pdata.retry = true;
                            pdisconnect (pdata.peripheral);
                            pdone ();
                            done (new Error ());
                        }
                    });
                });
                if (!pdata.readwrite) pnextreadwrite (pdata);
            }
        });
    }

    function pnextreadwrite (pdata)
    {
        if (pdata.readwrites.length > 0)
        {
            var readwrite = pdata.readwrites[0];
            pdata.readwrites.splice (0, 1);
            pdata.readwrite = true;
            if (!pdata.retry)
            {
                readwrite (function ()
                    {
                        process.nextTick (function ()
                            {
                                pnextreadwrite (pdata);
                            });
                    });
            }
            else
            {
                // done (new Error ());
                process.nextTick (function ()
                    {
                        pnextreadwrite (pdata);
                    });
                
            }
        }
        else
        {
            pdata.readwrite = false;
        }
    }
    
    // The main node definition - most things happen in here
    function NobleScan(n) {
        load ();
        // Create a RED node
        RED.nodes.createNode(this,n);

        // Store local copies of the node configuration (as defined in the .html)
        this.duplicates = n.duplicates;
        this.uuids = [];
        if (n.uuids != undefined && n.uuids !== "") {
            this.uuids = n.uuids.split(',');    //obtain array of uuids
        }

        if (RED.device)
        {

            var node = this;
            var machineId = os.hostname();

            noble.on('discover', function(peripheral) {
                var msg = { payload:{peripheralUuid:peripheral.uuid, localName: peripheral.advertisement.localName} };
                msg.peripheralUuid = peripheral.uuid;
                msg.localName = peripheral.advertisement.localName;
                msg.detectedAt = new Date().getTime();
                msg.detectedBy = machineId;
                msg.advertisement = peripheral.advertisement;
                msg.rssi = peripheral.rssi;
                msg.peripheral = peripheral;

                // Check the BLE follows iBeacon spec
                if (peripheral.manufacturerData) {
                    // http://www.theregister.co.uk/2013/11/29/feature_diy_apple_ibeacons/
                    if (peripheral.manufacturerData.length >= 25) {
                        var proxUuid = peripheral.manufacturerData.slice(4, 20).toString('hex');
                        var major = peripheral.manufacturerData.readUInt16BE(20);
                        var minor = peripheral.manufacturerData.readUInt16BE(22);
                        var measuredPower = peripheral.manufacturerData.readInt8(24);

                        var accuracy = Math.pow(12.0, 1.5 * ((rssi / measuredPower) - 1));
                        var proximity = null;

                        if (accuracy < 0) {
                            proximity = 'unknown';
                        } else if (accuracy < 0.5) {
                            proximity = 'immediate';
                        } else if (accuracy < 4.0) {
                            proximity = 'near';
                        } else {
                            proximity = 'far';
                        }

                        msg.manufacturerUuid = proxUuid;
                        msg.major = major;
                        msg.minor = minor;
                        msg.measuredPower = measuredPower;
                        msg.accuracy = accuracy;
                        msg.proximity = proximity;
                    }
                }

                // Generate output event
                node.send(msg);
            });

            // deal with state changes
            noble.on('stateChange', function(state) {
                if (state === 'poweredOn') {
                    noble.startScanning(node.uuids, node.duplicates);
                } else {
                    noble.stopScanning();
                }
            });

            // start initially
            var devices = function ()
            {
                if (noble.state === 'poweredOn') {
                    noble.startScanning(node.uuids, node.duplicates);
                } else {
                    node.warn("Unable to start BLE scan. Adapter state: " + noble.state);
                    noble.startScanning(node.uuids, node.duplicates);
                    // setTimeout (devices, 4000);
                }
            }

            devices ();
    
            this.on("close", function() {
                // Called when the node is shutdown - eg on redeploy.
                // Allows ports to be closed, connections dropped etc.
                // eg: this.client.disconnect();
                noble.stopScanning();
            });

            noble.on('scanStart', function() {
                node.log("Scanning for BLEs started. UUIDs: " + node.uuids + " - Duplicates allowed: " + node.duplicates);
            });

            noble.on('scanStop', function() {
                node.log("Scanning for BLEs stopped. ");
            });
        }
    }
    
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("scan ble",NobleScan);

    // The main node definition - most things happen in here
    function NobleNotify(n) {
        load ();
        // Create a RED node
        RED.nodes.createNode(this,n);

        this.peripherals = dict ();
        this.access = dict ();

        if (n.ids != undefined) n.ids="";
        if (n.addresses != undefined) n.addresses = "";
        this.ids = (n.ids.length>0?n.ids.split (', '):[]);
        this.addresses = (n.addresses.length>0?n.addresses.split (', '):[]);
        this.service = n.service;
        this.characteristic = n.characteristic;
        this.datatype = n.datatype;

        var that = this;

        var hasId = function (id)
        {
            if (!id) return false;
            if (that.ids.length == 0) return true;
            else
            {
                for (var i=0; i<that.ids.length; i++)
                {
                    if (that.ids[i].toLowerCase() == id.toLowerCase()) return true;
                }
                return false;
            }
        };

        var hasAddress = function (address)
        {
            if (that.addresses.length == 0) return true;
            else
            {
                for (var i=0; i<that.addresses.length; i++)
                {
                    if (that.addresses[i].toLowerCase() == address.toLowerCase()) return true;
                }
                return false;
            }
        };

        if (RED.device)
        {
    
            this.on ('input', function (msg)
            {
                if (msg.peripheral)
                {
                    console.log ('peripheraldevice');
                    // console.log (msg.peripheral);
                    // console.log (msg.peripheralUuid);
                    if (that.peripherals.get (msg.peripheralUuid) != msg.peripheral)
                    {
                        if (hasAddress (msg.peripheralUuid) || hasId (msg.localName))
                        {
                            console.log ('adding peripheral device');
                            that.peripherals.set (msg.peripheralUuid, msg.peripheral);
                            // console.log (that.peripherals);
                            // console.log (that.peripherals.size);

                            var connect = function ()
                            {
                                pconnect (msg.peripheral, function (err, pdata)
                                {
                                    if (err)
                                    {
                                        console.log (err+' '+msg.peripheral.uuid);
                                    }
                                    else
                                    {
                                        pdata.readwrites.splice (0, 0, function (pdone)
                                        {


                                            console.log ('connected '+msg.peripheral.uuid);
                                            // if (!that.access.get (that.service+'.'+that.characteristic))
                                            // {
                                            //     that.access.set (that.service+'.'+that.characteristic);
                                            msg.peripheral.discoverSomeServicesAndCharacteristics([that.service], [that.characteristic], function (err, services, characteristics)
                                                {
                                                    pdone ();
                                                    if (err)
                                                    {
                                                        console.log (err);
                                                        pdisconnect (msg.peripheral);
                                                    }
                                                    else
                                                    {
                                                        characteristics[0].notify (true, function (err)
                                                        {
                                                            if (err)
                                                            {
                                                                console.log (err);
                                                                pdisconnect (msg.peripheral);
                                                            }
                                                            else
                                                            {
                                                                characteristics[0].on ('read', function (data)
                                                                {
                                                                    var type = that.datatype;
                                                                    if (msg.datatype) type = msg.datatype;
                                                                    that.send ({payload: readValue (type, data)});
                                                                });
                                                                // pdisconnect (peripheraldevice);
                                                            }
                                                        });
                                                        // peripheraldevice.disconnect ();
                                                    }
                                              });
                                        });

                                        if (!pdata.readwrite) pnextreadwrite (pdata, null);

                                            // setTimeout (function ()
                                            // {
                                            //     if (!connected)
                                            //     {
                                            //         connected = true;
                                            //         pdisconnect (msg.peripheral);
                                            //         that.access.delete (that.service+'.'+that.characteristic);
                                            //     }
                                            // }, 5000);
                                    }
                                    // }
                                    msg.peripheral.on ('disconnect', function ()
                                        {
                                            pdisconnect (msg.peripheral);
                                            setTimeout (function ()
                                            {
                                                connect ();
                                            }, 4000);
                                        });
                                });
                            };

                            connect ();
                        }
                    }
                }
            });
                
                    // console.log ('periferal devices');
                    // console.log (that.peripherals);
                    // console.log (that.peripherals.size);
                    


            this.on("close", function() {
                // Called when the node is shutdown - eg on redeploy.
                // Allows ports to be closed, connections dropped etc.
                // eg: this.client.disconnect();
                if (peripheral) peripheral.disconnect ();
            });
        }
    }
    
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("notify ble",NobleNotify);

    function NobleRead(n) {
        load ();
        // Create a RED node
        RED.nodes.createNode(this,n);

        this.peripherals = dict ();

        if (n.ids != undefined) n.ids="";
        if (n.addresses != undefined) n.addresses = "";
        this.ids = (n.ids.length>0?n.ids.split (', '):[]);
        this.addresses = (n.addresses.length>0?n.addresses.split (', '):[]);
        this.service = n.service;
        this.characteristic = n.characteristic;
        this.datatype = n.datatype;

        var that = this;

        var hasId = function (id)
        {
            if (!id) return false;
            if (that.ids.length == 0) return true;
            else
            {
                for (var i=0; i<that.ids.length; i++)
                {
                    if (that.ids[i].toLowerCase() == id.toLowerCase()) return true;
                }
                return false;
            }
        };

        var hasAddress = function (address)
        {
            if (that.addresses.length == 0) return true;
            else
            {
                for (var i=0; i<that.addresses.length; i++)
                {
                    if (that.addresses[i].toLowerCase() == address.toLowerCase()) return true;
                }
                return false;
            }
        };

        if (RED.device)
        {
    
            this.on ('input', function (msg)
            {
                if (msg.peripheral)
                {
                    console.log ('peripheraldevice');
                    // console.log (msg.peripheral);
                    // console.log (msg.peripheralUuid);
                    if (that.peripherals.get (msg.peripheralUuid) != msg.peripheral)
                    {
                        if (hasAddress (msg.peripheralUuid) || hasId (msg.localName))
                        {
                            console.log ('adding peripheral device');
                            that.peripherals.set (msg.peripheralUuid, msg.peripheral);
                            // console.log (that.peripherals);
                            // console.log (that.peripherals.size);
                        }
                    }
                }
                else
                {
                    console.log ('periferal devices');
                    // console.log (that.peripherals);
                    // console.log (that.peripherals.size);
                    that.peripherals.forEach (function (peripheraldevice, address)
                    {
                        // console.log (peripheraldevice);
                        pread (peripheraldevice, that.service, that.characteristic, function (err, data)
                        {
                            if (!err)
                            {
                                var type = that.datatype;
                                if (msg.datatype) type = msg.datatype;   
                                that.send ({payload: readValue (type, data)});
                            }
                            else
                            {
                                console.log (err);
                            }
                        });
                    });
                }
            });

            this.on("close", function() {
                // Called when the node is shutdown - eg on redeploy.
                // Allows ports to be closed, connections dropped etc.
                // eg: this.client.disconnect();
                // if (peripheral) peripheral.disconnect ();
            });
        }
    }
    
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("read ble",NobleRead);

    function NobleWrite(n) {
        load ();
        // Create a RED node
        RED.nodes.createNode(this,n);

        this.peripherals = dict ();
        this.access = dict ();

        if (n.ids != undefined) n.ids="";
        if (n.addresses != undefined) n.addresses = "";
        this.ids = (n.ids.length>0?n.ids.split (', '):[]);
        this.addresses = (n.addresses.length>0?n.addresses.split (', '):[]);
        this.service = n.service;
        this.characteristic = n.characteristic;
        this.datatype = n.datatype;

        var that = this;

        var hasId = function (id)
        {
            if (!id) return false;
            if (that.ids.length == 0) return true;
            else
            {
                for (var i=0; i<that.ids.length; i++)
                {
                    if (that.ids[i].toLowerCase() == id.toLowerCase()) return true;
                }
                return false;
            }
        };

        var hasAddress = function (address)
        {
            if (that.addresses.length == 0) return true;
            else
            {
                for (var i=0; i<that.addresses.length; i++)
                {
                    if (that.addresses[i].toLowerCase() == address.toLowerCase()) return true;
                }
                return false;
            }
        };

        if (RED.device)
        {
    
            this.on ('input', function (msg)
            {
                if (msg.peripheral)
                {
                    console.log ('peripheraldevice');
                    // console.log (msg.peripheral);
                    // console.log (msg.peripheralUuid);
                    if (that.peripherals.get (msg.peripheralUuid) != msg.peripheral)
                    {
                        if (hasAddress (msg.peripheralUuid) || hasId (msg.localName))
                        {
                            console.log ('adding peripheral device');
                            that.peripherals.set (msg.peripheralUuid, msg.peripheral);
                            // console.log (that.peripherals);
                            // console.log (that.peripherals.size);
                        }
                    }
                }
                else
                {
                    console.log ('periferal devices');
                    // console.log (that.peripherals);
                    // console.log (that.peripherals.size);
                    that.peripherals.forEach (function (peripheraldevice, address)
                    {
                        // console.log (peripheraldevice);
                        var func = function ()
                        {
                            
                        };

                        var type = that.datatype;
                        if (msg.datatype) type = msg.datatype;
                        var data = writeValue (type, msg.payload);

                        pwrite (peripheraldevice, that.service, that.characteristic, data, function (err)
                        {
                            if (!err) that.send ({event: true});
                        });
                        
                    });
                }
            });

            this.on("close", function() {
                // Called when the node is shutdown - eg on redeploy.
                // Allows ports to be closed, connections dropped etc.
                // eg: this.client.disconnect();
                if (peripheral) peripheral.disconnect ();
            });
        }
    }
    
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("write ble",NobleWrite);

    // The Board Definition - this opens (and closes) the connection
    function BleNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.device = n.device || null;
        this.repeat = n.repeat||25;
        //node.log("opening connection "+this.device);
        var node = this;
        node.board = new BLEFirmata ();
        // if (portlist.indexOf(node.device) === -1) {
        //     node.warn("Device "+node.device+" not found");
        // }
        // else {
            node.board.connect(node.device);
        // }

        node.board.on('connect', function(){
            node.log("version "+node.board.boardVersion);
        });

        node.on('close', function() {
            if (node.board) {
                try {
                    node.board.close(function() {
                        node.log("port closed");
                    });
                } catch(e) { }
            }
        });
    }
    RED.nodes.registerType("ble-board",BleNode);


    // The Input Node
    function BleIn(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.buttonState = -1;
        this.pin = n.pin;
        this.state = n.state;
        this.arduino = n.arduino;
        this.serverConfig = RED.nodes.getNode(this.arduino);
        if (typeof this.serverConfig === "object") {
            this.board = this.serverConfig.board;
            //this.repeat = this.serverConfig.repeat;
            var node = this;
            node.status({fill:"red",shape:"ring",text:"connecting"});

            node.board.on('connect', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
                //console.log("i",node.state,node.pin);
                if (node.state == "ANALOG") {
                    node.board.on('analogChange', function(e) {
                        if (e.pin == node.pin) {
                            var msg = {payload:e.value, topic:"A"+e.pin};
                            node.send(msg);
                        }
                    });

                }
                else {
                    node.board.pinMode(node.pin, ArduinoFirmata.INPUT);
                    node.board.on('digitalChange', function(e) {
                        if (e.pin == node.pin) {
                            var msg = {payload:e.value, topic:e.pin};
                            node.send(msg);
                        }
                    });
                }
            });
        }
        else {
            util.log("[BLEFirmata-arduino] port not configured");
        }
    }
    RED.nodes.registerType("ble in",BleIn);


    // The Output Node
    function BleOut(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.buttonState = -1;
        this.pin = n.pin;
        this.state = n.state;
        this.arduino = n.arduino;
        this.serverConfig = RED.nodes.getNode(this.arduino);
        if (typeof this.serverConfig === "object") {
            this.board = this.serverConfig.board;
            var node = this;
            node.status({fill:"red",shape:"ring",text:"connecting"});

            node.board.on('connect', function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
                //console.log("o",node.state,node.pin);
                node.board.pinMode(node.pin, node.state);
                node.on("input", function(msg) {
                    if (node.state == "OUTPUT") {
                        if ((msg.payload == true)||(msg.payload == 1)||(msg.payload.toString().toLowerCase() == "on")) {
                            node.board.digitalWrite(node.pin, true);
                        }
                        if ((msg.payload == false)||(msg.payload == 0)||(msg.payload.toString().toLowerCase() == "off")) {
                            node.board.digitalWrite(node.pin, false);
                        }
                    }
                    if (node.state == "PWM") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 255)) {
                            //console.log(msg.payload, node.pin);
                            node.board.analogWrite(node.pin, msg.payload);
                        }
                    }
                    if (node.state == "SERVO") {
                        msg.payload = msg.payload * 1;
                        if ((msg.payload >= 0) && (msg.payload <= 180)) {
                            //console.log(msg.payload, node.pin);
                            node.board.servoWrite(node.pin, msg.payload);
                        }
                    }
                });
            });
        }
        else {
            util.log("[BLEFirmata-arduino] port not configured");
        }
    }
    RED.nodes.registerType("ble out",BleOut);

    RED.httpAdmin.get("/arduinoports",function(req,res) {
        ArduinoFirmata.list(function (err, ports) {
            //console.log(JSON.stringify(ports));
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(ports));
            res.end();
        });
    });

}
