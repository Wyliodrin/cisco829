/**
 * Copyright 2013, 2015 IBM Corp.
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
var RED = (function() {


    function loadSettings() {
        RED.settings.init(loadNodeList);
    }

    function loadNodeList() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                RED.nodes.setNodeList(data);
                loadNodes();
            }
        });
    }

    function loadNodes() {
        $.ajax({
            headers: {
                "Accept":"text/html"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                $("body").append(data);
                $(".palette-spinner").hide();
                $(".palette-scroll").show();
                $("#palette-search").show();
                loadFlows();
            }
        });
    }

    function loadFlows() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'flows',
            success: function(nodes) {
                RED.nodes.import(nodes);
                RED.nodes.dirty(false);
                RED.view.redraw(true);
                RED.comms.subscribe("status/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var node = RED.nodes.node(parts[1]);
                    if (node) {
                        node.status = msg;
                        if (statusEnabled) {
                            node.dirty = true;
                            RED.view.redraw();
                        }
                    }
                });
                RED.comms.subscribe("node/#",function(topic,msg) {
                    var i,m;
                    var typeList;
                    var info;

                    if (topic == "node/added") {
                        var addedTypes = [];
                        for (i=0;i<msg.length;i++) {
                            m = msg[i];
                            var id = m.id;
                            RED.nodes.addNodeSet(m);
                            addedTypes = addedTypes.concat(m.types);
                            $.get('nodes/'+id, function(data) {
                                $("body").append(data);
                            });
                        }
                        if (addedTypes.length) {
                            typeList = "<ul><li>"+addedTypes.join("</li><li>")+"</li></ul>";
                            RED.notify("Node"+(addedTypes.length!=1 ? "s":"")+" added to palette:"+typeList,"success");
                        }
                    } else if (topic == "node/removed") {
                        for (i=0;i<msg.length;i++) {
                            m = msg[i];
                            info = RED.nodes.removeNodeSet(m.id);
                            if (info.added) {
                                typeList = "<ul><li>"+m.types.join("</li><li>")+"</li></ul>";
                                RED.notify("Node"+(m.types.length!=1 ? "s":"")+" removed from palette:"+typeList,"success");
                            }
                        }
                    } else if (topic == "node/enabled") {
                        if (msg.types) {
                            info = RED.nodes.getNodeSet(msg.id);
                            if (info.added) {
                                RED.nodes.enableNodeSet(msg.id);
                                typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" enabled:"+typeList,"success");
                            } else {
                                $.get('nodes/'+msg.id, function(data) {
                                    $("body").append(data);
                                    typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                    RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" added to palette:"+typeList,"success");
                                });
                            }
                        }
                    } else if (topic == "node/disabled") {
                        if (msg.types) {
                            RED.nodes.disableNodeSet(msg.id);
                            typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                            RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" disabled:"+typeList,"success");
                        }
                    }
                });
            }
        });
    }

    var statusEnabled = false;
    function toggleStatus(state) {
        statusEnabled = state;
        RED.view.status(statusEnabled);
    }

    function loadEditor() {
        RED.menu.init({id:"btn-sidemenu",
            options: [
                {id:"menu-item-sidebar",label:"Sidebar",toggle:true,onselect:RED.sidebar.toggleSidebar, selected: true},
                {id:"menu-item-status",label:"Display node status",toggle:true,onselect:toggleStatus, selected: true},
                null,
                {id:"menu-item-import",label:"Import",options:[
                    {id:"menu-item-import-clipboard",label:"Clipboard",onselect:RED.clipboard.import},
                    {id:"menu-item-import-library",label:"Library",options:[]}
                ]},
                {id:"menu-item-export",label:"Export",disabled:true,options:[
                    {id:"menu-item-export-clipboard",label:"Clipboard",disabled:true,onselect:RED.clipboard.export},
                    {id:"menu-item-export-library",label:"Library",disabled:true,onselect:RED.library.export}
                ]},
                null,
                {id:"menu-item-config-nodes",label:"Configuration nodes",onselect:RED.sidebar.config.show},
                null,
                {id:"menu-item-subflow",label:"Subflows", options: [
                    {id:"menu-item-subflow-create",label:"Create subflow",onselect:RED.subflow.createSubflow},
                    {id:"menu-item-subflow-convert",label:"Selection to subflow",disabled:true,onselect:RED.subflow.convertToSubflow},
                ]},
                null,
                {id:"menu-item-workspace",label:"Workspaces",options:[
                    {id:"menu-item-workspace-add",label:"Add",onselect:RED.workspaces.add},
                    {id:"menu-item-workspace-edit",label:"Rename",onselect:RED.workspaces.edit},
                    {id:"menu-item-workspace-delete",label:"Delete",onselect:RED.workspaces.remove},
                    null
                ]},
                null,
                {id:"menu-item-keyboard-shortcuts",label:"Keyboard Shortcuts",onselect:RED.keyboard.showHelp},
                {id:"menu-item-help",
                    label: RED.settings.theme("menu.menu-item-help.label","Node-RED Website"),
                    href: RED.settings.theme("menu.menu-item-help.url","http://nodered.org/docs")
                }
            ]
        });
        
        RED.user.init();
        
        RED.library.init();
        RED.palette.init();
        RED.sidebar.init();
        RED.subflow.init();
        RED.workspaces.init();
        RED.clipboard.init();
        RED.view.init();
        
        RED.deploy.init(RED.settings.theme("deployButton",null));
        
        RED.keyboard.add(/* ? */ 191,{shift:true},function(){RED.keyboard.showHelp();d3.event.preventDefault();});
        RED.comms.connect();

        $("#main-container").show();
        $(".header-toolbar").show();

        loadNodeList();
    }

    $(function() {
            
        if ((window.location.hostname !== "localhost") && (window.location.hostname !== "127.0.0.1")) {
            document.title = document.title+" : "+window.location.hostname;
        }
        
        ace.require("ace/ext/language_tools");

        RED.settings.init(loadEditor);
    });


    return {
    };
})();
;/**
 * Copyright 2014 IBM, Antoine Aflalo
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


RED.settings = (function () {
    
    var loadedSettings = {};
        
    var hasLocalStorage = function () {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    };

    var set = function (key, value) {
        if (!hasLocalStorage()) {
            return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    };
    /**
     * If the key is not set in the localStorage it returns <i>undefined</i>
     * Else return the JSON parsed value
     * @param key
     * @returns {*}
     */
    var get = function (key) {
        if (!hasLocalStorage()) {
            return undefined;
        }
        return JSON.parse(localStorage.getItem(key));
    };

    var remove = function (key) {
        if (!hasLocalStorage()) {
            return;
        }
        localStorage.removeItem(key);
    };

    var setProperties = function(data) {
        for (var prop in loadedSettings) {
            if (loadedSettings.hasOwnProperty(prop) && RED.settings.hasOwnProperty(prop)) {
                delete RED.settings[prop];
            }
        }
        for (prop in data) {
            if (data.hasOwnProperty(prop)) {
                RED.settings[prop] = data[prop];
            }
        }
        loadedSettings = data;
    };

    var init = function (done) {
        var accessTokenMatch = /[?&]access_token=(.*?)(?:$|&)/.exec(window.location.search);
        if (accessTokenMatch) {
            var accessToken = accessTokenMatch[1];
            RED.settings.set("auth-tokens",{access_token: accessToken});
            window.location.search = "";
        }
        
        $.ajaxSetup({
            beforeSend: function(jqXHR,settings) {
                // Only attach auth header for requests to relative paths
                if (!/^\s*(https?:|\/|\.)/.test(settings.url)) {
                    var auth_tokens = RED.settings.get("auth-tokens");
                    if (auth_tokens) {
                        jqXHR.setRequestHeader("Authorization","Bearer "+auth_tokens.access_token);
                    }
                }
            }
        });

        load(done);
    }
    
    var load = function(done) {
        $.ajax({
            headers: {
                "Accept": "application/json"
            },
            dataType: "json",
            cache: false,
            url: 'settings',
            success: function (data) {
                setProperties(data);
                if (RED.settings.user && RED.settings.user.anonymous) {
                    RED.settings.remove("auth-tokens");
                }
                console.log("Node-RED: " + data.version);
                done();
            },
            error: function(jqXHR,textStatus,errorThrown) {
                if (jqXHR.status === 401) {
                    if (/[?&]access_token=(.*?)(?:$|&)/.test(window.location.search)) {
                        window.location.search = "";
                    }
                    RED.user.login(function() { load(done); });
                 } else {
                     console.log("Unexpected error:",jqXHR.status,textStatus);
                 }
            }
        });
    };

    function theme(property,defaultValue) {
        if (!RED.settings.editorTheme) {
            return defaultValue;
        }
        var parts = property.split(".");
        var v = RED.settings.editorTheme;
        try {
            for (var i=0;i<parts.length;i++) {
                v = v[parts[i]];
            }
            return v;
        } catch(err) {
            return defaultValue;
        }
    }

    return {
        init: init,
        load: load,
        set: set,
        get: get,
        remove: remove,
        
        theme: theme
    }
})
();
;/**
 * Copyright 2014, 2015 IBM Corp.
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
RED.user = (function() {
        
    function login(opts,done) {
        if (typeof opts == 'function') {
            done = opts;
            opts = {};
        }
        
        var dialog = $('<div id="node-dialog-login" class="hide">'+
                       '<div style="display: inline-block;width: 250px; vertical-align: top; margin-right: 10px; margin-bottom: 20px;"><img id="node-dialog-login-image" src=""/></div>'+
                       '<div style="display: inline-block; width: 250px; vertical-align: bottom; margin-left: 10px; margin-bottom: 20px;">'+
                       '<form id="node-dialog-login-fields" class="form-horizontal" style="margin-bottom: 0px;"></form>'+
                       '</div>'+
                       '</div>');

        dialog.dialog({
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            modal: true,
            closeOnEscape: false,
            width: 600,
            resizable: false,
            draggable: false
        });
        
        $("#node-dialog-login-fields").empty();
        $.ajax({
            dataType: "json",
            url: "auth/login",
            success: function(data) {
                if (data.type == "credentials") {
                    var i=0;
                    
                    if (data.image) {
                        $("#node-dialog-login-image").attr("src",data.image);
                    } else {
                        $("#node-dialog-login-image").attr("src","red/images/node-red-256.png");
                    }
                    for (;i<data.prompts.length;i++) {
                        var field = data.prompts[i];
                        var row = $("<div/>",{id:"rrr"+i,class:"form-row"});
                        $('<label for="node-dialog-login-'+field.id+'">'+field.label+':</label><br/>').appendTo(row);
                        var input = $('<input style="width: 100%" id="node-dialog-login-'+field.id+'" type="'+field.type+'" tabIndex="'+(i+1)+'"/>').appendTo(row);
                        
                        if (i<data.prompts.length-1) {
                            input.keypress(
                                (function() {
                                    var r = row;
                                    return function(event) {
                                        if (event.keyCode == 13) {
                                            r.next("div").find("input").focus();
                                            event.preventDefault();
                                        }
                                    }
                                })()
                            );
                        }
                        row.appendTo("#node-dialog-login-fields");
                    }
                    $('<div class="form-row" style="text-align: right; margin-top: 10px;"><span id="node-dialog-login-failed" style="line-height: 2em;float:left;" class="hide">Login failed</span><img src="red/images/spin.svg" style="height: 30px; margin-right: 10px; " class="login-spinner hide"/>'+
                        (opts.cancelable?'<a href="#" id="node-dialog-login-cancel" style="margin-right: 20px;" tabIndex="'+(i+1)+'">Cancel</a>':'')+
                        '<input type="submit" id="node-dialog-login-submit" style="width: auto;" tabIndex="'+(i+2)+'" value="Login"></div>').appendTo("#node-dialog-login-fields");
                        
                                
                    $("#node-dialog-login-submit").button();
                    $("#node-dialog-login-fields").submit(function(event) {
                        $("#node-dialog-login-submit").button("option","disabled",true);
                        $("#node-dialog-login-failed").hide();
                        $(".login-spinner").show();
                        
                        var body = {
                            client_id: "node-red-editor",
                            grant_type: "password",
                            scope:"*"
                        }
                        for (var i=0;i<data.prompts.length;i++) {
                            var field = data.prompts[i];
                            body[field.id] = $("#node-dialog-login-"+field.id).val();
                        }
                        $.ajax({
                            url:"auth/token",
                            type: "POST",
                            data: body
                        }).done(function(data,textStatus,xhr) {
                            RED.settings.set("auth-tokens",data);
                            $("#node-dialog-login").dialog('destroy').remove();
                            done();
                        }).fail(function(jqXHR,textStatus,errorThrown) {
                            RED.settings.remove("auth-tokens");
                            $("#node-dialog-login-failed").show();
                        }).always(function() {
                            $("#node-dialog-login-submit").button("option","disabled",false);
                            $(".login-spinner").hide();
                        });
                        event.preventDefault();
                    });
                    if (opts.cancelable) {
                        $("#node-dialog-login-cancel").button().click(function( event ) {
                            $("#node-dialog-login").dialog('destroy').remove();
                        });
                    }
                }
                dialog.dialog("open");
            }     
        });
    }

    function logout() {
        $.ajax({
            url: "auth/revoke",
            type: "POST",
            data: {token:RED.settings.get("auth-tokens").access_token},
            success: function() {
                RED.settings.remove("auth-tokens");
                document.location.reload(true);
            }
        })
    }
    
    function updateUserMenu() {
        $("#usermenu-submenu li").remove();
        if (RED.settings.user.anonymous) {
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-login",
                label:"Login",
                onselect: function() {
                    RED.user.login({cancelable:true},function() {
                        RED.settings.load(function() {
                            RED.notify("Logged in as "+RED.settings.user.username,"success");
                            updateUserMenu();
                        });
                    });
                }
            });
        } else {
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-username",
                label:"<b>"+RED.settings.user.username+"</b>"
            });
            RED.menu.addItem("btn-usermenu",{
                id:"usermenu-item-logout",
                label:"Logout",
                onselect: function() {
                    RED.user.logout();
                }
            });
        }
        
    }
    
    
    
    function init() {
        if (RED.settings.user) {
            if (!RED.settings.editorTheme || !RED.settings.editorTheme.hasOwnProperty("userMenu")) {
            
                $('<li><a id="btn-usermenu" class="button hide" data-toggle="dropdown" href="#"><i class="fa fa-user"></i></a></li>')
                    .prependTo(".header-toolbar");
    
                RED.menu.init({id:"btn-usermenu",
                    options: []
                });
                updateUserMenu();
            }
        }
        
    }
    return {
        init: init,
        login: login,
        logout: logout
    }

})();
;/**
 * Copyright 2014, 2015 IBM Corp.
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
 
RED.comms = (function() {
    
    var errornotification = null;
    var clearErrorTimer = null;
    
    var subscriptions = {};
    var ws;
    var pendingAuth = false;
    
    function connectWS() {
        var path = location.hostname;
        var port = location.port;
        if (port.length !== 0) {
            path = path+":"+port;
        }
        path = path+document.location.pathname;
        path = path+(path.slice(-1) == "/"?"":"/")+"comms";
        path = "ws"+(document.location.protocol=="https:"?"s":"")+"://"+path;
        
        var auth_tokens = RED.settings.get("auth-tokens");
        pendingAuth = (auth_tokens!=null);
        
        function completeConnection() {
            for (var t in subscriptions) {
                if (subscriptions.hasOwnProperty(t)) {
                    ws.send(JSON.stringify({subscribe:t}));
                }
            }
        }
        
        ws = new WebSocket(path);
        ws.onopen = function() {
            if (errornotification) {
                clearErrorTimer = setTimeout(function() {
                    errornotification.close();
                    errornotification = null;
                },1000);
            }
            if (pendingAuth) {
                ws.send(JSON.stringify({auth:auth_tokens.access_token}));
            } else {
                completeConnection();
            }
        }
        ws.onmessage = function(event) {
            var msg = JSON.parse(event.data);
            if (pendingAuth && msg.auth == "ok") {
                pendingAuth = false;
                completeConnection();
            } else if (msg.topic) {
                for (var t in subscriptions) {
                    if (subscriptions.hasOwnProperty(t)) {
                        var re = new RegExp("^"+t.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
                        if (re.test(msg.topic)) {
                            var subscribers = subscriptions[t];
                            if (subscribers) {
                                for (var i=0;i<subscribers.length;i++) {
                                    subscribers[i](msg.topic,msg.data);
                                }
                            }
                        }
                    }
                }
            }
        };
        ws.onclose = function() {
            if (errornotification == null) {
                errornotification = RED.notify("<b>Error</b>: Lost connection to server","error",true);
            } else if (clearErrorTimer) {
                clearTimeout(clearErrorTimer);
                clearErrorTimer = null;
            }
            setTimeout(connectWS,1000);
        }
    }
    
    function subscribe(topic,callback) {
        if (subscriptions[topic] == null) {
            subscriptions[topic] = [];
        }
        subscriptions[topic].push(callback);
        if (ws && ws.readyState == 1) {
            ws.send(JSON.stringify({subscribe:topic}));
        }
    }
    
    function unsubscribe(topic,callback) {
        if (subscriptions[topic]) {
            for (var i=0;i<subscriptions[topic].length;i++) {
                if (subscriptions[topic][i] === callback) {
                    subscriptions[topic].splice(i,1);
                    break;
                }
            }
            if (subscriptions[topic].length === 0) {
                delete subscriptions[topic];
            }
        }
    }
    
    return {
        connect: connectWS,
        subscribe: subscribe,
        unsubscribe:unsubscribe
    }
})();
;/**
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
RED.state = {
    DEFAULT: 0,
    MOVING: 1,
    JOINING: 2,
    MOVING_ACTIVE: 3,
    ADDING: 4,
    EDITING: 5,
    EXPORT: 6,
    IMPORT: 7,
    IMPORT_DRAGGING: 8
}
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.nodes = (function() {

    var node_defs = {};
    var nodes = [];
    var configNodes = {};
    var links = [];
    var defaultWorkspace;
    var workspaces = {};
    var subflows = {};
    
    var dirty = false;
    
    function setDirty(d) {
        dirty = d;
        eventHandler.emit("change",{dirty:dirty});
    }
    
    var registry = (function() {
        var nodeList = [];
        var nodeSets = {};
        var typeToId = {};
        var nodeDefinitions = {};
        
        var exports = {
            getNodeList: function() {
                return nodeList;
            },
            setNodeList: function(list) {
                nodeList = [];
                for(var i=0;i<list.length;i++) {
                    var ns = list[i];
                    exports.addNodeSet(ns);
                }
            },
            addNodeSet: function(ns) {
                ns.added = false;
                nodeSets[ns.id] = ns;
                for (var j=0;j<ns.types.length;j++) {
                    typeToId[ns.types[j]] = ns.id;
                }
                nodeList.push(ns);
            },
            removeNodeSet: function(id) {
                var ns = nodeSets[id];
                for (var j=0;j<ns.types.length;j++) {
                    if (ns.added) {
                        // TODO: too tightly coupled into palette UI
                        RED.palette.remove(ns.types[j]);
                        var def = nodeDefinitions[ns.types[j]];
                        if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                            def.onpaletteremove.call(def);
                        }
                    }
                    delete typeToId[ns.types[j]];
                }
                delete nodeSets[id];
                for (var i=0;i<nodeList.length;i++) {
                    if (nodeList[i].id == id) {
                        nodeList.splice(i,1);
                        break;
                    }
                }
                return ns;
            },
            getNodeSet: function(id) {
                return nodeSets[id];
            },
            enableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = true;
                for (var j=0;j<ns.types.length;j++) {
                    // TODO: too tightly coupled into palette UI
                    RED.palette.show(ns.types[j]);
                    var def = nodeDefinitions[ns.types[j]];
                    if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                        def.onpaletteadd.call(def);
                    }
                }
            },
            disableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = false;
                for (var j=0;j<ns.types.length;j++) {
                    // TODO: too tightly coupled into palette UI
                    RED.palette.hide(ns.types[j]);
                    var def = nodeDefinitions[ns.types[j]];
                    if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                        def.onpaletteremove.call(def);
                    }
                }
            },
            registerNodeType: function(nt,def) {
                nodeDefinitions[nt] = def;
                if (def.category != "subflows") {
                    nodeSets[typeToId[nt]].added = true;
                    // TODO: too tightly coupled into palette UI
                }
                RED.palette.add(nt,def);
                if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                    def.onpaletteadd.call(def);
                }
            },
            removeNodeType: function(nt) {
                if (nt.substring(0,8) != "subflow:") {
                    throw new Error("this api is subflow only. called with:",nt);
                }
                delete nodeDefinitions[nt];
                RED.palette.remove(nt);
            },
            getNodeType: function(nt) {
                return nodeDefinitions[nt];
            }
        };
        return exports;
    })();
    
    function getID() {
        return (1+Math.random()*4294967295).toString(16);
    }

    function addNode(n) {
        if (n._def.category == "config") {
            configNodes[n.id] = n;
            RED.sidebar.config.refresh();
        } else {
            n.dirty = true;
            var updatedConfigNode = false;
            for (var d in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d)) {
                    var property = n._def.defaults[d];
                    if (property.type) {
                        var type = registry.getNodeType(property.type);
                        if (type && type.category == "config") {
                            var configNode = configNodes[n[d]];
                            if (configNode) {
                                updatedConfigNode = true;
                                configNode.users.push(n);
                            }
                        }
                    }
                }
            }
            if (updatedConfigNode) {
                RED.sidebar.config.refresh();
            }
            if (n._def.category == "subflows" && typeof n.i === "undefined") {
                var nextId = 0;
                RED.nodes.eachNode(function(node) {
                    nextId = Math.max(nextId,node.i||0);
                });
                n.i = nextId+1;
            }
            nodes.push(n);
        }
        if (n._def.onadd) {
            n._def.onadd.call(n);
        }
    }
    function addLink(l) {
        links.push(l);
    }

    function getNode(id) {
        if (id in configNodes) {
            return configNodes[id];
        } else {
            for (var n in nodes) {
                if (nodes[n].id == id) {
                    return nodes[n];
                }
            }
        }
        return null;
    }

    function removeNode(id) {
        var removedLinks = [];
        var node;
        if (id in configNodes) {
            node = configNodes[id];
            delete configNodes[id];
            RED.sidebar.config.refresh();
        } else {
            node = getNode(id);
            if (node) {
                nodes.splice(nodes.indexOf(node),1);
                removedLinks = links.filter(function(l) { return (l.source === node) || (l.target === node); });
                removedLinks.forEach(function(l) {links.splice(links.indexOf(l), 1); });
                var updatedConfigNode = false;
                for (var d in node._def.defaults) {
                    if (node._def.defaults.hasOwnProperty(d)) {
                        var property = node._def.defaults[d];
                        if (property.type) {
                            var type = registry.getNodeType(property.type);
                            if (type && type.category == "config") {
                                var configNode = configNodes[node[d]];
                                if (configNode) {
                                    updatedConfigNode = true;
                                    var users = configNode.users;
                                    users.splice(users.indexOf(node),1);
                                }
                            }
                        }
                    }
                }
                if (updatedConfigNode) {
                    RED.sidebar.config.refresh();
                }
            }
        }
        if (node._def.onremove) {
            node._def.onremove.call(n);
        }
        return removedLinks;
    }

    function removeLink(l) {
        var index = links.indexOf(l);
        if (index != -1) {
            links.splice(index,1);
        }
    }

    function addWorkspace(ws) {
        workspaces[ws.id] = ws;
    }
    function getWorkspace(id) {
        return workspaces[id];
    }
    function removeWorkspace(id) {
        delete workspaces[id];
        var removedNodes = [];
        var removedLinks = [];
        var n;
        for (n=0;n<nodes.length;n++) {
            var node = nodes[n];
            if (node.z == id) {
                removedNodes.push(node);
            }
        }
        for (n=0;n<removedNodes.length;n++) {
            var rmlinks = removeNode(removedNodes[n].id);
            removedLinks = removedLinks.concat(rmlinks);
        }
        return {nodes:removedNodes,links:removedLinks};
    }

    function addSubflow(sf, createNewIds) {
        if (createNewIds) {
            var subflowNames = Object.keys(subflows).map(function(sfid) {
                return subflows[sfid].name;
            });
            
            subflowNames.sort();
            var copyNumber = 1;
            var subflowName = sf.name;
            subflowNames.forEach(function(name) {
                if (subflowName == name) {
                    copyNumber++;
                    subflowName = sf.name+" ("+copyNumber+")";
                }
            });
            sf.name = subflowName;
        }
        
        subflows[sf.id] = sf;
        RED.nodes.registerType("subflow:"+sf.id, {
            defaults:{name:{value:""}},
            icon:"subflow.png",
            category: "subflows",
            inputs: sf.in.length,
            outputs: sf.out.length,
            color: "#da9",
            label: function() { return this.name||RED.nodes.subflow(sf.id).name },
            labelStyle: function() { return this.name?"node_label_italic":""; },
            paletteLabel: function() { return RED.nodes.subflow(sf.id).name }
        });
        
        
    }
    function getSubflow(id) {
        return subflows[id];
    }
    function removeSubflow(sf) {
        delete subflows[sf.id];
        registry.removeNodeType("subflow:"+sf.id);
    }
    
    function subflowContains(sfid,nodeid) {
        for (var i=0;i<nodes.length;i++) {
            var node = nodes[i];
            if (node.z === sfid) {
                var m = /^subflow:(.+)$/.exec(node.type);
                if (m) {
                    if (m[1] === nodeid) {
                        return true;
                    } else {
                        var result = subflowContains(m[1],nodeid);
                        if (result) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    function getAllFlowNodes(node) {
        var visited = {};
        visited[node.id] = true;
        var nns = [node];
        var stack = [node];
        while(stack.length !== 0) {
            var n = stack.shift();
            var childLinks = links.filter(function(d) { return (d.source === n) || (d.target === n);});
            for (var i=0;i<childLinks.length;i++) {
                var child = (childLinks[i].source === n)?childLinks[i].target:childLinks[i].source;
                var id = child.id;
                if (!id) {
                    id = child.direction+":"+child.i;
                }
                if (!visited[id]) {
                    visited[id] = true;
                    nns.push(child);
                    stack.push(child);
                }
            }
        }
        return nns;
    }

    /**
     * Converts a node to an exportable JSON Object
     **/
    function convertNode(n, exportCreds) {
        exportCreds = exportCreds || false;
        var node = {};
        node.id = n.id;
        node.type = n.type;
        if (node.type == "unknown") {
            for (var p in n._orig) {
                if (n._orig.hasOwnProperty(p)) {
                    node[p] = n._orig[p];
                }
            }
        } else {
            for (var d in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d)) {
                    node[d] = n[d];
                }
            }
            if(exportCreds && n.credentials) {
                var credentialSet = {};
                node.credentials = {};
                for (var cred in n._def.credentials) {
                    if (n._def.credentials.hasOwnProperty(cred)) {
                        if (n._def.credentials[cred].type == 'password') {
                            if (n.credentials["has_"+cred] != n.credentials._["has_"+cred] ||
                                (n.credentials["has_"+cred] && n.credentials[cred])) {
                                credentialSet[cred] = n.credentials[cred];
                            }
                        } else if (n.credentials[cred] != null && n.credentials[cred] != n.credentials._[cred]) {
                            credentialSet[cred] = n.credentials[cred];
                        }
                    }
                }
                if (Object.keys(credentialSet).length > 0) {
                    node.credentials = credentialSet;
                }
            }
        }
        if (n._def.category != "config") {
            node.x = n.x;
            node.y = n.y;
            node.z = n.z;
            node.wires = [];
            for(var i=0;i<n.outputs;i++) {
                node.wires.push([]);
            }
            var wires = links.filter(function(d){return d.source === n;});
            for (var j=0;j<wires.length;j++) {
                var w = wires[j];
                if (w.target.type != "subflow") {
                    node.wires[w.sourcePort].push(w.target.id);
                }
            }
        }
        return node;
    }

    function convertSubflow(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.name = n.name;
        node.in = [];
        node.out = [];
        
        n.in.forEach(function(p) {
            var nIn = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.source === p });
            for (var i=0;i<wires.length;i++) {
                var w = wires[i];
                if (w.target.type != "subflow") {
                    nIn.wires.push({id:w.target.id})
                }
            }
            node.in.push(nIn);
        });
        n.out.forEach(function(p,c) {
            var nOut = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.target === p });
            for (i=0;i<wires.length;i++) {
                if (wires[i].source.type != "subflow") {
                    nOut.wires.push({id:wires[i].source.id,port:wires[i].sourcePort})
                } else {
                    nOut.wires.push({id:n.id,port:0})
                }
            }
            node.out.push(nOut);
        });
            
                
        return node;
    }
    /**
     * Converts the current node selection to an exportable JSON Object
     **/
    function createExportableNodeSet(set) {
        var nns = [];
        var exportedConfigNodes = {};
        var exportedSubflows = {};
        for (var n=0;n<set.length;n++) {
            var node = set[n];
            if (node.type.substring(0,8) == "subflow:") {
                var subflowId = node.type.substring(8);
                if (!exportedSubflows[subflowId]) {
                    exportedSubflows[subflowId] = true;
                    var subflow = getSubflow(subflowId);
                    var subflowSet = [subflow];
                    RED.nodes.eachNode(function(n) {
                        if (n.z == subflowId) {
                            subflowSet.push(n);
                        }
                    });
                    var exportableSubflow = createExportableNodeSet(subflowSet);
                    nns = exportableSubflow.concat(nns);
                }
            }
            if (node.type != "subflow") {
                var convertedNode = RED.nodes.convertNode(node);
                for (var d in node._def.defaults) {
                    if (node._def.defaults[d].type && node[d] in configNodes) {
                        var confNode = configNodes[node[d]];
                        var exportable = registry.getNodeType(node._def.defaults[d].type).exportable;
                        if ((exportable == null || exportable)) {
                            if (!(node[d] in exportedConfigNodes)) {
                                exportedConfigNodes[node[d]] = true;
                                nns.unshift(RED.nodes.convertNode(confNode));
                            }
                        } else {
                            convertedNode[d] = "";
                        }
                    }
                }
                nns.push(convertedNode);
            } else {
                var convertedSubflow = convertSubflow(node);
                nns.push(convertedSubflow);
            }
        }
        return nns;
    }

    //TODO: rename this (createCompleteNodeSet)
    function createCompleteNodeSet() {
        var nns = [];
        var i;
        for (i in workspaces) {
            if (workspaces.hasOwnProperty(i)) {
                if (workspaces[i].type == "tab") {
                    nns.push(workspaces[i]);
                }
            }
        }
        for (i in subflows) {
            if (subflows.hasOwnProperty(i)) {
                nns.push(convertSubflow(subflows[i]));
            }
        }
        for (i in configNodes) {
            if (configNodes.hasOwnProperty(i)) {
                nns.push(convertNode(configNodes[i], true));
            }
        }
        for (i=0;i<nodes.length;i++) {
            var node = nodes[i];
            nns.push(convertNode(node, true));
        }
        return nns;
    }

    function importNodes(newNodesObj,createNewIds) {
        var i;
        var n;
        var newNodes;
        if (typeof newNodesObj === "string") {
            if (newNodesObj === "") {
                return;
            }
            try {
                newNodes = JSON.parse(newNodesObj);
            } catch(err) {
                var e = new Error("Invalid flow: "+err.message);
                e.code = "NODE_RED";
                throw e;
            }
        } else {
            newNodes = newNodesObj;
        }

        if (!$.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        var unknownTypes = [];
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type != "workspace" && 
                n.type != "tab" && 
                n.type != "subflow" &&
                !registry.getNodeType(n.type) &&
                n.type.substring(0,8) != "subflow:" &&
                unknownTypes.indexOf(n.type)==-1) {
            
                    unknownTypes.push(n.type);
            }
        }
        if (unknownTypes.length > 0) {
            var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
            var type = "type"+(unknownTypes.length > 1?"s":"");
            RED.notify("<strong>Imported unrecognised "+type+":</strong>"+typeList,"error",false,10000);
            //"DO NOT DEPLOY while in this state.<br/>Either, add missing types to Node-RED, restart and then reload page,<br/>or delete unknown "+n.name+", rewire as required, and then deploy.","error");
        }

        var activeWorkspace = RED.workspaces.active();
        var activeSubflow = getSubflow(activeWorkspace);
        if (activeSubflow) {
            for (i=0;i<newNodes.length;i++) {
                var m = /^subflow:(.+)$/.exec(newNodes[i].type);
                if (m) {
                    var subflowId = m[1];
                    var err;
                    if (subflowId === activeSubflow.id) {
                        err = new Error("Cannot add subflow to itself");
                    }
                    if (subflowContains(m[1],activeSubflow.id)) {
                        err = new Error("Cannot add subflow - circular reference detected");
                    }
                    if (err) {
                        // TODO: standardise error codes
                        err.code = "NODE_RED";
                        throw err;
                    }
                    
                }
            }
        }
        
        var new_workspaces = [];
        var workspace_map = {};
        var new_subflows = [];
        var subflow_map = {};
        var nid;
        var def;
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type === "workspace" || n.type === "tab") {
                if (n.type === "workspace") {
                    n.type = "tab";
                }
                if (defaultWorkspace == null) {
                    defaultWorkspace = n;
                }
                if (createNewIds) {
                    nid = getID();
                    workspace_map[n.id] = nid;
                    n.id = nid;
                }
                addWorkspace(n);
                RED.workspaces.add(n);
                new_workspaces.push(n);
            } else if (n.type === "subflow") {
                subflow_map[n.id] = n;
                if (createNewIds) {
                    nid = getID();
                    n.id = nid;
                }
                // TODO: handle createNewIds - map old to new subflow ids
                n.in.forEach(function(input,i) {
                    input.type = "subflow";
                    input.direction = "in";
                    input.z = n.id;
                    input.i = i;
                    input.id = getID();
                });
                n.out.forEach(function(output,i) {
                    output.type = "subflow";
                    output.direction = "out";
                    output.z = n.id;
                    output.i = i;
                    output.id = getID();
                });
                new_subflows.push(n);
                addSubflow(n,createNewIds);
            } else {
                def = registry.getNodeType(n.type);
                if (def && def.category == "config") {
                    if (!RED.nodes.node(n.id)) {
                        var configNode = {id:n.id,type:n.type,users:[]};
                        for (var d in def.defaults) {
                            if (def.defaults.hasOwnProperty(d)) {
                                configNode[d] = n[d];
                            }
                        }
                        configNode.label = def.label;
                        configNode._def = def;
                        RED.nodes.add(configNode);
                    }
                }
            }
        }
        if (defaultWorkspace == null) {
            defaultWorkspace = { type:"tab", id:getID(), label:"Sheet 1" };
            addWorkspace(defaultWorkspace);
            RED.workspaces.add(defaultWorkspace);
            new_workspaces.push(defaultWorkspace);
            activeWorkspace = RED.workspaces.active();
        }

        var node_map = {};
        var new_nodes = [];
        var new_links = [];

        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type !== "workspace" && n.type !== "tab" && n.type !== "subflow") {
                def = registry.getNodeType(n.type);
                if (!def || def.category != "config") {
                    var node = {x:n.x,y:n.y,z:n.z,type:0,wires:n.wires,changed:false};
                    if (createNewIds) {
                        if (subflow_map[node.z]) {
                            node.z = subflow_map[node.z].id;
                        } else {
                            node.z = workspace_map[node.z];
                            if (!workspaces[node.z]) {
                                node.z = activeWorkspace;
                            }
                        }
                        node.id = getID();
                    } else {
                        node.id = n.id;
                        if (node.z == null || (!workspaces[node.z] && !subflow_map[node.z])) {
                            node.z = activeWorkspace;
                        }
                    }
                    node.type = n.type;
                    node._def = def;
                    if (n.type.substring(0,7) === "subflow") {
                        var parentId = n.type.split(":")[1];
                        var subflow = subflow_map[parentId]||getSubflow(parentId);
                        if (createNewIds) {
                            parentId = subflow.id;
                            node.type = "subflow:"+parentId;
                            node._def = registry.getNodeType(node.type);
                            delete node.i;
                        }
                        node.name = n.name;
                        node.outputs = subflow.out.length;
                        node.inputs = subflow.in.length;
                    } else {
                        if (!node._def) {
                            if (node.x && node.y) {
                                node._def = {
                                    color:"#fee",
                                    defaults: {},
                                    label: "unknown: "+n.type,
                                    labelStyle: "node_label_italic",
                                    outputs: n.outputs||n.wires.length
                                }
                            } else {
                                node._def = {
                                    category:"config"
                                };
                                node.users = [];
                            }
                            var orig = {};
                            for (var p in n) {
                                if (n.hasOwnProperty(p) && p!="x" && p!="y" && p!="z" && p!="id" && p!="wires") {
                                    orig[p] = n[p];
                                }
                            }
                            node._orig = orig;
                            node.name = n.type;
                            node.type = "unknown";
                        }
                        if (node._def.category != "config") {
                            node.inputs = n.inputs||node._def.inputs;
                            node.outputs = n.outputs||node._def.outputs;
                            for (var d2 in node._def.defaults) {
                                if (node._def.defaults.hasOwnProperty(d2)) {
                                    node[d2] = n[d2];
                                }
                            }
                        }
                    }
                    addNode(node);
                    RED.editor.validateNode(node);
                    node_map[n.id] = node;
                    if (node._def.category != "config") {
                        new_nodes.push(node);
                    }
                }
            }
        }
        for (i=0;i<new_nodes.length;i++) {
            n = new_nodes[i];
            for (var w1=0;w1<n.wires.length;w1++) {
                var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
                for (var w2=0;w2<wires.length;w2++) {
                    if (wires[w2] in node_map) {
                        var link = {source:n,sourcePort:w1,target:node_map[wires[w2]]};
                        addLink(link);
                        new_links.push(link);
                    }
                }
            }
            delete n.wires;
        }
        for (i=0;i<new_subflows.length;i++) {
            n = new_subflows[i];
            n.in.forEach(function(input) {
                input.wires.forEach(function(wire) {
                    var link = {source:input, sourcePort:0, target:node_map[wire.id]};
                    addLink(link);
                    new_links.push(link);
                });
                delete input.wires;
            });
            n.out.forEach(function(output) {
                output.wires.forEach(function(wire) {
                    var link;
                    if (subflow_map[wire.id] && subflow_map[wire.id].id == n.id) {
                        link = {source:n.in[wire.port], sourcePort:wire.port,target:output};
                    } else {
                        link = {source:node_map[wire.id]||subflow_map[wire.id], sourcePort:wire.port,target:output};
                    }
                    addLink(link);
                    new_links.push(link);
                });
                delete output.wires;
            });
        }
        
        return [new_nodes,new_links,new_workspaces,new_subflows];
    }
    
    // TODO: supports filter.z|type
    function filterNodes(filter) {
        var result = [];
        
        for (var n=0;n<nodes.length;n++) {
            var node = nodes[n];
            if (filter.hasOwnProperty("z") && node.z !== filter.z) {
                continue;
            }
            if (filter.hasOwnProperty("type") && node.type !== filter.type) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    function filterLinks(filter) {
        var result = [];
        
        for (var n=0;n<links.length;n++) {
            var link = links[n];
            if (filter.source) {
                if (filter.source.hasOwnProperty("id") && link.source.id !== filter.source.id) {
                    continue;
                }
                if (filter.source.hasOwnProperty("z") && link.source.z !== filter.source.z) {
                    continue;
                }
            }
            if (filter.target) {
                if (filter.target.hasOwnProperty("id") && link.target.id !== filter.target.id) {
                    continue;
                }
                if (filter.target.hasOwnProperty("z") && link.target.z !== filter.target.z) {
                    continue;
                }
            }
            if (filter.hasOwnProperty("sourcePort") && link.sourcePort !== filter.sourcePort) {
                continue;
            }
            result.push(link);
        }
        return result;
    }
    
    // TODO: DRY
    var eventHandler = (function() {
        var handlers = {};
        
        return {
            on: function(evt,func) {
                handlers[evt] = handlers[evt]||[];
                handlers[evt].push(func);
            },
            emit: function(evt,arg) {
                if (handlers[evt]) {
                    for (var i=0;i<handlers[evt].length;i++) {
                        handlers[evt][i](arg);
                    }
                    
                }
            }
        }
    })();
    
    return {
        on: eventHandler.on,
        
        registry:registry,
        setNodeList: registry.setNodeList,
        
        getNodeSet: registry.getNodeSet,
        addNodeSet: registry.addNodeSet,
        removeNodeSet: registry.removeNodeSet,
        enableNodeSet: registry.enableNodeSet,
        disableNodeSet: registry.disableNodeSet,
        
        registerType: registry.registerNodeType,
        getType: registry.getNodeType,
        convertNode: convertNode,
        
        add: addNode,
        remove: removeNode,
        
        addLink: addLink,
        removeLink: removeLink,
        
        addWorkspace: addWorkspace,
        removeWorkspace: removeWorkspace,
        workspace: getWorkspace,
        
        addSubflow: addSubflow,
        removeSubflow: removeSubflow,
        subflow: getSubflow,
        subflowContains: subflowContains,
        
        eachNode: function(cb) {
            for (var n=0;n<nodes.length;n++) {
                cb(nodes[n]);
            }
        },
        eachLink: function(cb) {
            for (var l=0;l<links.length;l++) {
                cb(links[l]);
            }
        },
        eachConfig: function(cb) {
            for (var id in configNodes) {
                if (configNodes.hasOwnProperty(id)) {
                    cb(configNodes[id]);
                }
            }
        },
        eachSubflow: function(cb) {
            for (var id in subflows) {
                if (subflows.hasOwnProperty(id)) {
                    cb(subflows[id]);
                }
            }
        },
        
        node: getNode,
        
        filterNodes: filterNodes,
        filterLinks: filterLinks,
        
        import: importNodes,
        
        getAllFlowNodes: getAllFlowNodes,
        createExportableNodeSet: createExportableNodeSet,
        createCompleteNodeSet: createCompleteNodeSet,
        id: getID,
        dirty: function(d) {
            if (d == null) {
                return dirty;
            } else {
                setDirty(d);
            }
        }
    };
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.history = (function() {
    var undo_history = [];
    
    return {
        //TODO: this function is a placeholder until there is a 'save' event that can be listened to
        markAllDirty: function() {
            for (var i=0;i<undo_history.length;i++) {
                undo_history[i].dirty = true;
            }
        },
        depth: function() {
            return undo_history.length;
        },
        push: function(ev) {
            undo_history.push(ev);
        },
        pop: function() {
            var ev = undo_history.pop();
            var i;
            var node;
            var modifiedTabs = {};
            if (ev) {
                if (ev.t == 'add') {
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
                            node = RED.nodes.node(ev.nodes[i]);
                            if (node.z) {
                                modifiedTabs[node.z] = true;
                            }
                            RED.nodes.remove(ev.nodes[i]);
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.removeLink(ev.links[i]);
                        }
                    }
                    if (ev.workspaces) {
                        for (i=0;i<ev.workspaces.length;i++) {
                            RED.nodes.removeWorkspace(ev.workspaces[i].id);
                            RED.workspaces.remove(ev.workspaces[i]);
                        }
                    }
                    if (ev.subflows) {
                        for (i=0;i<ev.subflows.length;i++) {
                            RED.nodes.removeSubflow(ev.subflows[i]);
                            RED.workspaces.remove(ev.subflows[i]);
                        }
                    }
                } else if (ev.t == "delete") {
                    if (ev.workspaces) {
                        for (i=0;i<ev.workspaces.length;i++) {
                            RED.nodes.addWorkspace(ev.workspaces[i]);
                            RED.workspaces.add(ev.workspaces[i]);
                        }
                    }
                    if (ev.subflow) {
                        RED.nodes.addSubflow(ev.subflow);
                    }
                    var subflow;
                    if (ev.subflowInputs && ev.subflowInputs.length > 0) {
                        subflow = RED.nodes.subflow(ev.subflowInputs[0].z);
                        subflow.in.push(ev.subflowInputs[0]);
                        subflow.in[0].dirty = true;
                    }
                    if (ev.subflowOutputs && ev.subflowOutputs.length > 0) {
                        subflow = RED.nodes.subflow(ev.subflowOutputs[0].z);
                        ev.subflowOutputs.sort(function(a,b) { return a.i-b.i});
                        for (i=0;i<ev.subflowOutputs.length;i++) {
                            var output = ev.subflowOutputs[i];
                            subflow.out.splice(output.i,0,output);
                            for (var j=output.i+1;j<subflow.out.length;j++) {
                                subflow.out[j].i++;
                                subflow.out[j].dirty = true;
                            }
                            RED.nodes.eachLink(function(l) {
                                if (l.source.type == "subflow:"+subflow.id) {
                                    if (l.sourcePort >= output.i) {
                                        l.sourcePort++;
                                    }
                                }
                            });
                        }
                    }
                    if (subflow) {
                        RED.nodes.filterNodes({type:"subflow:"+subflow.id}).forEach(function(n) {
                            n.changed = true;
                            n.inputs = subflow.in.length;
                            n.outputs = subflow.out.length;
                            while (n.outputs > n.ports.length) {
                                n.ports.push(n.ports.length);
                            }
                            n.resize = true;
                            n.dirty = true;
                        });
                    }
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
                            RED.nodes.add(ev.nodes[i]);
                            modifiedTabs[ev.nodes[i].z] = true;
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.addLink(ev.links[i]);
                        }
                    }
                } else if (ev.t == "move") {
                    for (i=0;i<ev.nodes.length;i++) {
                        var n = ev.nodes[i];
                        n.n.x = n.ox;
                        n.n.y = n.oy;
                        n.n.dirty = true;
                    }
                } else if (ev.t == "edit") {
                    for (i in ev.changes) {
                        if (ev.changes.hasOwnProperty(i)) {
                            ev.node[i] = ev.changes[i];
                        }
                    }
                    if (ev.subflow) {
                        if (ev.subflow.hasOwnProperty('inputCount')) {
                            if (ev.node.in.length > ev.subflow.inputCount) {
                                ev.node.in.splice(ev.subflow.inputCount);
                            } else if (ev.subflow.inputs.length > 0) {
                                ev.node.in = ev.node.in.concat(ev.subflow.inputs);
                            }
                        }
                        if (ev.subflow.hasOwnProperty('outputCount')) {
                            if (ev.node.out.length > ev.subflow.outputCount) {
                                ev.node.out.splice(ev.subflow.outputCount);
                            } else if (ev.subflow.outputs.length > 0) {
                                ev.node.out = ev.node.out.concat(ev.subflow.outputs);
                            }
                        }
                        RED.nodes.filterNodes({type:"subflow:"+ev.node.id}).forEach(function(n) {
                            n.changed = ev.changed;
                            n.inputs = ev.node.in.length;
                            n.outputs = ev.node.out.length;
                            RED.editor.updateNodeProperties(n);
                        });
                        
                        RED.palette.refresh();
                    } else {
                        RED.editor.updateNodeProperties(ev.node);
                        RED.editor.validateNode(ev.node);
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.addLink(ev.links[i]);
                        }
                    }
                    ev.node.dirty = true;
                    ev.node.changed = ev.changed;
                } else if (ev.t == "createSubflow") {
                    if (ev.nodes) {
                        RED.nodes.filterNodes({z:ev.subflow.id}).forEach(function(n) {
                            n.z = ev.activeWorkspace;
                            n.dirty = true;
                        });
                        for (i=0;i<ev.nodes.length;i++) {
                            RED.nodes.remove(ev.nodes[i]);
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.removeLink(ev.links[i]);
                        }
                    }
                    
                    RED.nodes.removeSubflow(ev.subflow);
                    RED.workspaces.remove(ev.subflow);
                    
                    if (ev.removedLinks) {
                        for (i=0;i<ev.removedLinks.length;i++) {
                            RED.nodes.addLink(ev.removedLinks[i]);
                        }
                    }
                }
                Object.keys(modifiedTabs).forEach(function(id) {
                    var subflow = RED.nodes.subflow(id);
                    if (subflow) {
                        RED.editor.validateNode(subflow);
                    }
                });

                
                RED.nodes.dirty(ev.dirty);
                RED.view.redraw(true);
                RED.palette.refresh();
            }
        }
    }

})();
;/**
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
RED.validators = {
    number: function(){return function(v) { return v!=='' && !isNaN(v);}},
    regex: function(re){return function(v) { return re.test(v);}}
};
;/**
 * Copyright 2015 IBM Corp.
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
 
RED.deploy = (function() {
        
    var deploymentTypes = {
        "full":{img:"red/images/deploy-full-o.png"},
        "nodes":{img:"red/images/deploy-nodes-o.png"},
        "flows":{img:"red/images/deploy-flows-o.png"}
    }
    
    var ignoreDeployWarnings = {
        unknown: false,
        unusedConfig: false,
        invalid: false
    }
    
    var deploymentType = "full";
    
    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy img").attr("src",deploymentTypes[type].img);
    }
    
    
    /**
     * options:
     *   type: "default" - Button with drop-down options - no further customisation available
     *   type: "simple"  - Button without dropdown. Customisations:
     *      label: the text to display - default: "Deploy"
     *      icon : the icon to use. Null removes the icon. default: "red/images/deploy-full-o.png"
     */
    function init(options) {
        options = options || {};
        var type = options.type || "default";
        
        if (type == "default") {
            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#"><img id="btn-deploy-icon" src="red/images/deploy-full-o.png"> <span>Deploy</span></a>'+
              '<a id="btn-deploy-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
              '</span></li>').prependTo(".header-toolbar");
              RED.menu.init({id:"btn-deploy-options",
                  options: [
                      {id:"deploymenu-item-full",toggle:"deploy-type",icon:"red/images/deploy-full.png",label:"Full",sublabel:"Deploys everything in the workspace",selected: true, onselect:function(s) { if(s){changeDeploymentType("full")}}},
                      {id:"deploymenu-item-flow",toggle:"deploy-type",icon:"red/images/deploy-flows.png",label:"Modified Flows",sublabel:"Only deploys flows that contain changed nodes", onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                      {id:"deploymenu-item-node",toggle:"deploy-type",icon:"red/images/deploy-nodes.png",label:"Modified Nodes",sublabel:"Only deploys nodes that have changed",onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
                  ]
              });
        } else if (type == "simple") {
            var label = options.label || "Deploy";
            var icon = 'red/images/deploy-full-o.png';
            if (options.hasOwnProperty('icon')) {
                icon = options.icon;
            }
            
            $('<li><span class="deploy-button-group button-group">'+
              '<a id="btn-deploy" class="deploy-button disabled" href="#">'+
              (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
              '<span>'+label+'</span></a>'+
              '</span></li>').prependTo(".header-toolbar");
        }
        
        $('#btn-deploy').click(function() { save(); });
        
        $( "#node-dialog-confirm-deploy" ).dialog({
                title: "Confirm deploy",
                modal: true,
                autoOpen: false,
                width: 550,
                height: "auto",
                buttons: [
                    {
                        text: "Confirm deploy",
                        click: function() {
                            
                            var ignoreChecked = $( "#node-dialog-confirm-deploy-hide" ).prop("checked");
                            if (ignoreChecked) {
                                ignoreDeployWarnings[$( "#node-dialog-confirm-deploy-type" ).val()] = true;
                            }
                            save(true);
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        text: "Cancel",
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    }
                ],
                create: function() {
                    $("#node-dialog-confirm-deploy").parent().find("div.ui-dialog-buttonpane")
                        .append('<div style="height:0; vertical-align: middle; display:inline-block;">'+
                                   '<input style="vertical-align:top;" type="checkbox" id="node-dialog-confirm-deploy-hide">'+
                                   '<label style="display:inline;" for="node-dialog-confirm-deploy-hide"> do not warn about this again</label>'+
                                   '<input type="hidden" id="node-dialog-confirm-deploy-type">'+
                                   '</div>');
                }
        });

        RED.nodes.on('change',function(state) {
            if (state.dirty) {
                window.onbeforeunload = function() {
                    return "You have undeployed changes.\n\nLeaving this page will lose these changes.";
                }
                $("#btn-deploy").removeClass("disabled");
            } else {
                window.onbeforeunload = null;
                $("#btn-deploy").addClass("disabled");
            }
        });
    }

    function save(force) {
        if (RED.nodes.dirty()) {
            //$("#debug-tab-clear").click();  // uncomment this to auto clear debug on deploy

            if (!force) {
                var hasUnknown = false;
                var hasInvalid = false;
                var hasUnusedConfig = false;
                
                var unknownNodes = [];
                RED.nodes.eachNode(function(node) {
                    hasInvalid = hasInvalid || !node.valid;
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                    }
                });
                hasUnknown = unknownNodes.length > 0;
                
                var unusedConfigNodes = {};
                RED.nodes.eachConfig(function(node) {
                    if (node.users.length === 0) {
                        var label = "";
                        if (typeof node._def.label == "function") {
                            label = node._def.label.call(node);
                        } else {
                            label = node._def.label;
                        }
                        label = label || node.id;
                        unusedConfigNodes[node.type] = unusedConfigNodes[node.type]  || [];
                        unusedConfigNodes[node.type].push(label);
                        hasUnusedConfig = true;
                    }
                });
                
                $( "#node-dialog-confirm-deploy-config" ).hide();
                $( "#node-dialog-confirm-deploy-unknown" ).hide();
                $( "#node-dialog-confirm-deploy-unused" ).hide();
                
                var showWarning = false;
                
                if (hasUnknown && !ignoreDeployWarnings.unknown) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("unknown");
                    $( "#node-dialog-confirm-deploy-unknown" ).show();
                    $( "#node-dialog-confirm-deploy-unknown-list" )
                        .html("<li>"+unknownNodes.join("</li><li>")+"</li>");
                } else if (hasInvalid && !ignoreDeployWarnings.invalid) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("invalid");
                    $( "#node-dialog-confirm-deploy-config" ).show();
                } else if (hasUnusedConfig && !ignoreDeployWarnings.unusedConfig) {
                    showWarning = true;
                    $( "#node-dialog-confirm-deploy-type" ).val("unusedConfig");
                    $( "#node-dialog-confirm-deploy-unused" ).show();
                    var unusedNodeLabels = [];
                    var unusedTypes = Object.keys(unusedConfigNodes).sort();
                    unusedTypes.forEach(function(type) {
                        unusedConfigNodes[type].forEach(function(label) {
                                unusedNodeLabels.push(type+": "+label);
                        });
                    });                    
                    $( "#node-dialog-confirm-deploy-unused-list" )
                        .html("<li>"+unusedNodeLabels.join("</li><li>")+"</li>");
                }
                if (showWarning) {
                    $( "#node-dialog-confirm-deploy-hide" ).prop("checked",false);
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }
            
            
            
            
            var nns = RED.nodes.createCompleteNodeSet();

            $("#btn-deploy-icon").removeClass('fa-download');
            $("#btn-deploy-icon").addClass('spinner');
            RED.nodes.dirty(false);

            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(nns),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                RED.notify("Successfully deployed","success");
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if(node.credentials) {
                        delete node.credentials;
                    }
                });
                RED.nodes.eachConfig(function (confNode) {
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
            }).fail(function(xhr,textStatus,err) {
                RED.nodes.dirty(true);
                if (xhr.responseText) {
                    RED.notify("<strong>Error</strong>: "+xhr.responseJSON.message,"error");
                } else {
                    RED.notify("<strong>Error</strong>: no response from server","error");
                }
            }).always(function() {
                $("#btn-deploy-icon").removeClass('spinner');
                $("#btn-deploy-icon").addClass('fa-download');
            });
        }
    }

    return {
        init: init
    }
})();
;/**
 * Copyright 2014 IBM Corp.
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



RED.menu = (function() {

    var menuItems = {};

    function createMenuItem(opt) {
        var item;

        if (opt !== null && opt.id) {
            var themeSetting = RED.settings.theme("menu."+opt.id);
            if (themeSetting === false) {
                return null;
            }
        }
        
        function setInitialState() {
            var savedStateActive = isSavedStateActive(opt.id);
            if (savedStateActive) {
                link.addClass("active");
                opt.onselect.call(opt, true);
            } else if (savedStateActive === false) {
                link.removeClass("active");
                opt.onselect.call(opt, false);
            } else if (opt.hasOwnProperty("selected")) {
                if (opt.selected) {
                    link.addClass("active");
                } else {
                    link.removeClass("active");
                }
                opt.onselect.call(opt, opt.selected);
            }
        }

        if (opt === null) {
            item = $('<li class="divider"></li>');
        } else {
            item = $('<li></li>');
            
            var linkContent = '<a '+(opt.id?'id="'+opt.id+'" ':'')+'tabindex="-1" href="#">';
            if (opt.toggle) {
                linkContent += '<i class="fa fa-square pull-left"></i>';
                linkContent += '<i class="fa fa-check-square pull-left"></i>';
                
            }
            if (opt.icon !== undefined) {
                if (/\.png/.test(opt.icon)) {
                    linkContent += '<img src="'+opt.icon+'"/> ';
                } else {
                    linkContent += '<i class="'+(opt.icon?opt.icon:'" style="display: inline-block;"')+'"></i> ';
                }
            }
            
            if (opt.sublabel) {
                linkContent += '<span class="menu-label-container"><span class="menu-label">'+opt.label+'</span>'+
                               '<span class="menu-sublabel">'+opt.sublabel+'</span></span>'
            } else {
                linkContent += '<span class="menu-label">'+opt.label+'</span>'
            }
            
            linkContent += '</a>';
                
            var link = $(linkContent).appendTo(item);

            menuItems[opt.id] = opt;

            if (opt.onselect) {
                link.click(function() {
                    if ($(this).parent().hasClass("disabled")) {
                        return;
                    }
                    if (opt.toggle) {
                        var selected = isSelected(opt.id);
                        if (typeof opt.toggle === "string") {
                            if (!selected) {
                                for (var m in menuItems) {
                                    if (menuItems.hasOwnProperty(m)) {
                                        var mi = menuItems[m];
                                        if (mi.id != opt.id && opt.toggle == mi.toggle) {
                                            setSelected(mi.id,false);
                                        }
                                    }
                                }
                                setSelected(opt.id,true);
                            }
                        } else {
                            setSelected(opt.id, !selected);
                        }
                    } else {
                        opt.onselect.call(opt);
                    }
                });
                setInitialState();
            } else if (opt.href) {
                link.attr("target","_blank").attr("href",opt.href);
            } else if (!opt.options) {
                item.addClass("disabled");
                link.click(function(event) {
                    event.preventDefault();
                });
            }
            if (opt.options) {
                item.addClass("dropdown-submenu pull-left");
                var submenu = $('<ul id="'+opt.id+'-submenu" class="dropdown-menu"></ul>').appendTo(item);

                for (var i=0;i<opt.options.length;i++) {
                    var li = createMenuItem(opt.options[i]);
                    if (li) {
                        li.appendTo(submenu);
                    }
                }
            }
            if (opt.disabled) {
                item.addClass("disabled");
            }
            if (opt.tip) {
                item.popover({
                    placement:"left",
                    trigger: "hover",
                    delay: { show: 350, hide: 20 },
                    html: true,
                    container:'body',
                    content: opt.tip
                });
            }
            
        }


        return item;

    }
    function createMenu(options) {

        var button = $("#"+options.id);

        //button.click(function(event) {
        //    $("#"+options.id+"-submenu").show();
        //    event.preventDefault();
        //});
        
        
        var topMenu = $("<ul/>",{id:options.id+"-submenu", class:"dropdown-menu pull-right"}).insertAfter(button);

        var lastAddedSeparator = false;
        for (var i=0;i<options.options.length;i++) {
            var opt = options.options[i];
            if (opt !== null || !lastAddedSeparator) {
                var li = createMenuItem(opt);
                if (li) {
                    li.appendTo(topMenu);
                    lastAddedSeparator = (opt === null);
                }
            }
        }
    }

    function isSavedStateActive(id) {
        return RED.settings.get("menu-" + id);
    }

    function isSelected(id) {
        return $("#" + id).hasClass("active");
    }

    function setSavedState(id, state) {
        RED.settings.set("menu-" + id, state);
    }

    function setSelected(id,state) {
        if (isSelected(id) == state) {
            return;
        }
        var opt = menuItems[id];
        if (state) {
            $("#"+id).addClass("active");
        } else {
            $("#"+id).removeClass("active");
        }
        if (opt && opt.onselect) {
            opt.onselect.call(opt,state);
        }
        setSavedState(id, state);
    }

    function setDisabled(id,state) {
        if (state) {
            $("#"+id).parent().addClass("disabled");
        } else {
            $("#"+id).parent().removeClass("disabled");
        }
    }

    function addItem(id,opt) {
        createMenuItem(opt).appendTo("#"+id+"-submenu");
    }
    function removeItem(id) {
        $("#"+id).parent().remove();
    }

    function setAction(id,action) {
        var opt = menuItems[id];
        if (opt) {
            opt.onselect = action;
            $("#"+id).click(function() {
                if ($(this).parent().hasClass("disabled")) {
                    return;
                }
                if (menuItems[id].toggle) {
                    setSelected(id,!isSelected(id));
                } else {
                    menuItems[id].onselect.call(menuItems[id]);
                }
            });
        }
    }

    return {
        init: createMenu,
        setSelected: setSelected,
        isSelected: isSelected,
        setDisabled: setDisabled,
        addItem: addItem,
        removeItem: removeItem,
        setAction: setAction
        //TODO: add an api for replacing a submenu - see library.js:loadFlowLibrary
    }
})();
;/**
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
RED.keyboard = (function() {

    var active = true;
    var handlers = {};

    d3.select(window).on("keydown",function() {
        if (!active) { return; }
        var handler = handlers[d3.event.keyCode];
        if (handler && handler.ondown) {
            if (!handler.modifiers ||
                ((!handler.modifiers.shift || d3.event.shiftKey) &&
                 (!handler.modifiers.ctrl  || d3.event.ctrlKey || d3.event.metaKey) &&
                 (!handler.modifiers.alt   || d3.event.altKey) )) {
                handler.ondown();
            }
        }
    });

    d3.select(window).on("keyup",function() {
        if (!active) { return; }
        var handler = handlers[d3.event.keyCode];
        if (handler && handler.onup) {
            if (!handler.modifiers ||
                ((!handler.modifiers.shift || d3.event.shiftKey) &&
                 (!handler.modifiers.ctrl  || d3.event.ctrlKey || d3.event.metaKey) &&
                 (!handler.modifiers.alt   || d3.event.altKey) )) {
                handler.onup();
            }
        }
    });
    function addHandler(key,modifiers,ondown,onup) {
        var mod = modifiers;
        var cbdown = ondown;
        var cbup = onup;
        if (typeof modifiers == "function") {
            mod = {};
            cbdown = modifiers;
            cbup = ondown;
        }
        handlers[key] = {modifiers:mod, ondown:cbdown, onup:cbup};
    }
    function removeHandler(key) {
        delete handlers[key];
    }
    
    
    var dialog = null;
    
    function showKeyboardHelp() {
        if (!RED.settings.theme("menu.menu-item-keyboard-shortcuts",true)) {
            return;
        }
        if (!dialog) {
            dialog = $('<div id="keyboard-help-dialog" class="hide">'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:50%; padding: 10px;">'+
                    '<table class="keyboard-shortcuts">'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">a</span></td><td>Select all nodes</td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key">Click</span></td><td>Select all connected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Click</span></td><td>Add/remove node from selection</td></tr>'+
                        '<tr><td><span class="help-key">Delete</span></td><td>Delete selected nodes or link</td></tr>'+
                        '<tr><td>&nbsp;</td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">i</span></td><td>Import nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">e</span></td><td>Export selected nodes</td></tr>'+
                    '</table>'+
                '</div>'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:50%; padding: 10px;">'+
                    '<table class="keyboard-shortcuts">'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Space</span></td><td>Toggle sidebar</td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Delete</span></td><td>Delete selected nodes or link</td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">c</span></td><td>Copy selected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">x</span></td><td>Cut selected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">v</span></td><td>Paste nodes</td></tr>'+
                    '</table>'+
                '</div>'+
                '</div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: "800",
                title:"Keyboard shortcuts",
                resizable: false,
                open: function() {
                    RED.keyboard.disable();
                },
                close: function() {
                    RED.keyboard.enable();
                }
            });
        }
        
        dialog.dialog("open");
    }
    
    return {
        add: addHandler,
        remove: removeHandler,
        disable: function(){ active = false;},
        enable: function(){ active = true; },
        
        showHelp: showKeyboardHelp
    }

})();
;/**
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
 


RED.tabs = (function() {
    
    
    function createTabs(options) {
        var tabs = {};
        
        var ul = $("#"+options.id)
        ul.addClass("red-ui-tabs");
        ul.children().first().addClass("active");
        ul.children().addClass("red-ui-tab");
        
        function onTabClick() {
            activateTab($(this));
            return false;
        }
        
        function onTabDblClick() {
            if (options.ondblclick) {
                options.ondblclick(tabs[$(this).attr('href').slice(1)]);
            }
            return false;
        }
        
        function activateTab(link) {
            if (typeof link === "string") {
                link = ul.find("a[href='#"+link+"']");
            }
            if (!link.parent().hasClass("active")) {
                ul.children().removeClass("active");
                link.parent().addClass("active");
                if (options.onchange) {
                    options.onchange(tabs[link.attr('href').slice(1)]);
                }
            }
        }
        
        function updateTabWidths() {
            var tabs = ul.find("li.red-ui-tab");
            var width = ul.width();
            var tabCount = tabs.size();
            var tabWidth = (width-6-(tabCount*7))/tabCount;
            var pct = 100*tabWidth/width;
            tabs.css({width:pct+"%"});
        }
        
        ul.find("li.red-ui-tab a").on("click",onTabClick).on("dblclick",onTabDblClick);
        updateTabWidths();
        
        
        function removeTab(id) {
            var li = ul.find("a[href='#"+id+"']").parent();
            if (li.hasClass("active")) {
                var tab = li.prev();
                if (tab.size() === 0) {
                    tab = li.next();
                }
                activateTab(tab.find("a"));
            }
            li.remove();
            if (options.onremove) {
                options.onremove(tabs[id]);
            }
            delete tabs[id];
            updateTabWidths();
        }
        
        return {
            addTab: function(tab) {
                tabs[tab.id] = tab;
                var li = $("<li/>",{class:"red-ui-tab"}).appendTo(ul);
                var link = $("<a/>",{href:"#"+tab.id, class:"red-ui-tab-label"}).appendTo(li);
                link.html(tab.label);
                
                link.on("click",onTabClick);
                link.on("dblclick",onTabDblClick);
                if (tab.closeable) {
                    var closeLink = $("<a/>",{href:"#",class:"red-ui-tab-close"}).appendTo(li);
                    closeLink.html('<i class="fa fa-times" />');
                    
                    closeLink.on("click",function(event) {
                        removeTab(tab.id);
                    });
                }
                updateTabWidths();
                if (options.onadd) {
                    options.onadd(tab);
                }
                link.attr("title",tab.label);
                if (ul.find("li.red-ui-tab").size() == 1) {
                    activateTab(link);
                }
            },
            removeTab: removeTab,
            activateTab: activateTab,
            resize: updateTabWidths,
            count: function() {
                return ul.find("li.red-ui-tab").size();
            },
            contains: function(id) {
                return ul.find("a[href='#"+id+"']").length > 0;
            },
            renameTab: function(id,label) {
                tabs[id].label = label;
                var tab = ul.find("a[href='#"+id+"']");
                tab.attr("title",label);
                tab.text(label);
                updateTabWidths();
            }

        }
    }
    
    return {
        create: createTabs
    }
})();
;/**
 * Copyright 2015 IBM Corp.
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


RED.workspaces = (function() {
    
    var activeWorkspace = 0;
    var workspaceIndex = 0;

    function addWorkspace(ws) {
        if (ws) {
            workspace_tabs.addTab(ws);
            workspace_tabs.resize();
        } else {
            var tabId = RED.nodes.id();
            do {
                workspaceIndex += 1;
            } while($("#workspace-tabs a[title='Sheet "+workspaceIndex+"']").size() !== 0);
    
            ws = {type:"tab",id:tabId,label:"Sheet "+workspaceIndex};
            RED.nodes.addWorkspace(ws);
            workspace_tabs.addTab(ws);
            workspace_tabs.activateTab(tabId);
            RED.history.push({t:'add',workspaces:[ws],dirty:RED.nodes.dirty()});
            RED.nodes.dirty(true);
        }
    }
    function deleteWorkspace(ws,force) {
        if (workspace_tabs.count() == 1) {
            return;
        }
        var nodes = [];
        if (!force) {
            nodes = RED.nodes.filterNodes({z:ws.id});
        }
        if (force || nodes.length === 0) {
            removeWorkspace(ws);
            var historyEvent = RED.nodes.removeWorkspace(ws.id);
            historyEvent.t = 'delete';
            historyEvent.dirty = RED.nodes.dirty();
            historyEvent.workspaces = [ws];
            RED.history.push(historyEvent);
            RED.nodes.dirty(true);
        } else {
            $( "#node-dialog-delete-workspace" ).dialog('option','workspace',ws);
            $( "#node-dialog-delete-workspace-name" ).text(ws.label);
            $( "#node-dialog-delete-workspace" ).dialog('open');
        }
    }  
    function showRenameWorkspaceDialog(id) {
        var ws = RED.nodes.workspace(id);
        $( "#node-dialog-rename-workspace" ).dialog("option","workspace",ws);

        if (workspace_tabs.count() == 1) {
            $( "#node-dialog-rename-workspace").next().find(".leftButton")
                .prop('disabled',true)
                .addClass("ui-state-disabled");
        } else {
            $( "#node-dialog-rename-workspace").next().find(".leftButton")
                .prop('disabled',false)
                .removeClass("ui-state-disabled");
        }

        $( "#node-input-workspace-name" ).val(ws.label);
        $( "#node-dialog-rename-workspace" ).dialog("open");
    }
    
    var workspace_tabs = RED.tabs.create({
        id: "workspace-tabs",
        onchange: function(tab) {
            if (tab.type == "subflow") {
                $("#workspace-toolbar").show();
            } else {
                $("#workspace-toolbar").hide();
            }
            var event = {
                old: activeWorkspace
            }
            activeWorkspace = tab.id;
            event.workspace = activeWorkspace;
            
            eventHandler.emit("change",event);
        },
        ondblclick: function(tab) {
            if (tab.type != "subflow") {
                showRenameWorkspaceDialog(tab.id);
            } else {
                RED.editor.editSubflow(RED.nodes.subflow(tab.id));
            }
        },
        onadd: function(tab) {
            RED.menu.addItem("menu-item-workspace",{
                id:"menu-item-workspace-menu-"+tab.id.replace(".","-"),
                label:tab.label,
                onselect:function() {
                    workspace_tabs.activateTab(tab.id);
                }
            });
            RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
        },
        onremove: function(tab) {
            RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
            RED.menu.removeItem("menu-item-workspace-menu-"+tab.id.replace(".","-"));
        }
    });
    
    $("#node-dialog-rename-workspace form" ).submit(function(e) { e.preventDefault();});
    $( "#node-dialog-rename-workspace" ).dialog({
        modal: true,
        autoOpen: false,
        width: 500,
        title: "Rename sheet",
        buttons: [
            {
                class: 'leftButton',
                text: "Delete",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    $( this ).dialog( "close" );
                    deleteWorkspace(workspace);
                }
            },
            {
                text: "Ok",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    var label = $( "#node-input-workspace-name" ).val();
                    if (workspace.label != label) {
                        workspace_tabs.renameTab(workspace.id,label);
                        RED.nodes.dirty(true);
                        $("#menu-item-workspace-menu-"+workspace.id.replace(".","-")).text(label);
                        // TODO: update entry in menu
                    }
                    $( this ).dialog( "close" );
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
        },
        close: function(e) {
            RED.keyboard.enable();
        }
    });
    $( "#node-dialog-delete-workspace" ).dialog({
        modal: true,
        autoOpen: false,
        width: 500,
        title: "Confirm delete",
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    deleteWorkspace(workspace,true);
                    $( this ).dialog( "close" );
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
        },
        close: function(e) {
            RED.keyboard.enable();
        }

    });
    
    function init() {
        $('#btn-workspace-add-tab').on("click",function(e) {addWorkspace(); e.preventDefault()});
        RED.sidebar.on("resize",workspace_tabs.resize);
        
        RED.menu.setAction('menu-item-workspace-delete',function() {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        });
    }
    
    // TODO: DRY
    var eventHandler = (function() {
        var handlers = {};
        
        return {
            on: function(evt,func) {
                handlers[evt] = handlers[evt]||[];
                handlers[evt].push(func);
            },
            emit: function(evt,arg) {
                if (handlers[evt]) {
                    for (var i=0;i<handlers[evt].length;i++) {
                        handlers[evt][i](arg);
                    }
                    
                }
            }
        }
    })();
    
    function removeWorkspace(ws) {
        if (!ws) {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        } else {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
        }
    }
    return {
        init: init,
        on: eventHandler.on,
        add: addWorkspace,
        remove: removeWorkspace,
        
        edit: function(id) {
            showRenameWorkspaceDialog(id||activeWorkspace);
        },
        contains: function(id) {
            return workspace_tabs.contains(id);
        },
        count: function() {
            return workspace_tabs.count();
        },
        active: function() {
            return activeWorkspace
        },
        show: function(id) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                if (sf) {
                    addWorkspace({type:"subflow",id:id,label:"Subflow: "+sf.name, closeable: true});
                }
            } 
            workspace_tabs.activateTab(id);
        },
        refresh: function() {
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,"Subflow: "+sf.name);
                }
            });
        },
        resize: function() {
            workspace_tabs.resize();
        }
    }
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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


RED.view = (function() {
    var space_width = 5000,
        space_height = 5000,
        lineCurveScale = 0.75,
        scaleFactor = 1,
        node_width = 100,
        node_height = 30;

    var touchLongPressTimeout = 1000,
        startTouchDistance = 0,
        startTouchCenter = [],
        moveTouchCenter = [],
        touchStartTime = 0;

    var workspaceScrollPositions = {};


    var activeSubflow = null;
    var activeNodes = [];
    var activeLinks = [];
    
    var selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mousedown_port_type = null,
        mousedown_port_index = 0,
        mouseup_node = null,
        mouse_offset = [0,0],
        mouse_position = null,
        mouse_mode = 0,
        moving_set = [],
        lasso = null,
        showStatus = false,
        lastClickNode = null,
        dblClickPrimed = null,
        clickTime = 0,
        clickElapsed = 0;

    var clipboard = "";

    var status_colours = {
        "red":    "#c00",
        "green":  "#5a8",
        "yellow": "#F9DF31",
        "blue":   "#53A3F3",
        "grey":   "#d3d3d3"
    }

    var outer = d3.select("#chart")
        .append("svg:svg")
        .attr("width", space_width)
        .attr("height", space_height)
        .attr("tabindex",1)
        .attr("pointer-events", "all")
        .style("cursor","crosshair")
        .on("mousedown", function() {
            $(this).focus();
        });
        
    var vis = outer
        .append('svg:g')
        .on("dblclick.zoom", null)
        .append('svg:g')
        .on("mousemove", canvasMouseMove)
        .on("mousedown", canvasMouseDown)
        .on("mouseup", canvasMouseUp)
        .on("touchend", function() {
            clearTimeout(touchStartTime);
            touchStartTime = null;
            if  (RED.touch.radialMenu.active()) {
                return;
            }
            if (lasso) {
                outer_background.attr("fill","#fff");
            }
            canvasMouseUp.call(this);
        })
        .on("touchcancel", canvasMouseUp)
        .on("touchstart", function() {
            var touch0;
            if (d3.event.touches.length>1) {
                clearTimeout(touchStartTime);
                touchStartTime = null;
                d3.event.preventDefault();
                touch0 = d3.event.touches.item(0);
                var touch1 = d3.event.touches.item(1);
                var a = touch0['pageY']-touch1['pageY'];
                var b = touch0['pageX']-touch1['pageX'];

                var offset = $("#chart").offset();
                var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                startTouchCenter = [
                    (touch1['pageX']+(b/2)-offset.left+scrollPos[0])/scaleFactor,
                    (touch1['pageY']+(a/2)-offset.top+scrollPos[1])/scaleFactor
                ];
                moveTouchCenter = [
                    touch1['pageX']+(b/2),
                    touch1['pageY']+(a/2)
                ]
                startTouchDistance = Math.sqrt((a*a)+(b*b));
            } else {
                var obj = d3.select(document.body);
                touch0 = d3.event.touches.item(0);
                var pos = [touch0.pageX,touch0.pageY];
                startTouchCenter = [touch0.pageX,touch0.pageY];
                startTouchDistance = 0;
                var point = d3.touches(this)[0];
                touchStartTime = setTimeout(function() {
                    touchStartTime = null;
                    showTouchMenu(obj,pos);
                    //lasso = vis.append('rect')
                    //    .attr("ox",point[0])
                    //    .attr("oy",point[1])
                    //    .attr("rx",2)
                    //    .attr("ry",2)
                    //    .attr("x",point[0])
                    //    .attr("y",point[1])
                    //    .attr("width",0)
                    //    .attr("height",0)
                    //    .attr("class","lasso");
                    //outer_background.attr("fill","#e3e3f3");
                },touchLongPressTimeout);
            }
        })
        .on("touchmove", function(){
                if  (RED.touch.radialMenu.active()) {
                    d3.event.preventDefault();
                    return;
                }
                var touch0;
                if (d3.event.touches.length<2) {
                    if (touchStartTime) {
                        touch0 = d3.event.touches.item(0);
                        var dx = (touch0.pageX-startTouchCenter[0]);
                        var dy = (touch0.pageY-startTouchCenter[1]);
                        var d = Math.abs(dx*dx+dy*dy);
                        if (d > 64) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                        }
                    } else if (lasso) {
                        d3.event.preventDefault();
                    }
                    canvasMouseMove.call(this);
                } else {
                    touch0 = d3.event.touches.item(0);
                    var touch1 = d3.event.touches.item(1);
                    var a = touch0['pageY']-touch1['pageY'];
                    var b = touch0['pageX']-touch1['pageX'];
                    var offset = $("#chart").offset();
                    var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                    var moveTouchDistance = Math.sqrt((a*a)+(b*b));
                    var touchCenter = [
                        touch1['pageX']+(b/2),
                        touch1['pageY']+(a/2)
                    ];

                    if (!isNaN(moveTouchDistance)) {
                        oldScaleFactor = scaleFactor;
                        scaleFactor = Math.min(2,Math.max(0.3, scaleFactor + (Math.floor(((moveTouchDistance*100)-(startTouchDistance*100)))/10000)));

                        var deltaTouchCenter = [                             // Try to pan whilst zooming - not 100%
                            startTouchCenter[0]*(scaleFactor-oldScaleFactor),//-(touchCenter[0]-moveTouchCenter[0]),
                            startTouchCenter[1]*(scaleFactor-oldScaleFactor) //-(touchCenter[1]-moveTouchCenter[1])
                        ];

                        startTouchDistance = moveTouchDistance;
                        moveTouchCenter = touchCenter;

                        $("#chart").scrollLeft(scrollPos[0]+deltaTouchCenter[0]);
                        $("#chart").scrollTop(scrollPos[1]+deltaTouchCenter[1]);
                        redraw();
                    }
                }
        });

    var outer_background = vis.append('svg:rect')
        .attr('width', space_width)
        .attr('height', space_height)
        .attr('fill','#fff');

    //var gridScale = d3.scale.linear().range([0,2000]).domain([0,2000]);
    //var grid = vis.append('g');
    //
    //grid.selectAll("line.horizontal").data(gridScale.ticks(100)).enter()
    //    .append("line")
    //        .attr(
    //        {
    //            "class":"horizontal",
    //            "x1" : 0,
    //            "x2" : 2000,
    //            "y1" : function(d){ return gridScale(d);},
    //            "y2" : function(d){ return gridScale(d);},
    //            "fill" : "none",
    //            "shape-rendering" : "crispEdges",
    //            "stroke" : "#eee",
    //            "stroke-width" : "1px"
    //        });
    //grid.selectAll("line.vertical").data(gridScale.ticks(100)).enter()
    //    .append("line")
    //        .attr(
    //        {
    //            "class":"vertical",
    //            "y1" : 0,
    //            "y2" : 2000,
    //            "x1" : function(d){ return gridScale(d);},
    //            "x2" : function(d){ return gridScale(d);},
    //            "fill" : "none",
    //            "shape-rendering" : "crispEdges",
    //            "stroke" : "#eee",
    //            "stroke-width" : "1px"
    //        });


    var drag_line = vis.append("svg:path").attr("class", "drag_line");

    function updateActiveNodes() {
        var activeWorkspace = RED.workspaces.active();
        
        activeNodes = RED.nodes.filterNodes({z:activeWorkspace});
        
        activeLinks = RED.nodes.filterLinks({
            source:{z:activeWorkspace},
            target:{z:activeWorkspace}
        });
    }

    function init() {
        RED.workspaces.on("change",function(event) {
            var chart = $("#chart");
            if (event.old !== 0) {
                workspaceScrollPositions[event.old] = {
                    left:chart.scrollLeft(),
                    top:chart.scrollTop()
                };
            }
            var scrollStartLeft = chart.scrollLeft();
            var scrollStartTop = chart.scrollTop();
            
            activeSubflow = RED.nodes.subflow(event.workspace);
            if (activeSubflow) {
                $("#workspace-subflow-add-input").toggleClass("disabled",activeSubflow.in.length > 0);
            }
            
            RED.menu.setDisabled("menu-item-workspace-edit", activeSubflow);
            RED.menu.setDisabled("menu-item-workspace-delete",RED.workspaces.count() == 1 || activeSubflow);
            
            if (workspaceScrollPositions[event.workspace]) {
                chart.scrollLeft(workspaceScrollPositions[event.workspace].left);
                chart.scrollTop(workspaceScrollPositions[event.workspace].top);
            } else {
                chart.scrollLeft(0);
                chart.scrollTop(0);
            }
            var scrollDeltaLeft = chart.scrollLeft() - scrollStartLeft;
            var scrollDeltaTop = chart.scrollTop() - scrollStartTop;
            if (mouse_position != null) {
                mouse_position[0] += scrollDeltaLeft;
                mouse_position[1] += scrollDeltaTop;
            }
            clearSelection();
            RED.nodes.eachNode(function(n) {
                n.dirty = true;
            });
            updateSelection();
            updateActiveNodes();
            redraw();
        });
        
        $('#btn-zoom-out').click(function() {zoomOut();});
        $('#btn-zoom-zero').click(function() {zoomZero();});
        $('#btn-zoom-in').click(function() {zoomIn();});
        $("#chart").on('DOMMouseScroll mousewheel', function (evt) {
            if ( evt.altKey ) {
                evt.preventDefault();
                evt.stopPropagation();
                var move = -(evt.originalEvent.detail) || evt.originalEvent.wheelDelta;
                if (move <= 0) { zoomOut(); }
                else { zoomIn(); }
            }
        });
        
        // Handle nodes dragged from the palette
        $("#chart").droppable({
            accept:".palette_node",
            drop: function( event, ui ) {
                d3.event = event;
                var selected_tool = ui.draggable[0].type;
                
                var m = /^subflow:(.+)$/.exec(selected_tool);
                
                if (activeSubflow && m) {
                    var subflowId = m[1];
                    if (subflowId === activeSubflow.id) {
                        RED.notify("<strong>Error</strong>: Cannot add subflow to itself","error");
                        return;
                    }
                    if (RED.nodes.subflowContains(m[1],activeSubflow.id)) {
                        RED.notify("<strong>Error</strong>: Cannot add subflow - circular reference detected","error");
                        return;
                    }
                    
                }
                
                var mousePos = d3.touches(this)[0]||d3.mouse(this);
                mousePos[1] += this.scrollTop;
                mousePos[0] += this.scrollLeft;
                mousePos[1] /= scaleFactor;
                mousePos[0] /= scaleFactor;
                
                var nn = { id:(1+Math.random()*4294967295).toString(16),x: mousePos[0],y:mousePos[1],w:node_width,z:RED.workspaces.active()};
                
                nn.type = selected_tool;
                nn._def = RED.nodes.getType(nn.type);
                
                if (!m) {
                    nn.inputs = nn._def.inputs || 0;
                    nn.outputs = nn._def.outputs;
                    
                    for (var d in nn._def.defaults) {
                        if (nn._def.defaults.hasOwnProperty(d)) {
                            nn[d] = nn._def.defaults[d].value;
                        }
                    }
                    
                    if (nn._def.onadd) {
                        nn._def.onadd.call(nn);
                    }
                } else {
                    var subflow = RED.nodes.subflow(m[1]);
                    nn.inputs = subflow.in.length;
                    nn.outputs = subflow.out.length;
                }
                
                nn.changed = true;
                nn.h = Math.max(node_height,(nn.outputs||0) * 15);
                RED.history.push({t:'add',nodes:[nn.id],dirty:RED.nodes.dirty()});
                RED.nodes.add(nn);
                RED.editor.validateNode(nn);
                RED.nodes.dirty(true);
                // auto select dropped node - so info shows (if visible)
                clearSelection();
                nn.selected = true;
                moving_set.push({n:nn});
                updateActiveNodes();
                updateSelection();
                redraw();
                
                if (nn._def.autoedit) {
                    RED.editor.edit(nn);
                }
            }
        });
        
        RED.keyboard.add(/* z */ 90,{ctrl:true},function(){RED.history.pop();});
        RED.keyboard.add(/* a */ 65,{ctrl:true},function(){selectAll();d3.event.preventDefault();});
        RED.keyboard.add(/* = */ 187,{ctrl:true},function(){zoomIn();d3.event.preventDefault();});
        RED.keyboard.add(/* - */ 189,{ctrl:true},function(){zoomOut();d3.event.preventDefault();});
        RED.keyboard.add(/* 0 */ 48,{ctrl:true},function(){zoomZero();d3.event.preventDefault();});
        RED.keyboard.add(/* v */ 86,{ctrl:true},function(){importNodes(clipboard);d3.event.preventDefault();});

    }

    function canvasMouseDown() {
        if (!mousedown_node && !mousedown_link) {
            selected_link = null;
            updateSelection();
        }
        if (mouse_mode === 0) {
            if (lasso) {
                lasso.remove();
                lasso = null;
            }

            if (!touchStartTime) {
                var point = d3.mouse(this);
                lasso = vis.append('rect')
                    .attr("ox",point[0])
                    .attr("oy",point[1])
                    .attr("rx",2)
                    .attr("ry",2)
                    .attr("x",point[0])
                    .attr("y",point[1])
                    .attr("width",0)
                    .attr("height",0)
                    .attr("class","lasso");
                d3.event.preventDefault();
            }
        }
    }

    function canvasMouseMove() {
        mouse_position = d3.touches(this)[0]||d3.mouse(this);
        // Prevent touch scrolling...
        //if (d3.touches(this)[0]) {
        //    d3.event.preventDefault();
        //}

        // TODO: auto scroll the container
        //var point = d3.mouse(this);
        //if (point[0]-container.scrollLeft < 30 && container.scrollLeft > 0) { container.scrollLeft -= 15; }
        //console.log(d3.mouse(this),container.offsetWidth,container.offsetHeight,container.scrollLeft,container.scrollTop);

        if (lasso) {
            var ox = parseInt(lasso.attr("ox"));
            var oy = parseInt(lasso.attr("oy"));
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var w;
            var h;
            if (mouse_position[0] < ox) {
                x = mouse_position[0];
                w = ox-x;
            } else {
                w = mouse_position[0]-x;
            }
            if (mouse_position[1] < oy) {
                y = mouse_position[1];
                h = oy-y;
            } else {
                h = mouse_position[1]-y;
            }
            lasso
                .attr("x",x)
                .attr("y",y)
                .attr("width",w)
                .attr("height",h)
            ;
            return;
        }

        if (mouse_mode != RED.state.IMPORT_DRAGGING && !mousedown_node && selected_link == null) {
            return;
        }

        var mousePos;
        if (mouse_mode == RED.state.JOINING) {
            // update drag line
            drag_line.attr("class", "drag_line");
            mousePos = mouse_position;
            var numOutputs = (mousedown_port_type === 0)?(mousedown_node.outputs || 1):1;
            var sourcePort = mousedown_port_index;
            var portY = -((numOutputs-1)/2)*13 +13*sourcePort;

            var sc = (mousedown_port_type === 0)?1:-1;

            var dy = mousePos[1]-(mousedown_node.y+portY);
            var dx = mousePos[0]-(mousedown_node.x+sc*mousedown_node.w/2);
            var delta = Math.sqrt(dy*dy+dx*dx);
            var scale = lineCurveScale;
            var scaleY = 0;

            if (delta < node_width) {
                scale = 0.75-0.75*((node_width-delta)/node_width);
            }
            if (dx*sc < 0) {
                scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                if (Math.abs(dy) < 3*node_height) {
                    scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                }
            }

            drag_line.attr("d",
                "M "+(mousedown_node.x+sc*mousedown_node.w/2)+" "+(mousedown_node.y+portY)+
                " C "+(mousedown_node.x+sc*(mousedown_node.w/2+node_width*scale))+" "+(mousedown_node.y+portY+scaleY*node_height)+" "+
                (mousePos[0]-sc*(scale)*node_width)+" "+(mousePos[1]-scaleY*node_height)+" "+
                mousePos[0]+" "+mousePos[1]
                );
            d3.event.preventDefault();
        } else if (mouse_mode == RED.state.MOVING) {
            mousePos = d3.mouse(document.body);
            if (isNaN(mousePos[0])) {
                mousePos = d3.touches(document.body)[0];
            }
            var d = (mouse_offset[0]-mousePos[0])*(mouse_offset[0]-mousePos[0]) + (mouse_offset[1]-mousePos[1])*(mouse_offset[1]-mousePos[1]);
            if (d > 3) {
                mouse_mode = RED.state.MOVING_ACTIVE;
                clickElapsed = 0;
            }
        } else if (mouse_mode == RED.state.MOVING_ACTIVE || mouse_mode == RED.state.IMPORT_DRAGGING) {
            mousePos = mouse_position;
            var node;
            var i;
            var minX = 0;
            var minY = 0;
            for (var n = 0; n<moving_set.length; n++) {
                node = moving_set[n];
                if (d3.event.shiftKey) {
                    node.n.ox = node.n.x;
                    node.n.oy = node.n.y;
                }
                node.n.x = mousePos[0]+node.dx;
                node.n.y = mousePos[1]+node.dy;
                node.n.dirty = true;
                minX = Math.min(node.n.x-node.n.w/2-5,minX);
                minY = Math.min(node.n.y-node.n.h/2-5,minY);
            }
            if (minX !== 0 || minY !== 0) {
                for (i = 0; i<moving_set.length; i++) {
                    node = moving_set[i];
                    node.n.x -= minX;
                    node.n.y -= minY;
                }
            }
            if (d3.event.shiftKey && moving_set.length > 0) {
                var gridOffset =  [0,0];
                node = moving_set[0];
                gridOffset[0] = node.n.x-(20*Math.floor((node.n.x-node.n.w/2)/20)+node.n.w/2);
                gridOffset[1] = node.n.y-(20*Math.floor(node.n.y/20));
                if (gridOffset[0] !== 0 || gridOffset[1] !== 0) {
                    for (i = 0; i<moving_set.length; i++) {
                        node = moving_set[i];
                        node.n.x -= gridOffset[0];
                        node.n.y -= gridOffset[1];
                        if (node.n.x == node.n.ox && node.n.y == node.n.oy) {
                            node.dirty = false;
                        }
                    }
                }
            }
        }
        if (mouse_mode !== 0) {
            redraw();
        }
    }

    function canvasMouseUp() {
        if (mousedown_node && mouse_mode == RED.state.JOINING) {
            drag_line.attr("class", "drag_line_hidden");
        }
        if (lasso) {
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var x2 = x+parseInt(lasso.attr("width"));
            var y2 = y+parseInt(lasso.attr("height"));
            if (!d3.event.ctrlKey) {
                clearSelection();
            }
            RED.nodes.eachNode(function(n) {
                if (n.z == RED.workspaces.active() && !n.selected) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                }
            });
            if (activeSubflow) {
                activeSubflow.in.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
                activeSubflow.out.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
            }
            updateSelection();
            lasso.remove();
            lasso = null;
        } else if (mouse_mode == RED.state.DEFAULT && mousedown_link == null && !d3.event.ctrlKey ) {
            clearSelection();
            updateSelection();
        }
        if (mouse_mode == RED.state.MOVING_ACTIVE) {
            if (moving_set.length > 0) {
                var ns = [];
                for (var j=0;j<moving_set.length;j++) {
                    ns.push({n:moving_set[j].n,ox:moving_set[j].ox,oy:moving_set[j].oy});
                }
                RED.history.push({t:'move',nodes:ns,dirty:RED.nodes.dirty()});
            }
        }
        if (mouse_mode == RED.state.MOVING || mouse_mode == RED.state.MOVING_ACTIVE) {
            for (var i=0;i<moving_set.length;i++) {
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
        }
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove(/* ESCAPE */ 27);
            updateActiveNodes();
            RED.nodes.dirty(true);
        }
        resetMouseVars();
        redraw();
    }

    function zoomIn() {
        if (scaleFactor < 2) {
            scaleFactor += 0.1;
            redraw();
        }
    }
    function zoomOut() {
        if (scaleFactor > 0.3) {
            scaleFactor -= 0.1;
            redraw();
        }
    }
    function zoomZero() {
        scaleFactor = 1;
        redraw();
    }

    function selectAll() {
        RED.nodes.eachNode(function(n) {
            if (n.z == RED.workspaces.active()) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            }
        });
        if (activeSubflow) {
            activeSubflow.in.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
            activeSubflow.out.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
        }
        
        selected_link = null;
        updateSelection();
        redraw();
    }

    function clearSelection() {
        for (var i=0;i<moving_set.length;i++) {
            var n = moving_set[i];
            n.n.dirty = true;
            n.n.selected = false;
        }
        moving_set = [];
        selected_link = null;
    }

    function updateSelection() {
        if (moving_set.length === 0 && selected_link == null) {
            RED.keyboard.remove(/* backspace */ 8);
            RED.keyboard.remove(/* delete */ 46);
            RED.keyboard.remove(/* c */ 67);
            RED.keyboard.remove(/* x */ 88);
        } else {
            RED.keyboard.add(/* backspace */ 8,function(){deleteSelection();d3.event.preventDefault();});
            RED.keyboard.add(/* delete */ 46,function(){deleteSelection();d3.event.preventDefault();});
            RED.keyboard.add(/* c */ 67,{ctrl:true},function(){copySelection();d3.event.preventDefault();});
            RED.keyboard.add(/* x */ 88,{ctrl:true},function(){copySelection();deleteSelection();d3.event.preventDefault();});
        }
        if (moving_set.length === 0) {
            RED.keyboard.remove(/* up   */ 38);
            RED.keyboard.remove(/* down */ 40);
            RED.keyboard.remove(/* left */ 37);
            RED.keyboard.remove(/* right*/ 39);
        } else {
            RED.keyboard.add(/* up   */ 38, function() { if(d3.event.shiftKey){moveSelection(  0,-20)}else{moveSelection( 0,-1);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* down */ 40, function() { if(d3.event.shiftKey){moveSelection(  0, 20)}else{moveSelection( 0, 1);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* left */ 37, function() { if(d3.event.shiftKey){moveSelection(-20,  0)}else{moveSelection(-1, 0);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* right*/ 39, function() { if(d3.event.shiftKey){moveSelection( 20,  0)}else{moveSelection( 1, 0);}d3.event.preventDefault();},endKeyboardMove);
        }

        var selection = {};
        
        if (moving_set.length > 0) {
            selection.nodes = moving_set.map(function(n) { return n.n;});
        }
        if (selected_link != null) {
            selection.link = selected_link;
        }
        
        eventHandler.emit("selection-changed",selection);
    }
    
    function endKeyboardMove() {
        var ns = [];
        for (var i=0;i<moving_set.length;i++) {
            ns.push({n:moving_set[i].n,ox:moving_set[i].ox,oy:moving_set[i].oy});
            delete moving_set[i].ox;
            delete moving_set[i].oy;
        }
        RED.history.push({t:'move',nodes:ns,dirty:RED.nodes.dirty()});
    }
    function moveSelection(dx,dy) {
        var minX = 0;
        var minY = 0;
        var node;

        for (var i=0;i<moving_set.length;i++) {
            node = moving_set[i];
            if (node.ox == null && node.oy == null) {
                node.ox = node.n.x;
                node.oy = node.n.y;
            }
            node.n.x += dx;
            node.n.y += dy;
            node.n.dirty = true;
            minX = Math.min(node.n.x-node.n.w/2-5,minX);
            minY = Math.min(node.n.y-node.n.h/2-5,minY);
        }

        if (minX !== 0 || minY !== 0) {
            for (var n = 0; n<moving_set.length; n++) {
                node = moving_set[n];
                node.n.x -= minX;
                node.n.y -= minY;
            }
        }

        redraw();
    }
    function deleteSelection() {
        var removedNodes = [];
        var removedLinks = [];
        var removedSubflowOutputs = [];
        var removedSubflowInputs = [];
        
        var startDirty = RED.nodes.dirty();
        if (moving_set.length > 0) {
            for (var i=0;i<moving_set.length;i++) {
                var node = moving_set[i].n;
                node.selected = false;
                if (node.type != "subflow") {
                    if (node.x < 0) {
                        node.x = 25
                    }
                    var rmlinks = RED.nodes.remove(node.id);
                    removedNodes.push(node);
                    removedLinks = removedLinks.concat(rmlinks);
                } else {
                    if (node.direction === "out") {
                        removedSubflowOutputs.push(node);
                    } else if (node.direction === "in") {
                        removedSubflowInputs.push(node);
                    }
                    node.dirty = true;
                }
            }
            if (removedSubflowOutputs.length > 0) {
                removedSubflowOutputs.sort(function(a,b) { return b.i-a.i});
                for (i=0;i<removedSubflowOutputs.length;i++) {
                    var output = removedSubflowOutputs[i];
                    activeSubflow.out.splice(output.i,1);
                    var subflowRemovedLinks = [];
                    var subflowMovedLinks = [];
                    RED.nodes.eachLink(function(l) {
                        if (l.target.type == "subflow" && l.target.z == activeSubflow.id && l.target.i == output.i) {
                            subflowRemovedLinks.push(l);
                        }
                        if (l.source.type == "subflow:"+activeSubflow.id) {
                            if (l.sourcePort == output.i) {
                                subflowRemovedLinks.push(l);
                            } else if (l.sourcePort > output.i) {
                                subflowMovedLinks.push(l);
                            }
                        }
                    });
                    subflowRemovedLinks.forEach(function(l) { RED.nodes.removeLink(l)});
                    subflowMovedLinks.forEach(function(l) { l.sourcePort--; });
    
                    removedLinks = removedLinks.concat(subflowRemovedLinks);
                    for (var j=output.i;j<activeSubflow.out.length;j++) {
                        activeSubflow.out[j].i--;
                        activeSubflow.out[j].dirty = true;
                    }
                }
            }
            // Assume 0/1 inputs
            if (removedSubflowInputs.length == 1) {
                var input = removedSubflowInputs[0];
                var subflowRemovedInputLinks = [];
                RED.nodes.eachLink(function(l) {
                    if (l.source.type == "subflow" && l.source.z == activeSubflow.id && l.source.i == input.i) {
                        subflowRemovedInputLinks.push(l);
                    } else if (l.target.type == "subflow:"+activeSubflow.id) {
                        subflowRemovedInputLinks.push(l);
                    }
                });
                subflowRemovedInputLinks.forEach(function(l) { RED.nodes.removeLink(l)});
                removedLinks = removedLinks.concat(subflowRemovedInputLinks);
                activeSubflow.in = [];
                $("#workspace-subflow-add-input").toggleClass("disabled",false);
            }
            
            if (activeSubflow) {
                RED.nodes.filterNodes({type:"subflow:"+activeSubflow.id}).forEach(function(n) {
                    n.changed = true;
                    n.inputs = activeSubflow.in.length;
                    n.outputs = activeSubflow.out.length;
                    while (n.outputs < n.ports.length) {
                        n.ports.pop();
                    }
                    n.resize = true;
                    n.dirty = true;
                });
                RED.editor.validateNode(activeSubflow);
            }
            
            moving_set = [];
            if (removedNodes.length > 0 || removedSubflowOutputs.length > 0 || removedSubflowInputs.length > 0) {
                RED.nodes.dirty(true);
            }
        }
        if (selected_link) {
            RED.nodes.removeLink(selected_link);
            removedLinks.push(selected_link);
            RED.nodes.dirty(true);
        }
        RED.history.push({t:'delete',nodes:removedNodes,links:removedLinks,subflowOutputs:removedSubflowOutputs,subflowInputs:removedSubflowInputs,dirty:startDirty});

        selected_link = null;
        updateActiveNodes();
        updateSelection();
        redraw();
    }

    function copySelection() {
        if (moving_set.length > 0) {
            var nns = [];
            for (var n=0;n<moving_set.length;n++) {
                var node = moving_set[n].n;
                if (node.type != "subflow") {
                    nns.push(RED.nodes.convertNode(node));
                }
            }
            clipboard = JSON.stringify(nns);
            RED.notify(nns.length+" node"+(nns.length>1?"s":"")+" copied");
        }
    }


    function calculateTextWidth(str, className, offset) {
        var sp = document.createElement("span");
        sp.className = className;
        sp.style.position = "absolute";
        sp.style.top = "-1000px";
        sp.innerHTML = (str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        document.body.appendChild(sp);
        var w = sp.offsetWidth;
        document.body.removeChild(sp);
        return offset+w;
    }

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
        mouse_mode = 0;
        mousedown_port_type = 0;
    }

    function portMouseDown(d,portType,portIndex) {
        //console.log(d,portType,portIndex);
        // disable zoom
        //vis.call(d3.behavior.zoom().on("zoom"), null);
        mousedown_node = d;
        selected_link = null;
        mouse_mode = RED.state.JOINING;
        mousedown_port_type = portType;
        mousedown_port_index = portIndex || 0;
        document.body.style.cursor = "crosshair";
        d3.event.preventDefault();
    }

    function portMouseUp(d,portType,portIndex) {
        document.body.style.cursor = "";
        if (mouse_mode == RED.state.JOINING && mousedown_node) {
            if (typeof TouchEvent != "undefined" && d3.event instanceof TouchEvent) {
                RED.nodes.eachNode(function(n) {
                        if (n.z == RED.workspaces.active()) {
                            var hw = n.w/2;
                            var hh = n.h/2;
                            if (n.x-hw<mouse_position[0] && n.x+hw> mouse_position[0] &&
                                n.y-hh<mouse_position[1] && n.y+hh>mouse_position[1]) {
                                    mouseup_node = n;
                                    portType = mouseup_node.inputs>0?1:0;
                                    portIndex = 0;
                            }
                        }
                });
            } else {
                mouseup_node = d;
            }
            if (portType == mousedown_port_type || mouseup_node === mousedown_node) {
                drag_line.attr("class", "drag_line_hidden");
                resetMouseVars();
                return;
            }
            var src,dst,src_port;
            if (mousedown_port_type === 0) {
                src = mousedown_node;
                src_port = mousedown_port_index;
                dst = mouseup_node;
            } else if (mousedown_port_type == 1) {
                src = mouseup_node;
                dst = mousedown_node;
                src_port = portIndex;
            }
            var existingLink = RED.nodes.filterLinks({source:src,target:dst,sourcePort: src_port}).length !== 0;
            if (!existingLink) {
                var link = {source: src, sourcePort:src_port, target: dst};
                RED.nodes.addLink(link);
                RED.history.push({t:'add',links:[link],dirty:RED.nodes.dirty()});
                updateActiveNodes();
                RED.nodes.dirty(true);
            } else {
            }
            selected_link = null;
            redraw();
        }
    }

    function nodeMouseUp(d) {
        if (dblClickPrimed && mousedown_node == d && clickElapsed > 0 && clickElapsed < 750) {
            mouse_mode = RED.state.DEFAULT;
            if (d.type != "subflow") {
                RED.editor.edit(d);
            } else {
                RED.editor.editSubflow(activeSubflow);
            }
            clickElapsed = 0;
            d3.event.stopPropagation();
            return;
        }
        var direction = d._def? (d.inputs > 0 ? 1: 0) : (d.direction == "in" ? 0: 1)
        portMouseUp(d, direction, 0);
    }

    function nodeMouseDown(d) {
        focusView();
        //var touch0 = d3.event;
        //var pos = [touch0.pageX,touch0.pageY];
        //RED.touch.radialMenu.show(d3.select(this),pos);
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove(/* ESCAPE */ 27);
            updateSelection();
            RED.nodes.dirty(true);
            redraw();
            resetMouseVars();
            d3.event.stopPropagation();
            return;
        }
        mousedown_node = d;
        var now = Date.now();
        clickElapsed = now-clickTime;
        clickTime = now;

        dblClickPrimed = (lastClickNode == mousedown_node);
        lastClickNode = mousedown_node;

        var i;

        if (d.selected && d3.event.ctrlKey) {
            d.selected = false;
            for (i=0;i<moving_set.length;i+=1) {
                if (moving_set[i].n === d) {
                    moving_set.splice(i,1);
                    break;
                }
            }
        } else {
            if (d3.event.shiftKey) {
                clearSelection();
                var cnodes = RED.nodes.getAllFlowNodes(mousedown_node);
                for (var n=0;n<cnodes.length;n++) {
                    cnodes[n].selected = true;
                    cnodes[n].dirty = true;
                    moving_set.push({n:cnodes[n]});
                }
            } else if (!d.selected) {
                if (!d3.event.ctrlKey) {
                    clearSelection();
                }
                mousedown_node.selected = true;
                moving_set.push({n:mousedown_node});
            }
            selected_link = null;
            if (d3.event.button != 2) {
                mouse_mode = RED.state.MOVING;
                var mouse = d3.touches(this)[0]||d3.mouse(this);
                mouse[0] += d.x-d.w/2;
                mouse[1] += d.y-d.h/2;
                for (i=0;i<moving_set.length;i++) {
                    moving_set[i].ox = moving_set[i].n.x;
                    moving_set[i].oy = moving_set[i].n.y;
                    moving_set[i].dx = moving_set[i].n.x-mouse[0];
                    moving_set[i].dy = moving_set[i].n.y-mouse[1];
                }
                mouse_offset = d3.mouse(document.body);
                if (isNaN(mouse_offset[0])) {
                    mouse_offset = d3.touches(document.body)[0];
                }
            }
        }
        d.dirty = true;
        updateSelection();
        redraw();
        d3.event.stopPropagation();
    }

    function nodeButtonClicked(d) {
        if (!activeSubflow && !d.changed) {
            if (d._def.button.toggle) {
                d[d._def.button.toggle] = !d[d._def.button.toggle];
                d.dirty = true;
            }
            if (d._def.button.onclick) {
                d._def.button.onclick.call(d);
            }
            if (d.dirty) {
                redraw();
            }
        } else if (d.changed) {
            RED.notify("<strong>Warning</strong>: node has undeployed changes","warning");
        } else {
            RED.notify("<strong>Warning</strong>: node actions disabled within subflow","warning");
        }
        d3.event.preventDefault();
    }

    function showTouchMenu(obj,pos) {
        var mdn = mousedown_node;
        var options = [];
        options.push({name:"delete",disabled:(moving_set.length===0),onselect:function() {deleteSelection();}});
        options.push({name:"cut",disabled:(moving_set.length===0),onselect:function() {copySelection();deleteSelection();}});
        options.push({name:"copy",disabled:(moving_set.length===0),onselect:function() {copySelection();}});
        options.push({name:"paste",disabled:(clipboard.length===0),onselect:function() {importNodes(clipboard,true);}});
        options.push({name:"edit",disabled:(moving_set.length != 1),onselect:function() { RED.editor.edit(mdn);}});
        options.push({name:"select",onselect:function() {selectAll();}});
        options.push({name:"undo",disabled:(RED.history.depth() === 0),onselect:function() {RED.history.pop();}});

        RED.touch.radialMenu.show(obj,pos,options);
        resetMouseVars();
    }
    function redraw() {
        vis.attr("transform","scale("+scaleFactor+")");
        outer.attr("width", space_width*scaleFactor).attr("height", space_height*scaleFactor);

        // Don't bother redrawing nodes if we're drawing links
        if (mouse_mode != RED.state.JOINING) {
            
            var dirtyNodes = {};
            
            if (activeSubflow) {
                var subflowOutputs = vis.selectAll(".subflowoutput").data(activeSubflow.out,function(d,i){ return d.id;});
                subflowOutputs.exit().remove();
                var outGroup = subflowOutputs.enter().insert("svg:g").attr("class","node subflowoutput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                outGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                outGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY 
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)       
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });
                    
                outGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10).attr("x",-5).attr("y",15)
                    .on("mousedown", function(d,i){portMouseDown(d,1,0);} )
                    .on("touchstart", function(d,i){portMouseDown(d,1,0);} )
                    .on("mouseup", function(d,i){portMouseUp(d,1,0);})
                    .on("touchend",function(d,i){portMouseUp(d,1,0);} )
                    .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                    .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});

                outGroup.append("svg:text").attr('class','port_label').attr('x',20).attr('y',8).style("font-size","10px").text("output");
                outGroup.append("svg:text").attr('class','port_label port_index').attr('x',20).attr('y',24).text(function(d,i){ return i+1});

                var subflowInputs = vis.selectAll(".subflowinput").data(activeSubflow.in,function(d,i){ return d.id;});
                subflowInputs.exit().remove();
                var inGroup = subflowInputs.enter().insert("svg:g").attr("class","node subflowinput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                inGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                inGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY 
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)       
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });
                    
                inGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10).attr("x",35).attr("y",15)
                    .on("mousedown", function(d,i){portMouseDown(d,0,i);} )
                    .on("touchstart", function(d,i){portMouseDown(d,0,i);} )
                    .on("mouseup", function(d,i){portMouseUp(d,0,i);})
                    .on("touchend",function(d,i){portMouseUp(d,0,i);} )
                    .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                    .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});
                inGroup.append("svg:text").attr('class','port_label').attr('x',18).attr('y',20).style("font-size","10px").text("input");
                
                
                
                subflowOutputs.each(function(d,i) {
                    if (d.dirty) {
                        var output = d3.select(this);
                        output.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        output.selectAll(".port_index").text(function(d){ return d.i+1});
                        output.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        dirtyNodes[d.id] = d;
                        d.dirty = false;
                    }
                });
                subflowInputs.each(function(d,i) {
                    if (d.dirty) {
                        var input = d3.select(this);
                        input.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        input.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        dirtyNodes[d.id] = d;
                        d.dirty = false;
                    }
                });
            } else {
                vis.selectAll(".subflowoutput").remove();
                vis.selectAll(".subflowinput").remove();
            }
            
            var node = vis.selectAll(".nodegroup").data(activeNodes,function(d){return d.id});
            node.exit().remove();

            var nodeEnter = node.enter().insert("svg:g").attr("class", "node nodegroup");
            nodeEnter.each(function(d,i) {
                    var node = d3.select(this);
                    node.attr("id",d.id);
                    var l = d._def.label;
                    l = (typeof l === "function" ? l.call(d) : l)||"";
                    d.w = Math.max(node_width,calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                    d.h = Math.max(node_height,(d.outputs||0) * 15);

                    if (d._def.badge) {
                        var badge = node.append("svg:g").attr("class","node_badge_group");
                        var badgeRect = badge.append("rect").attr("class","node_badge").attr("rx",5).attr("ry",5).attr("width",40).attr("height",15);
                        badge.append("svg:text").attr("class","node_badge_label").attr("x",35).attr("y",11).attr('text-anchor','end').text(d._def.badge());
                        if (d._def.onbadgeclick) {
                            badgeRect.attr("cursor","pointer")
                                .on("click",function(d) { d._def.onbadgeclick.call(d);d3.event.preventDefault();});
                        }
                    }

                    if (d._def.button) {
                        var nodeButtonGroup = node.append('svg:g')
                            .attr("transform",function(d) { return "translate("+((d._def.align == "right") ? 94 : -25)+",2)"; })
                            .attr("class",function(d) { return "node_button "+((d._def.align == "right") ? "node_right_button" : "node_left_button"); });
                        nodeButtonGroup.append('rect')
                            .attr("rx",8)
                            .attr("ry",8)
                            .attr("width",32)
                            .attr("height",node_height-4)
                            .attr("fill","#eee");//function(d) { return d._def.color;})
                        nodeButtonGroup.append('rect')
                            .attr("class","node_button_button")
                            .attr("x",function(d) { return d._def.align == "right"? 10:5})
                            .attr("y",4)
                            .attr("rx",5)
                            .attr("ry",5)
                            .attr("width",16)
                            .attr("height",node_height-12)
                            .attr("fill",function(d) { return d._def.color;})
                            .attr("cursor","pointer")
                            .on("mousedown",function(d) {if (!lasso && !d.changed) {focusView();d3.select(this).attr("fill-opacity",0.2);d3.event.preventDefault(); d3.event.stopPropagation();}})
                            .on("mouseup",function(d) {if (!lasso && !d.changed) { d3.select(this).attr("fill-opacity",0.4);d3.event.preventDefault();d3.event.stopPropagation();}})
                            .on("mouseover",function(d) {if (!lasso && !d.changed) { d3.select(this).attr("fill-opacity",0.4);}})
                            .on("mouseout",function(d) {if (!lasso  && !d.changed) {
                                var op = 1;
                                if (d._def.button.toggle) {
                                    op = d[d._def.button.toggle]?1:0.2;
                                }
                                d3.select(this).attr("fill-opacity",op);
                            }})
                            .on("click",nodeButtonClicked)
                            .on("touchstart",nodeButtonClicked)
                    }

                    var mainRect = node.append("rect")
                        .attr("class", "node")
                        .classed("node_unknown",function(d) { return d.type == "unknown"; })
                        .attr("rx", 6)
                        .attr("ry", 6)
                        .attr("fill",function(d) { return d._def.color;})
                        .on("mouseup",nodeMouseUp)
                        .on("mousedown",nodeMouseDown)
                        .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)
                        })
                        .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                        })
                        .on("mouseover",function(d) {
                                if (mouse_mode === 0) {
                                    var node = d3.select(this);
                                    node.classed("node_hovered",true);
                                }
                        })
                        .on("mouseout",function(d) {
                                var node = d3.select(this);
                                node.classed("node_hovered",false);
                        });

                   //node.append("rect").attr("class", "node-gradient-top").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-top)").style("pointer-events","none");
                   //node.append("rect").attr("class", "node-gradient-bottom").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-bottom)").style("pointer-events","none");

                    if (d._def.icon) {

                        var icon_group = node.append("g")
                            .attr("class","node_icon_group")
                            .attr("x",0).attr("y",0);

                        var icon_shade = icon_group.append("rect")
                            .attr("x",0).attr("y",0)
                            .attr("class","node_icon_shade")
                            .attr("width","30")
                            .attr("stroke","none")
                            .attr("fill","#000")
                            .attr("fill-opacity","0.05")
                            .attr("height",function(d){return Math.min(50,d.h-4);});

                        var icon = icon_group.append("image")
                            .attr("xlink:href","icons/"+d._def.icon)
                            .attr("class","node_icon")
                            .attr("x",0)
                            .attr("width","30")
                            .attr("height","30");

                        var icon_shade_border = icon_group.append("path")
                            .attr("d",function(d) { return "M 30 1 l 0 "+(d.h-2)})
                            .attr("class","node_icon_shade_border")
                            .attr("stroke-opacity","0.1")
                            .attr("stroke","#000")
                            .attr("stroke-width","2");

                        if ("right" == d._def.align) {
                            icon_group.attr('class','node_icon_group node_icon_group_'+d._def.align);
                            icon_shade_border.attr("d",function(d) { return "M 0 1 l 0 "+(d.h-2)})
                            //icon.attr('class','node_icon node_icon_'+d._def.align);
                            //icon.attr('class','node_icon_shade node_icon_shade_'+d._def.align);
                            //icon.attr('class','node_icon_shade_border node_icon_shade_border_'+d._def.align);
                        }
                        
                        //if (d.inputs > 0 && d._def.align == null) {
                        //    icon_shade.attr("width",35);
                        //    icon.attr("transform","translate(5,0)");
                        //    icon_shade_border.attr("transform","translate(5,0)");
                        //}
                        //if (d._def.outputs > 0 && "right" == d._def.align) {
                        //    icon_shade.attr("width",35); //icon.attr("x",5);
                        //}

                        var img = new Image();
                        img.src = "icons/"+d._def.icon;
                        img.onload = function() {
                            icon.attr("width",Math.min(img.width,30));
                            icon.attr("height",Math.min(img.height,30));
                            icon.attr("x",15-Math.min(img.width,30)/2);
                            //if ("right" == d._def.align) {
                            //    icon.attr("x",function(d){return d.w-img.width-1-(d.outputs>0?5:0);});
                            //    icon_shade.attr("x",function(d){return d.w-30});
                            //    icon_shade_border.attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                            //}
                        }

                        //icon.style("pointer-events","none");
                        icon_group.style("pointer-events","none");
                    }
                    var text = node.append('svg:text').attr('class','node_label').attr('x', 38).attr('dy', '.35em').attr('text-anchor','start');
                    if (d._def.align) {
                        text.attr('class','node_label node_label_'+d._def.align);
                        text.attr('text-anchor','end');
                    }

                    var status = node.append("svg:g").attr("class","node_status_group").style("display","none");

                    var statusRect = status.append("rect").attr("class","node_status")
                                        .attr("x",6).attr("y",1).attr("width",9).attr("height",9)
                                        .attr("rx",2).attr("ry",2).attr("stroke-width","3");

                    var statusLabel = status.append("svg:text")
                        .attr("class","node_status_label")
                        .attr('x',20).attr('y',9)
                        .style({
                                'stroke-width': 0,
                                'fill': '#888',
                                'font-size':'9pt',
                                'stroke':'#000',
                                'text-anchor':'start'
                        });

                    //node.append("circle").attr({"class":"centerDot","cx":0,"cy":0,"r":5});

                    //node.append("path").attr("class","node_error").attr("d","M 3,-3 l 10,0 l -5,-8 z");
                    node.append("image").attr("class","node_error hidden").attr("xlink:href","icons/node-error.png").attr("x",0).attr("y",-6).attr("width",10).attr("height",9);
                    node.append("image").attr("class","node_changed hidden").attr("xlink:href","icons/node-changed.png").attr("x",12).attr("y",-6).attr("width",10).attr("height",10);
            });

            node.each(function(d,i) {
                    if (d.dirty) {
                        dirtyNodes[d.id] = d;
                        //if (d.x < -50) deleteSelection();  // Delete nodes if dragged back to palette
                        if (d.resize) {
                            var l = d._def.label;
                            l = (typeof l === "function" ? l.call(d) : l)||"";
                            d.w = Math.max(node_width,calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                            d.h = Math.max(node_height,(d.outputs||0) * 15);
                            d.resize = false;
                        }
                        var thisNode = d3.select(this);
                        //thisNode.selectAll(".centerDot").attr({"cx":function(d) { return d.w/2;},"cy":function(d){return d.h/2}});
                        thisNode.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        
                        if (mouse_mode != RED.state.MOVING_ACTIVE) {
                            thisNode.selectAll(".node")
                                .attr("width",function(d){return d.w})
                                .attr("height",function(d){return d.h})
                                .classed("node_selected",function(d) { return d.selected; })
                                .classed("node_highlighted",function(d) { return d.highlighted; })
                            ;
                            //thisNode.selectAll(".node-gradient-top").attr("width",function(d){return d.w});
                            //thisNode.selectAll(".node-gradient-bottom").attr("width",function(d){return d.w}).attr("y",function(d){return d.h-30});
    
                            thisNode.selectAll(".node_icon_group_right").attr('transform', function(d){return "translate("+(d.w-30)+",0)"});
                            thisNode.selectAll(".node_label_right").attr('x', function(d){return d.w-38});
                            //thisNode.selectAll(".node_icon_right").attr("x",function(d){return d.w-d3.select(this).attr("width")-1-(d.outputs>0?5:0);});
                            //thisNode.selectAll(".node_icon_shade_right").attr("x",function(d){return d.w-30;});
                            //thisNode.selectAll(".node_icon_shade_border_right").attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2)});
    
                            var inputPorts = thisNode.selectAll(".port_input");
                            if (d.inputs === 0 && !inputPorts.empty()) {
                                inputPorts.remove();
                                //nodeLabel.attr("x",30);
                            } else if (d.inputs === 1 && inputPorts.empty()) {
                                var inputGroup = thisNode.append("g").attr("class","port_input");
                                inputGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                                    .on("mousedown",function(d){portMouseDown(d,1,0);})
                                    .on("touchstart",function(d){portMouseDown(d,1,0);})
                                    .on("mouseup",function(d){portMouseUp(d,1,0);} )
                                    .on("touchend",function(d){portMouseUp(d,1,0);} )
                                    .on("mouseover",function(d) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type != 1 ));})
                                    .on("mouseout",function(d) { var port = d3.select(this); port.classed("port_hovered",false);})
                            }
                            
                            var numOutputs = d.outputs;
                            var y = (d.h/2)-((numOutputs-1)/2)*13;
                            d.ports = d.ports || d3.range(numOutputs);
                            d._ports = thisNode.selectAll(".port_output").data(d.ports);
                            var output_group = d._ports.enter().append("g").attr("class","port_output");
                            
                            output_group.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                                .on("mousedown",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
                                .on("touchstart",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
                                .on("mouseup",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
                                .on("touchend",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
                                .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                                .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});
                                
                            d._ports.exit().remove();
                            if (d._ports) {
                                numOutputs = d.outputs || 1;
                                y = (d.h/2)-((numOutputs-1)/2)*13;
                                var x = d.w - 5;
                                d._ports.each(function(d,i) {
                                        var port = d3.select(this);
                                        //port.attr("y",(y+13*i)-5).attr("x",x);
                                        port.attr("transform", function(d) { return "translate("+x+","+((y+13*i)-5)+")";});
                                });
                            }
                            thisNode.selectAll('text.node_label').text(function(d,i){
                                    if (d._def.label) {
                                        if (typeof d._def.label == "function") {
                                            return d._def.label.call(d);
                                        } else {
                                            return d._def.label;
                                        }
                                    }
                                    return "";
                                })
                                .attr('y', function(d){return (d.h/2)-1;})
                                .attr('class',function(d){
                                    return 'node_label'+
                                    (d._def.align?' node_label_'+d._def.align:'')+
                                    (d._def.labelStyle?' '+(typeof d._def.labelStyle == "function" ? d._def.labelStyle.call(d):d._def.labelStyle):'') ;
                            });
                            
                            if (d._def.icon) {
                                icon = thisNode.select(".node_icon");
                                var current_url = icon.attr("xlink:href");
                                var icon_url;
                                if (typeof d._def.icon == "function") {
                                    icon_url = d._def.icon.call(d);
                                } else {
                                    icon_url = d._def.icon;
                                }
                                if ("icons/"+icon_url != current_url) {
                                    icon.attr("xlink:href","icons/"+icon_url);
                                    var img = new Image();
                                    img.src = "icons/"+d._def.icon;
                                    img.onload = function() {
                                        icon.attr("width",Math.min(img.width,30));
                                        icon.attr("height",Math.min(img.height,30));
                                        icon.attr("x",15-Math.min(img.width,30)/2);
                                    }
                                }
                            }
                                
                                
                            thisNode.selectAll(".node_tools").attr("x",function(d){return d.w-35;}).attr("y",function(d){return d.h-20;});
    
                            thisNode.selectAll(".node_changed")
                                .attr("x",function(d){return d.w-10})
                                .classed("hidden",function(d) { return !d.changed; });
    
                            thisNode.selectAll(".node_error")
                                .attr("x",function(d){return d.w-10-(d.changed?13:0)})
                                .classed("hidden",function(d) { return d.valid; });
    
                            thisNode.selectAll(".port_input").each(function(d,i) {
                                    var port = d3.select(this);
                                    port.attr("transform",function(d){return "translate(-5,"+((d.h/2)-5)+")";})
                            });
    
                            thisNode.selectAll(".node_icon").attr("y",function(d){return (d.h-d3.select(this).attr("height"))/2;});
                            thisNode.selectAll(".node_icon_shade").attr("height",function(d){return d.h;});
                            thisNode.selectAll(".node_icon_shade_border").attr("d",function(d){ return "M "+(("right" == d._def.align) ?0:30)+" 1 l 0 "+(d.h-2)});
    
                            thisNode.selectAll('.node_button').attr("opacity",function(d) {
                                return (activeSubflow||d.changed)?0.4:1
                            });
                            thisNode.selectAll('.node_button_button').attr("cursor",function(d) {
                                return (activeSubflow||d.changed)?"":"pointer";
                            });
                            thisNode.selectAll('.node_right_button').attr("transform",function(d){
                                    var x = d.w-6;
                                    if (d._def.button.toggle && !d[d._def.button.toggle]) {
                                        x = x - 8;
                                    }
                                    return "translate("+x+",2)";
                            });
                            thisNode.selectAll('.node_right_button rect').attr("fill-opacity",function(d){
                                    if (d._def.button.toggle) {
                                        return d[d._def.button.toggle]?1:0.2;
                                    }
                                    return 1;
                            });
    
                            //thisNode.selectAll('.node_right_button').attr("transform",function(d){return "translate("+(d.w - d._def.button.width.call(d))+","+0+")";}).attr("fill",function(d) {
                            //         return typeof d._def.button.color  === "function" ? d._def.button.color.call(d):(d._def.button.color != null ? d._def.button.color : d._def.color)
                            //});
    
                            thisNode.selectAll('.node_badge_group').attr("transform",function(d){return "translate("+(d.w-40)+","+(d.h+3)+")";});
                            thisNode.selectAll('text.node_badge_label').text(function(d,i) {
                                if (d._def.badge) {
                                    if (typeof d._def.badge == "function") {
                                        return d._def.badge.call(d);
                                    } else {
                                        return d._def.badge;
                                    }
                                }
                                return "";
                            });
                        }

                        if (!showStatus || !d.status) {
                            thisNode.selectAll('.node_status_group').style("display","none");
                        } else {
                            thisNode.selectAll('.node_status_group').style("display","inline").attr("transform","translate(3,"+(d.h+3)+")");
                            var fill = status_colours[d.status.fill]; // Only allow our colours for now
                            if (d.status.shape == null && fill == null) {
                                thisNode.selectAll('.node_status').style("display","none");
                            } else {
                                var style;
                                if (d.status.shape == null || d.status.shape == "dot") {
                                    style = {
                                        display: "inline",
                                        fill: fill,
                                        stroke: fill
                                    };
                                } else if (d.status.shape == "ring" ){
                                    style = {
                                        display: "inline",
                                        fill: '#fff',
                                        stroke: fill
                                    }
                                }
                                thisNode.selectAll('.node_status').style(style);
                            }
                            if (d.status.text) {
                                thisNode.selectAll('.node_status_label').text(d.status.text);
                            } else {
                                thisNode.selectAll('.node_status_label').text("");
                            }
                        }

                        d.dirty = false;
                    }
            });
            var link = vis.selectAll(".link").data(
                activeLinks,
                function(d) {
                    return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.target.i;
                }
            );
            var linkEnter = link.enter().insert("g",".node").attr("class","link");
    
            linkEnter.each(function(d,i) {
                var l = d3.select(this);
                d.added = true;
                l.append("svg:path").attr("class","link_background link_path")
                   .on("mousedown",function(d) {
                        mousedown_link = d;
                        clearSelection();
                        selected_link = mousedown_link;
                        updateSelection();
                        redraw();
                        focusView();
                        d3.event.stopPropagation();
                    })
                    .on("touchstart",function(d) {
                        mousedown_link = d;
                        clearSelection();
                        selected_link = mousedown_link;
                        updateSelection();
                        redraw();
                        focusView();
                        d3.event.stopPropagation();
                    });
                l.append("svg:path").attr("class","link_outline link_path");
                l.append("svg:path").attr("class","link_line link_path")
                    .classed("link_subflow", function(d) { return activeSubflow && (d.source.type === "subflow" || d.target.type === "subflow") });
            });
    
            link.exit().remove();
            var links = vis.selectAll(".link_path");
            links.each(function(d) {
                var link = d3.select(this);
                if (d.added || d===selected_link || d.selected || dirtyNodes[d.source.id] || dirtyNodes[d.target.id]) {
                    link.attr("d",function(d){
                        var numOutputs = d.source.outputs || 1;
                        var sourcePort = d.sourcePort || 0;
                        var y = -((numOutputs-1)/2)*13 +13*sourcePort;
        
                        var dy = d.target.y-(d.source.y+y);
                        var dx = (d.target.x-d.target.w/2)-(d.source.x+d.source.w/2);
                        var delta = Math.sqrt(dy*dy+dx*dx);
                        var scale = lineCurveScale;
                        var scaleY = 0;
                        if (delta < node_width) {
                            scale = 0.75-0.75*((node_width-delta)/node_width);
                        }
        
                        if (dx < 0) {
                            scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                            if (Math.abs(dy) < 3*node_height) {
                                scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                            }
                        }
        
                        d.x1 = d.source.x+d.source.w/2;
                        d.y1 = d.source.y+y;
                        d.x2 = d.target.x-d.target.w/2;
                        d.y2 = d.target.y;
        
                        return "M "+(d.source.x+d.source.w/2)+" "+(d.source.y+y)+
                            " C "+(d.source.x+d.source.w/2+scale*node_width)+" "+(d.source.y+y+scaleY*node_height)+" "+
                            (d.target.x-d.target.w/2-scale*node_width)+" "+(d.target.y-scaleY*node_height)+" "+
                            (d.target.x-d.target.w/2)+" "+d.target.y;
                    });
                }
            })
    
            link.classed("link_selected", function(d) { return d === selected_link || d.selected; });
            link.classed("link_unknown",function(d) { 
                delete d.added;
                return d.target.type == "unknown" || d.source.type == "unknown"
            });
        } else {
            // JOINING - unselect any selected links
            vis.selectAll(".link_selected").data(
                activeLinks,
                function(d) {
                    return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.target.i;
                }
            ).classed("link_selected", false);
        }
        

        if (d3.event) {
            d3.event.preventDefault();
        }
        
    }

    function focusView() {
        $("#chart svg").focus();
    }

    /**
     * Imports a new collection of nodes from a JSON String.
     *  - all get new IDs assigned
     *  - all 'selected'
     *  - attached to mouse for placing - 'IMPORT_DRAGGING'
     */
    function importNodes(newNodesStr,touchImport) {
        try {
            var result = RED.nodes.import(newNodesStr,true);
            if (result) {
                var new_nodes = result[0];
                var new_links = result[1];
                var new_workspaces = result[2];
                var new_subflows = result[3];
                
                var new_ms = new_nodes.filter(function(n) { return n.z == RED.workspaces.active() }).map(function(n) { return {n:n};});
                var new_node_ids = new_nodes.map(function(n){ return n.id; });

                // TODO: pick a more sensible root node
                if (new_ms.length > 0) {
                    var root_node = new_ms[0].n;
                    var dx = root_node.x;
                    var dy = root_node.y;

                    if (mouse_position == null) {
                        mouse_position = [0,0];
                    }

                    var minX = 0;
                    var minY = 0;
                    var i;
                    var node;

                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.selected = true;
                        node.n.changed = true;
                        node.n.x -= dx - mouse_position[0];
                        node.n.y -= dy - mouse_position[1];
                        node.dx = node.n.x - mouse_position[0];
                        node.dy = node.n.y - mouse_position[1];
                        minX = Math.min(node.n.x-node_width/2-5,minX);
                        minY = Math.min(node.n.y-node_height/2-5,minY);
                    }
                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.x -= minX;
                        node.n.y -= minY;
                        node.dx -= minX;
                        node.dy -= minY;
                    }
                    if (!touchImport) {
                        mouse_mode = RED.state.IMPORT_DRAGGING;
                    }

                    RED.keyboard.add(/* ESCAPE */ 27,function(){
                            RED.keyboard.remove(/* ESCAPE */ 27);
                            clearSelection();
                            RED.history.pop();
                            mouse_mode = 0;
                    });
                    clearSelection();
                    moving_set = new_ms;
                }

                RED.history.push({
                    t:'add',
                    nodes:new_node_ids,
                    links:new_links,
                    workspaces:new_workspaces,
                    subflows:new_subflows,
                    dirty:RED.nodes.dirty()
                });

                updateActiveNodes();
                redraw();
            }
        } catch(error) {
            if (error.code != "NODE_RED") {
                console.log(error.stack);
                RED.notify("<strong>Error</strong>: "+error,"error");
            } else {
                RED.notify("<strong>Error</strong>: "+error.message,"error");
            }
        }
    }

    // TODO: DRY
    var eventHandler = (function() {
        var handlers = {};
        
        return {
            on: function(evt,func) {
                handlers[evt] = handlers[evt]||[];
                handlers[evt].push(func);
            },
            emit: function(evt,arg) {
                if (handlers[evt]) {
                    for (var i=0;i<handlers[evt].length;i++) {
                        handlers[evt][i](arg);
                    }
                    
                }
            }
        }
    })();
    
    return {
        init: init,
        on: eventHandler.on,
        state:function(state) {
            if (state == null) {
                return mouse_mode
            } else {
                mouse_mode = state;
            }
        },
        
        redraw: function(updateActive) {
            if (updateActive) {
                updateActiveNodes();
            }
            RED.workspaces.refresh();
            redraw();   
        },
        focus: focusView,
        importNodes: importNodes,
        status: function(s) {
            if (s == null) {
                return showStatus;
            } else {
                showStatus = s;
                RED.nodes.eachNode(function(n) { n.dirty = true;});
                //TODO: subscribe/unsubscribe here
                redraw();
            }
        },
        calculateTextWidth: calculateTextWidth,
        select: function(selection) {
            if (typeof selection !== "undefined") {
                clearSelection();
                if (typeof selection == "string") {
                    var selectedNode = RED.nodes.node(selection);
                    if (selectedNode) {
                        selectedNode.selected = true;
                        selectedNode.dirty = true;
                        moving_set = [{n:selectedNode}];
                    }
                }
            }
            updateSelection();
            redraw();
        },
        selection: function() {
            var selection = {};
            if (moving_set.length > 0) {
                selection.nodes = moving_set.map(function(n) { return n.n;});
            }
            if (selected_link != null) {
                selection.link = selected_link;
            }
            return selection;
        }
    };
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.sidebar = (function() {

    //$('#sidebar').tabs();
    var sidebar_tabs = RED.tabs.create({
        id:"sidebar-tabs",
        onchange:function(tab) {
            $("#sidebar-content").children().hide();
            $("#"+tab.id).show();
        },
        onremove: function(tab) {
            $("#"+tab.id).remove();
        }
    });
    
    function addTab(title,content,closeable) {
        $("#sidebar-content").append(content);
        $(content).hide();
        sidebar_tabs.addTab({id:"tab-"+title,label:title,closeable:closeable});
        //content.style.position = "absolute";
        //$('#sidebar').tabs("refresh");
    }

    function removeTab(title) {
        sidebar_tabs.removeTab("tab-"+title);
    }
    
    var sidebarSeparator =  {};
    $("#sidebar-separator").draggable({
            axis: "x",
            start:function(event,ui) {
                sidebarSeparator.closing = false;
                sidebarSeparator.opening = false;
                var winWidth = $(window).width();
                sidebarSeparator.start = ui.position.left;
                sidebarSeparator.chartWidth = $("#workspace").width();
                sidebarSeparator.chartRight = winWidth-$("#workspace").width()-$("#workspace").offset().left-2;


                if (!RED.menu.isSelected("menu-item-sidebar")) {
                    sidebarSeparator.opening = true;
                    var newChartRight = 15;
                    $("#sidebar").addClass("closing");
                    $("#workspace").css("right",newChartRight);
                    $("#chart-zoom-controls").css("right",newChartRight+20);
                    $("#sidebar").width(0);
                    RED.menu.setSelected("menu-item-sidebar",true);
                    eventHandler.emit("resize");
                }
                sidebarSeparator.width = $("#sidebar").width();
            },
            drag: function(event,ui) {
                var d = ui.position.left-sidebarSeparator.start;
                var newSidebarWidth = sidebarSeparator.width-d;
                if (sidebarSeparator.opening) {
                    newSidebarWidth -= 13;
                }
                
                if (newSidebarWidth > 150) {
                    if (sidebarSeparator.chartWidth+d < 200) {
                        ui.position.left = 200+sidebarSeparator.start-sidebarSeparator.chartWidth;
                        d = ui.position.left-sidebarSeparator.start;
                        newSidebarWidth = sidebarSeparator.width-d;
                    }
                }
                    
                if (newSidebarWidth < 150) {
                    if (!sidebarSeparator.closing) {
                        $("#sidebar").addClass("closing");
                        sidebarSeparator.closing = true;
                    }
                    if (!sidebarSeparator.opening) {
                        newSidebarWidth = 150;
                        ui.position.left = sidebarSeparator.width-(150 - sidebarSeparator.start);
                        d = ui.position.left-sidebarSeparator.start;
                    }
                } else if (newSidebarWidth > 150 && (sidebarSeparator.closing || sidebarSeparator.opening)) {
                    sidebarSeparator.closing = false;
                    $("#sidebar").removeClass("closing");
                }

                var newChartRight = sidebarSeparator.chartRight-d;
                $("#workspace").css("right",newChartRight);
                $("#chart-zoom-controls").css("right",newChartRight+20);
                $("#sidebar").width(newSidebarWidth);

                sidebar_tabs.resize();
                eventHandler.emit("resize");
            },
            stop:function(event,ui) {
                if (sidebarSeparator.closing) {
                    $("#sidebar").removeClass("closing");
                    RED.menu.setSelected("menu-item-sidebar",false);
                    if ($("#sidebar").width() < 180) {
                        $("#sidebar").width(180);
                        $("#workspace").css("right",208);
                        $("#chart-zoom-controls").css("right",228);
                    }
                }
                $("#sidebar-separator").css("left","auto");
                $("#sidebar-separator").css("right",($("#sidebar").width()+13)+"px");
                eventHandler.emit("resize");
            }
    });
    
    function toggleSidebar(state) {
        if (!state) {
            $("#main-container").addClass("sidebar-closed");
        } else {
            $("#main-container").removeClass("sidebar-closed");
            sidebar_tabs.resize();
        }
        eventHandler.emit("resize");
    }
    
    function showSidebar(id) {
        if (id) {
            sidebar_tabs.activateTab("tab-"+id);
        }
    }
    
    function containsTab(id) {
        return sidebar_tabs.contains("tab-"+id);
    }
    
    function init () {
        RED.keyboard.add(/* SPACE */ 32,{ctrl:true},function(){RED.menu.setSelected("menu-item-sidebar",!RED.menu.isSelected("menu-item-sidebar"));d3.event.preventDefault();});
        showSidebar();
        RED.sidebar.info.show();
        // hide info bar at start if screen rather narrow...
        if ($(window).width() < 600) { toggleSidebar(); }
    }
    
    var eventHandler = (function() {
        var handlers = {};
        
        return {
            on: function(evt,func) {
                handlers[evt] = handlers[evt]||[];
                handlers[evt].push(func);
            },
            emit: function(evt,arg) {
                if (handlers[evt]) {
                    for (var i=0;i<handlers[evt].length;i++) {
                        handlers[evt][i](arg);
                    }
                    
                }
            }
        }
    })();
    
    return {
        init: init,
        addTab: addTab,
        removeTab: removeTab,
        show: showSidebar,
        containsTab: containsTab,
        toggleSidebar: toggleSidebar,
        on: eventHandler.on
    }
    
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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

RED.palette = (function() {

    var exclusion = ['config','unknown','deprecated'];
    var core = ['subflows', 'input', 'output', 'function', 'social', 'storage', 'analysis', 'advanced'];

    function createCategoryContainer(category){
        var escapedCategory = category.replace(" ","_");
        var catDiv = $("#palette-container").append('<div id="palette-container-'+category+'" class="palette-category hide">'+
            '<div id="palette-header-'+category+'" class="palette-header"><i class="expanded fa fa-caret-down"></i><span>'+category.replace("_"," ")+'</span></div>'+
            '<div class="palette-content" id="palette-base-category-'+category+'">'+
            '<div id="palette-'+category+'-input"></div>'+
            '<div id="palette-'+category+'-output"></div>'+
            '<div id="palette-'+category+'-function"></div>'+
            '</div>'+
            '</div>');

        $("#palette-header-"+category).on('click', function(e) {
            $(this).next().slideToggle();
            $(this).children("i").toggleClass("expanded");
        });
    }

    function setLabel(type, el,label) {
        var nodeWidth = 80;
        var nodeHeight = 25;
        var lineHeight = 20;
        var portHeight = 10;

        var words = label.split(" ");

        var displayLines = [];

        var currentLine = words[0];
        var currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);

        for (var i=1;i<words.length;i++) {
            var newWidth = RED.view.calculateTextWidth(currentLine+" "+words[i], "palette_label", 0);
            if (newWidth < nodeWidth) {
                currentLine += " "+words[i];
                currentLineWidth = newWidth;
            } else {
                displayLines.push(currentLine);
                currentLine = words[i];
                currentLineWidth = RED.view.calculateTextWidth(currentLine, "palette_label", 0);
            }
        }
        displayLines.push(currentLine);

        var lines = displayLines.join("<br/>");
        var multiLineNodeHeight = 8+(lineHeight*displayLines.length);
        el.css({height:multiLineNodeHeight+"px"});

        var labelElement = el.find(".palette_label");
        labelElement.html(lines);

        el.find(".palette_port").css({top:(multiLineNodeHeight/2-5)+"px"});

        var popOverContent;
        try {
            var l = "<p><b>"+label+"</b></p>";
            if (label != type) {
                l = "<p><b>"+label+"</b><br/><i>"+type+"</i></p>";
            }
            
            popOverContent = $(l+($("script[data-help-name|='"+type+"']").html()||"<p>no information available</p>").trim())
                                .filter(function(n) {
                                    return this.nodeType == 1 || (this.nodeType == 3 && this.textContent.trim().length > 0)
                                }).slice(0,2);
        } catch(err) {
            // Malformed HTML may cause errors. TODO: need to understand what can break
            console.log("Error generating pop-over label for '"+type+"'.");
            console.log(err.toString());
            popOverContent = "<p><b>"+label+"</b></p><p>no information available</p>";
        }


        el.data('popover').options.content = popOverContent;
    }

    function escapeNodeType(nt) {
        return nt.replace(" ","_").replace(".","_").replace(":","_");
    }

    function addNodeType(nt,def) {
        var nodeTypeId = escapeNodeType(nt);
        if ($("#palette_node_"+nodeTypeId).length) {
            return;
        }

        if (exclusion.indexOf(def.category)===-1) {

            var category = def.category.replace(" ","_");
            var rootCategory = category.split("-")[0];

            var d = document.createElement("div");
            d.id = "palette_node_"+nodeTypeId;
            d.type = nt;

            var label;

            if (typeof def.paletteLabel === "undefined") {
                label = /^(.*?)([ -]in|[ -]out)?$/.exec(nt)[1];
            } else {
                label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
            }

            
            $('<div/>',{class:"palette_label"+(def.align=="right"?" palette_label_right":"")}).appendTo(d);

            d.className="palette_node";
            
            
            if (def.icon) {
                var icon_url = (typeof def.icon === "function" ? def.icon.call({}) : def.icon);
                var iconContainer = $('<div/>',{class:"palette_icon_container"+(def.align=="right"?" palette_icon_container_right":"")}).appendTo(d);
                $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);
            }

            d.style.backgroundColor = def.color;

            if (def.outputs > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                d.appendChild(portOut);
            }

            if (def.inputs > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                d.appendChild(portIn);
            }

            if ($("#palette-base-category-"+rootCategory).length === 0) {
                createCategoryContainer(rootCategory);
            }
            $("#palette-container-"+rootCategory).show();

            if ($("#palette-"+category).length === 0) {
                $("#palette-base-category-"+rootCategory).append('<div id="palette-'+category+'"></div>');
            }

            $("#palette-"+category).append(d);
            d.onmousedown = function(e) { e.preventDefault(); };

            $(d).popover({
                title:d.type,
                placement:"right",
                trigger: "hover",
                delay: { show: 750, hide: 50 },
                html: true,
                container:'body'
            });
            $(d).click(function() {
                RED.view.focus();
                var help = '<div class="node-help">'+($("script[data-help-name|='"+d.type+"']").html()||"")+"</div>";
                $("#tab-info").html(help);
            });
            $(d).draggable({
                helper: 'clone',
                appendTo: 'body',
                revert: true,
                revertDuration: 50,
                start: function() {RED.view.focus();}
            });
            
            if (def.category == "subflows") {
                $(d).dblclick(function(e) {
                    RED.workspaces.show(nt.substring(8));
                    e.preventDefault();
                });
            }

            setLabel(nt,$(d),label);
            
            var categoryNode = $("#palette-container-"+category);
            if (categoryNode.find(".palette_node").length === 1) {
                if (!categoryNode.find("i").hasClass("expanded")) {
                    categoryNode.find(".palette-content").slideToggle();
                    categoryNode.find("i").toggleClass("expanded");
                }
            }
            
        }
    }

    function removeNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        var paletteNode = $("#palette_node_"+nodeTypeId);
        var categoryNode = paletteNode.closest(".palette-category");
        paletteNode.remove();
        if (categoryNode.find(".palette_node").length === 0) {
            if (categoryNode.find("i").hasClass("expanded")) {
                categoryNode.find(".palette-content").slideToggle();
                categoryNode.find("i").toggleClass("expanded");
            }
        }
    }
    function hideNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).hide();
    }

    function showNodeType(nt) {
        var nodeTypeId = escapeNodeType(nt);
        $("#palette_node_"+nodeTypeId).show();
    }

    function refreshNodeTypes() {
        RED.nodes.eachSubflow(function(sf) {
            var paletteNode = $("#palette_node_subflow_"+sf.id.replace(".","_"));
            var portInput = paletteNode.find(".palette_port_input");
            var portOutput = paletteNode.find(".palette_port_output");

            if (portInput.length === 0 && sf.in.length > 0) {
                var portIn = document.createElement("div");
                portIn.className = "palette_port palette_port_input";
                paletteNode.append(portIn);
            } else if (portInput.length !== 0 && sf.in.length === 0) {
                portInput.remove();
            }

            if (portOutput.length === 0 && sf.out.length > 0) {
                var portOut = document.createElement("div");
                portOut.className = "palette_port palette_port_output";
                paletteNode.append(portOut);
            } else if (portOutput.length !== 0 && sf.out.length === 0) {
                portOutput.remove();
            }
            setLabel(sf.type+":"+sf.id,paletteNode,sf.name);
        });
    }

    function filterChange() {
        var val = $("#palette-search-input").val();
        if (val === "") {
            $("#palette-search-clear").hide();
        } else {
            $("#palette-search-clear").show();
        }

        var re = new RegExp(val,'i');
        $(".palette_node").each(function(i,el) {
            var currentLabel = $(el).find(".palette_label").text();
            if (val === "" || re.test(el.id) || re.test(currentLabel)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    function init() {
        $(".palette-spinner").show();
        if (RED.settings.paletteCategories) {
            RED.settings.paletteCategories.forEach(createCategoryContainer);
        } else {
            core.forEach(createCategoryContainer);
        }
        
        $("#palette-search-input").focus(function(e) {
            RED.keyboard.disable();
        });
        $("#palette-search-input").blur(function(e) {
            RED.keyboard.enable();
        });
    
        $("#palette-search-clear").on("click",function(e) {
            e.preventDefault();
            $("#palette-search-input").val("");
            filterChange();
            $("#palette-search-input").focus();
        });
    
        $("#palette-search-input").val("");
        $("#palette-search-input").on("keyup",function() {
            filterChange();
        });
    
        $("#palette-search-input").on("focus",function() {
            $("body").one("mousedown",function() {
                $("#palette-search-input").blur();
            });
        });
    }

    return {
        init: init,
        add:addNodeType,
        remove:removeNodeType,
        hide:hideNodeType,
        show:showNodeType,
        refresh:refreshNodeTypes
    };
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.sidebar.info = (function() {

    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: true,
        smartLists: true,
        smartypants: false
    });

    var content = document.createElement("div");
    content.id = "tab-info";
    content.style.paddingTop = "4px";
    content.style.paddingLeft = "4px";
    content.style.paddingRight = "4px";

    var propertiesExpanded = false;
    
    function show() {
        if (!RED.sidebar.containsTab("info")) {
            RED.sidebar.addTab("info",content,false);
        }
        RED.sidebar.show("info");
    }

    function jsonFilter(key,value) {
        if (key === "") {
            return value;
        }
        var t = typeof value;
        if ($.isArray(value)) {
            return "[array:"+value.length+"]";
        } else if (t === "object") {
            return "[object]"
        } else if (t === "string") {
            if (value.length > 30) {
                return value.substring(0,30)+" ...";
            }
        }
        return value;
    }

    function refresh(node) {
        var table = '<table class="node-info"><tbody>';
        table += '<tr class="blank"><td colspan="2">Node</td></tr>';
        if (node.type != "subflow" && node.name) {
            table += "<tr><td>Name</td><td>&nbsp;"+node.name+"</td></tr>";
        }
        table += "<tr><td>Type</td><td>&nbsp;"+node.type+"</td></tr>";
        table += "<tr><td>ID</td><td>&nbsp;"+node.id+"</td></tr>";
        
        var m = /^subflow(:(.+))?$/.exec(node.type);
        if (m) {
            var subflowNode;
            if (m[2]) {
                subflowNode = RED.nodes.subflow(m[2]);
            } else {
                subflowNode = node;
            }
            
            table += '<tr class="blank"><td colspan="2">Subflow</td></tr>';
            
            var userCount = 0;
            var subflowType = "subflow:"+subflowNode.id;
            RED.nodes.eachNode(function(n) {
                if (n.type === subflowType) {
                    userCount++;
                }
            });
            table += "<tr><td>name</td><td>"+subflowNode.name+"</td></tr>";
            table += "<tr><td>instances</td><td>"+userCount+"</td></tr>";
        }
        
        if (!m && node.type != "subflow" && node.type != "comment") {
            table += '<tr class="blank"><td colspan="2"><a href="#" class="node-info-property-header"><i style="width: 10px; text-align: center;" class="fa fa-caret-'+(propertiesExpanded?"down":"right")+'"></i> Properties</a></td></tr>';
            if (node._def) {
                for (var n in node._def.defaults) {
                    if (n != "name" && node._def.defaults.hasOwnProperty(n)) {
                        var val = node[n]||"";
                        var type = typeof val;
                        if (type === "string") {
                            if (val.length === 0) {
                                val += '<span style="font-style: italic; color: #ccc;">blank</span>';
                            } else {
                                if (val.length > 30) {
                                    val = val.substring(0,30)+" ...";
                                }
                                val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                            }
                        } else if (type === "number") {
                            val = val.toString();
                        } else if ($.isArray(val)) {
                            val = "[<br/>";
                            for (var i=0;i<Math.min(node[n].length,10);i++) {
                                var vv = JSON.stringify(node[n][i],jsonFilter," ").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                                val += "&nbsp;"+i+": "+vv+"<br/>";
                            }
                            if (node[n].length > 10) {
                                val += "&nbsp;... "+node[n].length+" items<br/>";
                            }
                            val += "]";
                        } else {
                            val = JSON.stringify(val,jsonFilter," ");
                            val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                        }
    
                        table += '<tr class="node-info-property-row'+(propertiesExpanded?"":" hide")+'"><td>'+n+"</td><td>"+val+"</td></tr>";
                    }
                }
            }
        }
        table += "</tbody></table><hr/>";
        if (node.type != "comment") {
            var helpText = $("script[data-help-name|='"+node.type+"']").html()||"";
            table  += '<div class="node-help">'+helpText+"</div>";
        }

        if (node._def && node._def.info) {
            var info = node._def.info;
            table += '<div class="node-help">'+marked(typeof info === "function" ? info.call(node) : info)+'</div>';
            //table += '<div class="node-help">'+(typeof info === "function" ? info.call(node) : info)+'</div>';
        }

        $("#tab-info").html(table);
        
        $(".node-info-property-header").click(function(e) {
            var icon = $(this).find("i");
            if (icon.hasClass("fa-caret-right")) {
                icon.removeClass("fa-caret-right");
                icon.addClass("fa-caret-down");
                $(".node-info-property-row").show();
                propertiesExpanded = true;
            } else {
                icon.addClass("fa-caret-right");
                icon.removeClass("fa-caret-down");
                $(".node-info-property-row").hide();
                propertiesExpanded = false;
            }
            
            e.preventDefault();
        });
    }
    
    function clear() {
        $("#tab-info").html("");
    }
    
    RED.view.on("selection-changed",function(selection) {
        if (selection.nodes) {
            if (selection.nodes.length == 1) {
                var node = selection.nodes[0];
                if (node.type === "subflow" && node.direction) {
                    refresh(RED.nodes.subflow(node.z));
                } else {
                    refresh(node);
                }
            }
        } else {
            var subflow = RED.nodes.subflow(RED.workspaces.active());
            if (subflow) {
                refresh(subflow);
            } else {
                clear();
            }
        }
    });

    return {
        show: show,
        refresh:refresh,
        clear: clear
    }
})();
;/**
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
RED.sidebar.config = (function() {
    
    var content = document.createElement("div");
    content.id = "tab-config";
    content.style.paddingTop = "4px";
    content.style.paddingLeft = "4px";
    content.style.paddingRight = "4px";
    
    var list = $("<ul>",{class:"tab-config-list"}).appendTo(content);
    
    function show() {
        if (!RED.sidebar.containsTab("config")) {
            RED.sidebar.addTab("config",content,true);
        }
        refresh();
        RED.sidebar.show("config");
    }
    
    function refresh() {
        list.empty();
        RED.nodes.eachConfig(function(node) {
            var li = list.find("#tab-config-list-type-"+node.type);
            if (li.length === 0) {
                li = $("<li>",{id:"tab-config-list-type-"+node.type}).appendTo(list);
                $('<div class="tab-config-list-type">'+node.type+'</div>').appendTo(li);
            }
            var label = "";
            if (typeof node._def.label == "function") {
                label = node._def.label.call(node);
            } else {
                label = node._def.label;
            }
            label = label || "&nbsp;";
            
            var entry = $('<div class="tab-config-list-entry"></div>').appendTo(li);
            entry.on('dblclick',function(e) {
                RED.editor.editConfig("", node.type, node.id);
            });
            
            var userArray = node.users.map(function(n) { return n.id });
            entry.on('mouseover',function(e) {
                RED.nodes.eachNode(function(node) {
                    if( userArray.indexOf(node.id) != -1) {
                        node.highlighted = true;
                        node.dirty = true;
                    }
                });
                RED.view.redraw();
            });

            entry.on('mouseout',function(e) {
                RED.nodes.eachNode(function(node) {
                    if(node.highlighted) {
                        node.highlighted = false;
                        node.dirty = true;
                    }
                });
                RED.view.redraw();
            });
            
            $('<div class="tab-config-list-label">'+label+'</div>').appendTo(entry);
            $('<div class="tab-config-list-users">'+node.users.length+'</div>').appendTo(entry);
        });
    }
    return {
        show:show,
        refresh:refresh
    }
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.editor = (function() {
    var editing_node = null;

    function getCredentialsURL(nodeType, nodeID) {
        var dashedType = nodeType.replace(/\s+/g, '-');
        return  'credentials/' + dashedType + "/" + nodeID;
    }

    /**
     * Validate a node
     * @param node - the node being validated
     * @returns {boolean} whether the node is valid. Sets node.dirty if needed
     */
    function validateNode(node) {
        var oldValue = node.valid;
        var oldChanged = node.changed;
        node.valid = true;
        var subflow;
        var isValid;
        var hasChanged;

        if (node.type.indexOf("subflow:")===0) {
            subflow = RED.nodes.subflow(node.type.substring(8));
            isValid = subflow.valid;
            hasChanged = subflow.changed;
            if (isValid === undefined) {
                isValid = validateNode(subflow);
                hasChanged = subflow.changed;
            }
            node.valid = isValid;
            node.changed = hasChanged;
        } else if (node._def) {
            node.valid = validateNodeProperties(node, node._def.defaults, node);
            if (node._def._creds) {
                node.valid = node.valid && validateNodeProperties(node, node._def.credentials, node._def._creds);
            }
        } else if (node.type == "subflow") {
            var subflowNodes = RED.nodes.filterNodes({z:node.id});
            for (var i=0;i<subflowNodes.length;i++) {
                isValid = subflowNodes[i].valid;
                hasChanged = subflowNodes[i].changed;
                if (isValid === undefined) {
                    isValid = validateNode(subflowNodes[i]);
                    hasChanged = subflowNodes[i].changed;
                }
                node.valid = node.valid && isValid;
                node.changed = node.changed || hasChanged;
            }
            var subflowInstances = RED.nodes.filterNodes({type:"subflow:"+node.id});
            var modifiedTabs = {};
            for (i=0;i<subflowInstances.length;i++) {
                subflowInstances[i].valid = node.valid;
                subflowInstances[i].changed = node.changed;
                subflowInstances[i].dirty = true;
                modifiedTabs[subflowInstances[i].z] = true;
            }
            Object.keys(modifiedTabs).forEach(function(id) {
                var subflow = RED.nodes.subflow(id);
                if (subflow) {
                    validateNode(subflow);
                }
            });
        }
        if (oldValue !== node.valid || oldChanged !== node.changed) {
            node.dirty = true;
            subflow = RED.nodes.subflow(node.z);
            if (subflow) {
                validateNode(subflow);
            }
        }
        return node.valid;
    }

    /**
     * Validate a node's properties for the given set of property definitions
     * @param node - the node being validated
     * @param definition - the node property definitions (either def.defaults or def.creds)
     * @param properties - the node property values to validate
     * @returns {boolean} whether the node's properties are valid
     */
    function validateNodeProperties(node, definition, properties) {
        var isValid = true;
        for (var prop in definition) {
            if (definition.hasOwnProperty(prop)) {
                if (!validateNodeProperty(node, definition, prop, properties[prop])) {
                    isValid = false;
                }
            }
        }
        return isValid;
    }

    /**
     * Validate a individual node property
     * @param node - the node being validated
     * @param definition - the node property definitions (either def.defaults or def.creds)
     * @param property - the property name being validated
     * @param value - the property value being validated
     * @returns {boolean} whether the node proprty is valid
     */
    function validateNodeProperty(node,definition,property,value) {
        var valid = true;
        if ("required" in definition[property] && definition[property].required) {
            valid = value !== "";
        }
        if (valid && "validate" in definition[property]) {
            valid = definition[property].validate.call(node,value);
        }
        if (valid && definition[property].type && RED.nodes.getType(definition[property].type) && !("validate" in definition[property])) {
            if (!value || value == "_ADD_") {
                valid = definition[property].hasOwnProperty("required") && !definition[property].required;
            } else {
                var v = RED.nodes.node(value).valid;
                valid = (v==null || v);
            }
        }
        return valid;
    }

    /**
     * Called when the node's properties have changed.
     * Marks the node as dirty and needing a size check.
     * Removes any links to non-existant outputs.
     * @param node - the node that has been updated
     * @returns {array} the links that were removed due to this update
     */
    function updateNodeProperties(node) {
        node.resize = true;
        node.dirty = true;
        var removedLinks = [];
        if (node.ports) {
            if (node.outputs < node.ports.length) {
                while (node.outputs < node.ports.length) {
                    node.ports.pop();
                }
                RED.nodes.eachLink(function(l) {
                        if (l.source === node && l.sourcePort >= node.outputs) {
                            removedLinks.push(l);
                        }
                });
            } else if (node.outputs > node.ports.length) {
                while (node.outputs > node.ports.length) {
                    node.ports.push(node.ports.length);
                }
            }
        }
        if (node.inputs === 0) {
            removedLinks.concat(RED.nodes.filterLinks({target:node}));
        }
        for (var l=0;l<removedLinks.length;l++) {
            RED.nodes.removeLink(removedLinks[l]);
        }
        return removedLinks;
    }

    $( "#dialog" ).dialog({
            modal: true,
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            closeOnEscape: false,
            minWidth: 500,
            width: 'auto',
            buttons: [
                {
                    id: "node-dialog-ok",
                    text: "Ok",
                    click: function() {
                        if (editing_node) {
                            var changes = {};
                            var changed = false;
                            var wasDirty = RED.nodes.dirty();
                            var d;

                            if (editing_node._def.oneditsave) {
                                var oldValues = {};
                                for (d in editing_node._def.defaults) {
                                    if (editing_node._def.defaults.hasOwnProperty(d)) {
                                        if (typeof editing_node[d] === "string" || typeof editing_node[d] === "number") {
                                            oldValues[d] = editing_node[d];
                                        } else {
                                            oldValues[d] = $.extend(true,{},{v:editing_node[d]}).v;
                                        }
                                    }
                                }
                                var rc = editing_node._def.oneditsave.call(editing_node);
                                if (rc === true) {
                                    changed = true;
                                }

                                for (d in editing_node._def.defaults) {
                                    if (editing_node._def.defaults.hasOwnProperty(d)) {
                                        if (oldValues[d] === null || typeof oldValues[d] === "string" || typeof oldValues[d] === "number") {
                                            if (oldValues[d] !== editing_node[d]) {
                                                changes[d] = oldValues[d];
                                                changed = true;
                                            }
                                        } else {
                                            if (JSON.stringify(oldValues[d]) !== JSON.stringify(editing_node[d])) {
                                                changes[d] = oldValues[d];
                                                changed = true;
                                            }
                                        }
                                    }
                                }
                            }

                            if (editing_node._def.defaults) {
                                for (d in editing_node._def.defaults) {
                                    if (editing_node._def.defaults.hasOwnProperty(d)) {
                                        var input = $("#node-input-"+d);
                                        var newValue;
                                        if (input.attr('type') === "checkbox") {
                                            newValue = input.prop('checked');
                                        } else {
                                            newValue = input.val();
                                        }
                                        if (newValue != null) {
                                            if (editing_node[d] != newValue) {
                                                if (editing_node._def.defaults[d].type) {
                                                    if (newValue == "_ADD_") {
                                                        newValue = "";
                                                    }
                                                    // Change to a related config node
                                                    var configNode = RED.nodes.node(editing_node[d]);
                                                    if (configNode) {
                                                        var users = configNode.users;
                                                        users.splice(users.indexOf(editing_node),1);
                                                    }
                                                    configNode = RED.nodes.node(newValue);
                                                    if (configNode) {
                                                        configNode.users.push(editing_node);
                                                    }
                                                }
                                                changes[d] = editing_node[d];
                                                editing_node[d] = newValue;
                                                changed = true;
                                            }
                                        }
                                    }
                                }
                            }
                            if (editing_node._def.credentials) {
                                var prefix = 'node-input';
                                var credDefinition = editing_node._def.credentials;
                                var credsChanged = updateNodeCredentials(editing_node,credDefinition,prefix);
                                changed = changed || credsChanged;
                            }

                            var removedLinks = updateNodeProperties(editing_node);
                            if (changed) {
                                var wasChanged = editing_node.changed;
                                editing_node.changed = true;
                                RED.nodes.dirty(true);
                                RED.history.push({t:'edit',node:editing_node,changes:changes,links:removedLinks,dirty:wasDirty,changed:wasChanged});
                            }
                            editing_node.dirty = true;
                            validateNode(editing_node);
                            RED.view.redraw();
                        } else if (/Export nodes to library/.test($( "#dialog" ).dialog("option","title"))) {
                            //TODO: move this to RED.library
                            var flowName = $("#node-input-filename").val();
                            if (!/^\s*$/.test(flowName)) {
                                $.ajax({
                                    url:'library/flows/'+flowName,
                                    type: "POST",
                                    data: $("#node-input-filename").attr('nodes'),
                                    contentType: "application/json; charset=utf-8"
                                }).done(function() {
                                        RED.library.loadFlowLibrary();
                                        RED.notify("Saved nodes","success");
                                });
                            }
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "node-dialog-cancel",
                    text: "Cancel",
                    click: function() {
                        if (editing_node && editing_node._def) {
                            if (editing_node._def.oneditcancel) {
                                editing_node._def.oneditcancel.call(editing_node);
                            }
                        }
                        $( this ).dialog( "close" );
                    }
                }
            ],
            resize: function(e,ui) {
                if (editing_node) {
                    $(this).dialog('option',"sizeCache-"+editing_node.type,ui.size);
                }
            },
            open: function(e) {
                var minWidth = $(this).dialog('option','minWidth');
                if ($(this).outerWidth() < minWidth) {
                    $(this).dialog('option','width',minWidth);
                } else {
                    $(this).dialog('option','width',$(this).outerWidth());
                }
                RED.keyboard.disable();
                if (editing_node) {
                    var size = $(this).dialog('option','sizeCache-'+editing_node.type);
                    if (size) {
                        $(this).dialog('option','width',size.width);
                        $(this).dialog('option','height',size.height);
                    }
                }
            },
            close: function(e) {
                RED.keyboard.enable();

                if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                    RED.view.state(RED.state.DEFAULT);
                }
                $( this ).dialog('option','height','auto');
                $( this ).dialog('option','width','auto');
                if (editing_node) {
                    RED.sidebar.info.refresh(editing_node);
                }
                RED.sidebar.config.refresh();

                var buttons = $( this ).dialog("option","buttons");
                if (buttons.length == 3) {
                    $( this ).dialog("option","buttons",buttons.splice(1));
                }
                editing_node = null;
            }
    });

    /**
     * Create a config-node select box for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeSelect(node,property,type) {
        var input = $("#node-input-"+property);
        var node_def = RED.nodes.getType(type);

        input.replaceWith('<select style="width: 60%;" id="node-input-'+property+'"></select>');
        updateConfigNodeSelect(property,type,node[property]);
        var select = $("#node-input-"+property);
        select.after(' <a id="node-input-lookup-'+property+'" class="btn"><i class="fa fa-pencil"></i></a>');
        $('#node-input-lookup-'+property).click(function(e) {
            showEditConfigNodeDialog(property,type,select.find(":selected").val());
            e.preventDefault();
        });
        var label = "";
        var configNode = RED.nodes.node(node[property]);
        if (configNode && node_def.label) {
            if (typeof node_def.label == "function") {
                label = node_def.label.call(configNode);
            } else {
                label = node_def.label;
            }
        }
        input.val(label);
    }

    /**
     * Create a config-node button for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param type - the type of the config-node
     */
    function prepareConfigNodeButton(node,property,type) {
        var input = $("#node-input-"+property);
        input.val(node[property]);
        input.attr("type","hidden");

        var button = $("<a>",{id:"node-input-edit-"+property, class:"btn"});
        input.after(button);

        if (node[property]) {
            button.text("edit");
        } else {
            button.text("add");
        }

        button.click(function(e) {
            showEditConfigNodeDialog(property,type,input.val()||"_ADD_");
            e.preventDefault();
        });
    }

    /**
     * Populate the editor dialog input field for this property
     * @param node - the node being edited
     * @param property - the name of the field
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function preparePropertyEditor(node,property,prefix) {
        var input = $("#"+prefix+"-"+property);
        if (input.attr('type') === "checkbox") {
            input.prop('checked',node[property]);
        } else {
            var val = node[property];
            if (val == null) {
                val = "";
            }
            input.val(val);
        }
    }

    /**
     * Add an on-change handler to revalidate a node field
     * @param node - the node being edited
     * @param definition - the definition of the node
     * @param property - the name of the field
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function attachPropertyChangeHandler(node,definition,property,prefix) {
        $("#"+prefix+"-"+property).change(function() {
            if (!validateNodeProperty(node, definition, property,this.value)) {
                $(this).addClass("input-error");
            } else {
                $(this).removeClass("input-error");
            }
        });
    }

    /**
     * Assign the value to each credential field
     * @param node
     * @param credDef
     * @param credData
     * @param prefix
     */
    function populateCredentialsInputs(node, credDef, credData, prefix) {
        var cred;
        for (cred in credDef) {
            if (credDef.hasOwnProperty(cred)) {
                if (credDef[cred].type == 'password') {
                    if (credData[cred]) {
                        $('#' + prefix + '-' + cred).val(credData[cred]);
                    } else if (credData['has_' + cred]) {
                        $('#' + prefix + '-' + cred).val('__PWRD__');
                    }
                    else {
                        $('#' + prefix + '-' + cred).val('');
                    }
                } else {
                    preparePropertyEditor(credData, cred, prefix);
                }
                attachPropertyChangeHandler(node, credDef, cred, prefix);
            }
        }
        for (cred in credDef) {
            if (credDef.hasOwnProperty(cred)) {
                $("#" + prefix + "-" + cred).change();
            }
        }
    }

    /**
     * Update the node credentials from the edit form
     * @param node - the node containing the credentials
     * @param credDefinition - definition of the credentials
     * @param prefix - prefix of the input fields
     * @return {boolean} whether anything has changed
     */
    function updateNodeCredentials(node, credDefinition, prefix) {
        var changed = false;
        if(!node.credentials) {
            node.credentials = {_:{}};
        }

        for (var cred in credDefinition) {
            if (credDefinition.hasOwnProperty(cred)) {
                var input = $("#" + prefix + '-' + cred);
                var value = input.val();
                if (credDefinition[cred].type == 'password') {
                    node.credentials['has_' + cred] = (value !== "");
                    if (value == '__PWRD__') {
                        continue;
                    }
                    changed = true;

                }
                node.credentials[cred] = value;
                if (value != node.credentials._[cred]) {
                    changed = true;
                }
            }
        }
        return changed;
    }

    /**
     * Prepare all of the editor dialog fields
     * @param node - the node being edited
     * @param definition - the node definition
     * @param prefix - the prefix to use in the input element ids (node-input|node-config-input)
     */
    function prepareEditDialog(node,definition,prefix) {
        for (var d in definition.defaults) {
            if (definition.defaults.hasOwnProperty(d)) {
                if (definition.defaults[d].type) {
                    if (definition.defaults[d].exclusive) {
                        prepareConfigNodeButton(node,d,definition.defaults[d].type);
                    } else {
                        prepareConfigNodeSelect(node,d,definition.defaults[d].type);
                    }
                } else {
                    preparePropertyEditor(node,d,prefix);
                }
                attachPropertyChangeHandler(node,definition.defaults,d,prefix);
            }
        }
        var completePrepare = function() {
            if (definition.oneditprepare) {
                definition.oneditprepare.call(node);
            }
            for (var d in definition.defaults) {
                if (definition.defaults.hasOwnProperty(d)) {
                    $("#"+prefix+"-"+d).change();
                }
            }
        }

        if (definition.credentials) {
            if (node.credentials) {
                populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
                completePrepare();
            } else {
                $.getJSON(getCredentialsURL(node.type, node.id), function (data) {
                    node.credentials = data;
                    node.credentials._ = $.extend(true,{},data);
                    populateCredentialsInputs(node, definition.credentials, node.credentials, prefix);
                    completePrepare();
                });
            }
        } else {
            completePrepare();
        }
    }

    function showEditDialog(node) {
        editing_node = node;
        RED.view.state(RED.state.EDITING);
        var type = node.type;
        if (node.type.substring(0,8) == "subflow:") {
            type = "subflow";
            var id = editing_node.type.substring(8);
            var buttons = $( "#dialog" ).dialog("option","buttons");
            buttons.unshift({
                class: 'leftButton',
                text: "Edit flow",
                click: function() {
                    RED.workspaces.show(id);
                    $("#node-dialog-ok").click();
                }
            });
            $( "#dialog" ).dialog("option","buttons",buttons);
        }
        $("#dialog-form").html($("script[data-template-name='"+type+"']").html());
        $('<input type="text" style="display: none;" />').appendTo("#dialog-form");
        prepareEditDialog(node,node._def,"node-input");





        $( "#dialog" ).dialog("option","title","Edit "+type+" node").dialog( "open" );
    }

    function showEditConfigNodeDialog(name,type,id) {
        var adding = (id == "_ADD_");
        var node_def = RED.nodes.getType(type);

        var configNode = RED.nodes.node(id);
        if (configNode == null) {
            configNode = {
                id: (1+Math.random()*4294967295).toString(16),
                _def: node_def,
                type: type
            }
            for (var d in node_def.defaults) {
                if (node_def.defaults[d].value) {
                    configNode[d] = node_def.defaults[d].value;
                }
            }
        }

        $("#dialog-config-form").html($("script[data-template-name='"+type+"']").html());
        prepareEditDialog(configNode,node_def,"node-config-input");

        var buttons = $( "#node-config-dialog" ).dialog("option","buttons");
        if (adding) {
            if (buttons.length == 3) {
                buttons = buttons.splice(1);
            }
            buttons[0].text = "Add";
            $("#node-config-dialog-user-count").html("").hide();
        } else {
            if (buttons.length == 2) {
                buttons.unshift({
                        class: 'leftButton',
                        text: "Delete",
                        click: function() {
                            var configProperty = $(this).dialog('option','node-property');
                            var configId = $(this).dialog('option','node-id');
                            var configType = $(this).dialog('option','node-type');
                            var configNode = RED.nodes.node(configId);
                            var configTypeDef = RED.nodes.getType(configType);

                            if (configTypeDef.ondelete) {
                                configTypeDef.ondelete.call(RED.nodes.node(configId));
                            }
                            if (configTypeDef.oneditdelete) {
                                configTypeDef.oneditdelete.call(RED.nodes.node(configId));
                            }
                            RED.nodes.remove(configId);
                            for (var i=0;i<configNode.users.length;i++) {
                                var user = configNode.users[i];
                                for (var d in user._def.defaults) {
                                    if (user._def.defaults.hasOwnProperty(d) && user[d] == configId) {
                                        user[d] = "";
                                    }
                                }
                                validateNode(user);
                            }
                            updateConfigNodeSelect(configProperty,configType,"");
                            RED.nodes.dirty(true);
                            $( this ).dialog( "close" );
                            RED.view.redraw();
                        }
                });
            }
            buttons[1].text = "Update";
            $("#node-config-dialog-user-count").html(configNode.users.length+" node"+(configNode.users.length==1?" uses":"s use")+" this config").show();
        }
        $( "#node-config-dialog" ).dialog("option","buttons",buttons);

        $( "#node-config-dialog" )
            .dialog("option","node-adding",adding)
            .dialog("option","node-property",name)
            .dialog("option","node-id",configNode.id)
            .dialog("option","node-type",type)
            .dialog("option","title",(adding?"Add new ":"Edit ")+type+" config node")
            .dialog( "open" );
    }

    function updateConfigNodeSelect(name,type,value) {
        var button = $("#node-input-edit-"+name);
        if (button.length) {
            if (value) {
                button.text("edit");
            } else {
                button.text("add");
            }
            $("#node-input-"+name).val(value);
        } else {

            var select = $("#node-input-"+name);
            var node_def = RED.nodes.getType(type);
            select.children().remove();
            RED.nodes.eachConfig(function(config) {
                if (config.type == type) {
                    var label = "";
                    if (typeof node_def.label == "function") {
                        label = node_def.label.call(config);
                    } else {
                        label = node_def.label;
                    }
                    select.append('<option value="'+config.id+'"'+(value==config.id?" selected":"")+'>'+label+'</option>');
                }
            });

            select.append('<option value="_ADD_"'+(value===""?" selected":"")+'>Add new '+type+'...</option>');
            window.setTimeout(function() { select.change();},50);
        }
    }

    $( "#node-config-dialog" ).dialog({
            modal: true,
            autoOpen: false,
            dialogClass: "ui-dialog-no-close",
            minWidth: 500,
            width: 'auto',
            closeOnEscape: false,
            buttons: [
                {
                    id: "node-config-dialog-ok",
                    text: "Ok",
                    click: function() {
                        var configProperty = $(this).dialog('option','node-property');
                        var configId = $(this).dialog('option','node-id');
                        var configType = $(this).dialog('option','node-type');
                        var configAdding = $(this).dialog('option','node-adding');
                        var configTypeDef = RED.nodes.getType(configType);
                        var configNode;
                        var d;
                        var input;

                        if (configAdding) {
                            configNode = {type:configType,id:configId,users:[]};
                            for (d in configTypeDef.defaults) {
                                if (configTypeDef.defaults.hasOwnProperty(d)) {
                                    input = $("#node-config-input-"+d);
                                    if (input.attr('type') === "checkbox") {
                                      configNode[d] = input.prop('checked');
                                    } else {
                                      configNode[d] = input.val();
                                    }
                                }
                            }
                            configNode.label = configTypeDef.label;
                            configNode._def = configTypeDef;
                            RED.nodes.add(configNode);
                            updateConfigNodeSelect(configProperty,configType,configNode.id);
                        } else {
                            configNode = RED.nodes.node(configId);
                            for (d in configTypeDef.defaults) {
                                if (configTypeDef.defaults.hasOwnProperty(d)) {
                                    input = $("#node-config-input-"+d);
                                    if (input.attr('type') === "checkbox") {
                                      configNode[d] = input.prop('checked');
                                    } else {
                                      configNode[d] = input.val();
                                    }
                                }
                            }
                            updateConfigNodeSelect(configProperty,configType,configId);
                        }
                        if (configTypeDef.credentials) {
                            updateNodeCredentials(configNode,configTypeDef.credentials,"node-config-input");
                        }
                        if (configTypeDef.oneditsave) {
                            configTypeDef.oneditsave.call(RED.nodes.node(configId));
                        }
                        validateNode(configNode);
                        for (var i=0;i<configNode.users.length;i++) {
                            var user = configNode.users[i];
                            validateNode(user);
                        }

                        RED.nodes.dirty(true);
                        $(this).dialog("close");

                    }
                },
                {
                    id: "node-config-dialog-cancel",
                    text: "Cancel",
                    click: function() {
                        var configType = $(this).dialog('option','node-type');
                        var configId = $(this).dialog('option','node-id');
                        var configAdding = $(this).dialog('option','node-adding');
                        var configTypeDef = RED.nodes.getType(configType);

                        if (configTypeDef.oneditcancel) {
                            // TODO: what to pass as this to call
                            if (configTypeDef.oneditcancel) {
                                var cn = RED.nodes.node(configId);
                                if (cn) {
                                    configTypeDef.oneditcancel.call(cn,false);
                                } else {
                                    configTypeDef.oneditcancel.call({id:configId},true);
                                }
                            }
                        }
                        $( this ).dialog( "close" );
                    }
                }
            ],
            resize: function(e,ui) {
            },
            open: function(e) {
                var minWidth = $(this).dialog('option','minWidth');
                if ($(this).outerWidth() < minWidth) {
                    $(this).dialog('option','width',minWidth);
                }
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.disable();
                }
            },
            close: function(e) {
                $(this).dialog('option','width','auto');
                $(this).dialog('option','height','auto');
                $("#dialog-config-form").html("");
                if (RED.view.state() != RED.state.EDITING) {
                    RED.keyboard.enable();
                }
                RED.sidebar.config.refresh();
            }
    });

    $( "#subflow-dialog" ).dialog({
        modal: true,
        autoOpen: false,
        dialogClass: "ui-dialog-no-close",
        closeOnEscape: false,
        minWidth: 500,
        width: 'auto',
        buttons: [
            {
                id: "subflow-dialog-ok",
                text: "Ok",
                click: function() {
                    if (editing_node) {
                        var i;
                        var changes = {};
                        var changed = false;
                        var wasDirty = RED.nodes.dirty();

                        var newName = $("#subflow-input-name").val();

                        if (newName != editing_node.name) {
                            changes['name'] = editing_node.name;
                            editing_node.name = newName;
                            changed = true;
                            $("#menu-item-workspace-menu-"+editing_node.id.replace(".","-")).text("Subflow: "+newName);
                        }

                        RED.palette.refresh();

                        if (changed) {
                            RED.nodes.eachNode(function(n) {
                                if (n.type == "subflow:"+editing_node.id) {
                                    n.changed = true;
                                    updateNodeProperties(n);
                                }
                            });
                            var wasChanged = editing_node.changed;
                            editing_node.changed = true;
                            RED.nodes.dirty(true);
                            var historyEvent = {
                                t:'edit',
                                node:editing_node,
                                changes:changes,
                                dirty:wasDirty,
                                changed:wasChanged
                            };

                            RED.history.push(historyEvent);
                        }
                        editing_node.dirty = true;
                        RED.view.redraw();
                    }
                    $( this ).dialog( "close" );
                }
            },
            {
                id: "subflow-dialog-cancel",
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                    editing_node = null;
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
            var minWidth = $(this).dialog('option','minWidth');
            if ($(this).outerWidth() < minWidth) {
                $(this).dialog('option','width',minWidth);
            }
        },
        close: function(e) {
            RED.keyboard.enable();

            if (RED.view.state() != RED.state.IMPORT_DRAGGING) {
                RED.view.state(RED.state.DEFAULT);
            }
            RED.sidebar.info.refresh(editing_node);
            editing_node = null;
        }
    });
    $("#subflow-dialog form" ).submit(function(e) { e.preventDefault();});


    function showEditSubflowDialog(subflow) {
        editing_node = subflow;
        RED.view.state(RED.state.EDITING);
        $("#subflow-input-name").val(subflow.name);
        var userCount = 0;
        var subflowType = "subflow:"+editing_node.id;

        RED.nodes.eachNode(function(n) {
            if (n.type === subflowType) {
                userCount++;
            }
        });

        $("#subflow-dialog-user-count").html("There "+(userCount==1?"is":"are")+" "+userCount+" instance"+(userCount==1?" ":"s")+" of this subflow").show();
        $("#subflow-dialog").dialog("option","title","Edit flow "+subflow.name).dialog( "open" );
    }



    return {
        edit: showEditDialog,
        editConfig: showEditConfigNodeDialog,
        editSubflow: showEditSubflowDialog,
        validateNode: validateNode,
        updateNodeProperties: updateNodeProperties, // TODO: only exposed for edit-undo

        createEditor: function(options) {
            var editor = ace.edit(options.id);
            editor.setTheme("ace/theme/tomorrow");
            var session = editor.getSession();
            if (options.mode) {
                session.setMode(options.mode);
            }
            if (options.foldStyle) {
                session.setFoldStyle(options.foldStyle);
            } else {
                session.setFoldStyle('markbeginend');
            }
            if (options.options) {
                editor.setOptions(options.options);
            } else {
                editor.setOptions({
                    enableBasicAutocompletion:true,
                    enableSnippets:true
                });
            }
            editor.$blockScrolling = Infinity;
            if (options.value) {
                session.setValue(options.value,-1);
            }
            return editor;
        }
    }
})();
;/**
 * Copyright 2015 IBM Corp.
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


RED.clipboard = (function() {
    
    var dialog = $('<div id="clipboard-dialog" class="hide"><form class="dialog-form form-horizontal"></form></div>')
        .appendTo("body")
        .dialog({
            modal: true,
            autoOpen: false,
            width: 500,
            resizable: false,
            buttons: [
                {
                    id: "clipboard-dialog-ok",
                    text: "Ok",
                    click: function() {
                        if (/Import/.test(dialog.dialog("option","title"))) {
                            RED.view.importNodes($("#clipboard-import").val());
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "clipboard-dialog-cancel",
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "clipboard-dialog-close",
                    text: "Close",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ],
            open: function(e) {
                $(this).parent().find(".ui-dialog-titlebar-close").hide();
                RED.keyboard.disable();
            },
            close: function(e) {
                RED.keyboard.enable();
            }
    });

    var dialogContainer = dialog.children(".dialog-form");
    
    var exportNodesDialog = '<div class="form-row">'+
        '<label for="node-input-export" style="display: block; width:100%;"><i class="fa fa-clipboard"></i> Nodes:</label>'+
        '<textarea readonly style="resize: none; width: 100%; border-radius: 0px;font-family: monospace; font-size: 12px; background:#eee; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-export" rows="5"></textarea>'+
        '</div>'+
        '<div class="form-tips">'+
        'Select the text above and copy to the clipboard with Ctrl-C.'+
        '</div>';
        
    var importNodesDialog = '<div class="form-row">'+
        '<textarea style="resize: none; width: 100%; border-radius: 0px;font-family: monospace; font-size: 12px; background:#eee; padding-left: 0.5em; box-sizing:border-box;" id="clipboard-import" rows="5" placeholder="Paste nodes here"></textarea>'+
        '</div>';

    function validateImport() {
        var importInput = $("#clipboard-import");
        var v = importInput.val();
        try {
            JSON.parse(v);
            importInput.removeClass("input-error");
            $("#clipboard-dialog-ok").button("enable");
        } catch(err) {
            if (v !== "") {
                importInput.addClass("input-error");
            }
            $("#clipboard-dialog-ok").button("disable");
        }
    }
    
    function importNodes() {
        dialogContainer.empty();
        dialogContainer.append($(importNodesDialog));
        $("#clipboard-dialog-ok").show();
        $("#clipboard-dialog-cancel").show();
        $("#clipboard-dialog-close").hide();
        $("#clipboard-dialog-ok").button("disable");
        $("#clipboard-import").keyup(validateImport);
        $("#clipboard-import").on('paste',function() { setTimeout(validateImport,10)});
        
        dialog.dialog("option","title","Import nodes").dialog("open");
    }

    function exportNodes() {
        dialogContainer.empty();
        dialogContainer.append($(exportNodesDialog));
        $("#clipboard-dialog-ok").hide();
        $("#clipboard-dialog-cancel").hide();
        $("#clipboard-dialog-close").show();
        var selection = RED.view.selection();
        if (selection.nodes) {
            var nns = RED.nodes.createExportableNodeSet(selection.nodes);
            $("#clipboard-export")
                .val(JSON.stringify(nns))
                .focus(function() {
                    var textarea = $(this);
                    textarea.select();
                    textarea.mouseup(function() {
                        textarea.unbind("mouseup");
                        return false;
                    })
                });
            dialog.dialog("option","title","Export nodes to clipboard").dialog( "open" );
        }
    }
    
    function hideDropTarget() {
        $("#dropTarget").hide();
        RED.keyboard.remove(/* ESCAPE */ 27);
    }
    
    return {
        init: function() {
            RED.view.on("selection-changed",function(selection) {
                if (!selection.nodes) {
                    RED.menu.setDisabled("menu-item-export",true);
                    RED.menu.setDisabled("menu-item-export-clipboard",true);
                    RED.menu.setDisabled("menu-item-export-library",true);
                } else {
                    RED.menu.setDisabled("menu-item-export",false);
                    RED.menu.setDisabled("menu-item-export-clipboard",false);
                    RED.menu.setDisabled("menu-item-export-library",false);
                }
            });
            RED.keyboard.add(/* e */ 69,{ctrl:true},function(){exportNodes();d3.event.preventDefault();});
            RED.keyboard.add(/* i */ 73,{ctrl:true},function(){importNodes();d3.event.preventDefault();});
            
            
            
            $('#chart').on("dragenter",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
                    $("#dropTarget").css({display:'table'});
                    RED.keyboard.add(/* ESCAPE */ 27,hideDropTarget);
                }
            });
            
            $('#dropTarget').on("dragover",function(event) {
                if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
                    event.preventDefault();
                }
            })
            .on("dragleave",function(event) {
                hideDropTarget();
            })
            .on("drop",function(event) {
                var data = event.originalEvent.dataTransfer.getData("text/plain");
                hideDropTarget();
                RED.view.importNodes(data);
                event.preventDefault();
            });
            
            
        },
        import: importNodes,
        export: exportNodes
    }
        
        
        
        
        
})();
;/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.library = (function() {
    
    
    function loadFlowLibrary() {
        $.getJSON("library/flows",function(data) {
            //console.log(data);

            var buildMenu = function(data,root) {
                var i;
                var li;
                var a;
                var ul = document.createElement("ul");
                ul.id = "menu-item-import-library-submenu";
                ul.className = "dropdown-menu";
                if (data.d) {
                    for (i in data.d) {
                        if (data.d.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            li.className = "dropdown-submenu pull-left";
                            a = document.createElement("a");
                            a.href="#";
                            a.innerHTML = i;
                            li.appendChild(a);
                            li.appendChild(buildMenu(data.d[i],root+(root!==""?"/":"")+i));
                            ul.appendChild(li);
                        }
                    }
                }
                if (data.f) {
                    for (i in data.f) {
                        if (data.f.hasOwnProperty(i)) {
                            li = document.createElement("li");
                            a = document.createElement("a");
                            a.href="#";
                            a.innerHTML = data.f[i];
                            a.flowName = root+(root!==""?"/":"")+data.f[i];
                            a.onclick = function() {
                                $.get('library/flows/'+this.flowName, function(data) {
                                        RED.view.importNodes(data);
                                });
                            };
                            li.appendChild(a);
                            ul.appendChild(li);
                        }
                    }
                }
                return ul;
            };
            var menu = buildMenu(data,"");
            //TODO: need an api in RED.menu for this
            $("#menu-item-import-library-submenu").replaceWith(menu);
        });
    }
    
    function createUI(options) {
        var libraryData = {};
        var selectedLibraryItem = null;
        var libraryEditor = null;
        
        // Orion editor has set/getText
        // ACE editor has set/getValue
        // normalise to set/getValue
        if (options.editor.setText) {
            // Orion doesn't like having pos passed in, so proxy the call to drop it
            options.editor.setValue = function(text,pos) {
                options.editor.setText.call(options.editor,text);
            }
        }
        if (options.editor.getText) {
            options.editor.getValue = options.editor.getText;
        }
        
        function buildFileListItem(item) {
            var li = document.createElement("li");
            li.onmouseover = function(e) { $(this).addClass("list-hover"); };
            li.onmouseout = function(e) { $(this).removeClass("list-hover"); };
            return li;
        }
        
        function buildFileList(root,data) {
            var ul = document.createElement("ul");
            var li;
            for (var i=0;i<data.length;i++) {
                var v = data[i];
                if (typeof v === "string") {
                    // directory
                    li = buildFileListItem(v);
                    li.onclick = (function () {
                        var dirName = v;
                        return function(e) {
                            var bcli = $('<li class="active"><span class="divider">/</span> <a href="#">'+dirName+'</a></li>');
                            $("a",bcli).click(function(e) { 
                                $(this).parent().nextAll().remove();
                                $.getJSON("library/"+options.url+root+dirName,function(data) {
                                    $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                                });
                                e.stopPropagation();
                            });
                            var bc = $("#node-dialog-library-breadcrumbs");
                            $(".active",bc).removeClass("active");
                            bc.append(bcli);
                            $.getJSON("library/"+options.url+root+dirName,function(data) {
                                    $("#node-select-library").children().first().replaceWith(buildFileList(root+dirName+"/",data));
                            });
                        }
                    })();
                    li.innerHTML = '<i class="fa fa-folder"></i> '+v+"</i>";
                    ul.appendChild(li);
                } else {
                    // file
                   li = buildFileListItem(v);
                   li.innerHTML = v.name;
                   li.onclick = (function() {
                       var item = v;
                       return function(e) {
                           $(".list-selected",ul).removeClass("list-selected");
                           $(this).addClass("list-selected");
                           $.get("library/"+options.url+root+item.fn, function(data) {
                                   selectedLibraryItem = item;
                                   libraryEditor.setValue(data,-1);
                           });
                       }
                   })();
                   ul.appendChild(li);
                }
            }
            return ul;
        }
    
        $('#node-input-name').addClass('input-append-left').css("width","65%").after(
            '<div class="btn-group" style="margin-left: 0px;">'+
            '<button id="node-input-'+options.type+'-lookup" class="btn input-append-right" data-toggle="dropdown"><i class="fa fa-book"></i> <i class="fa fa-caret-down"></i></button>'+
            '<ul class="dropdown-menu pull-right" role="menu">'+
            '<li><a id="node-input-'+options.type+'-menu-open-library" tabindex="-1" href="#">Open Library...</a></li>'+
            '<li><a id="node-input-'+options.type+'-menu-save-library" tabindex="-1" href="#">Save to Library...</a></li>'+
            '</ul></div>'
        );
    
        
        
        $('#node-input-'+options.type+'-menu-open-library').click(function(e) {
            $("#node-select-library").children().remove();
            var bc = $("#node-dialog-library-breadcrumbs");
            bc.children().first().nextAll().remove();
            libraryEditor.setValue('',-1);
            
            $.getJSON("library/"+options.url,function(data) {
                $("#node-select-library").append(buildFileList("/",data));
                $("#node-dialog-library-breadcrumbs a").click(function(e) {
                    $(this).parent().nextAll().remove();
                    $("#node-select-library").children().first().replaceWith(buildFileList("/",data));
                    e.stopPropagation();
                });
                $( "#node-dialog-library-lookup" ).dialog( "open" );
            });
            
            e.preventDefault();
        });
    
        $('#node-input-'+options.type+'-menu-save-library').click(function(e) {
            //var found = false;
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");

            //var buildPathList = function(data,root) {
            //    var paths = [];
            //    if (data.d) {
            //        for (var i in data.d) {
            //            var dn = root+(root==""?"":"/")+i;
            //            var d = {
            //                label:dn,
            //                files:[]
            //            };
            //            for (var f in data.d[i].f) {
            //                d.files.push(data.d[i].f[f].fn.split("/").slice(-1)[0]);
            //            }
            //            paths.push(d);
            //            paths = paths.concat(buildPathList(data.d[i],root+(root==""?"":"/")+i));
            //        }
            //    }
            //    return paths;
            //};
            $("#node-dialog-library-save-folder").attr("value","");

            var filename = name.replace(/[^\w-]/g,"-");
            if (filename === "") {
                filename = "unnamed-"+options.type;
            }
            $("#node-dialog-library-save-filename").attr("value",filename+".js");

            //var paths = buildPathList(libraryData,"");
            //$("#node-dialog-library-save-folder").autocomplete({
            //        minLength: 0,
            //        source: paths,
            //        select: function( event, ui ) {
            //            $("#node-dialog-library-save-filename").autocomplete({
            //                    minLength: 0,
            //                    source: ui.item.files
            //            });
            //        }
            //});

            $( "#node-dialog-library-save" ).dialog( "open" );
            e.preventDefault();
        });
    
        libraryEditor = ace.edit('node-select-library-text');
        libraryEditor.setTheme("ace/theme/tomorrow");
        if (options.mode) {
            libraryEditor.getSession().setMode(options.mode);
        }
        libraryEditor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        libraryEditor.renderer.$cursorLayer.element.style.opacity=0;
        libraryEditor.$blockScrolling = Infinity;
        
        $( "#node-dialog-library-lookup" ).dialog({
            title: options.type+" library",
            modal: true,
            autoOpen: false,
            width: 800,
            height: 450,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        if (selectedLibraryItem) {
                            for (var i=0;i<options.fields.length;i++) {
                                var field = options.fields[i];
                                $("#node-input-"+field).val(selectedLibraryItem[field]);
                            }
                            options.editor.setValue(libraryEditor.getValue(),-1);
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ],
            open: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $("#node-select-library-text").height("100%");
                $(".form-row:last-child",form).children().height(form.height()-60);
            },
            resize: function(e) {
                var form = $("form",this);
                form.height(form.parent().height()-30);
                $(".form-row:last-child",form).children().height(form.height()-60);
            }
        });
        
        function saveToLibrary(overwrite) {
            var name = $("#node-input-name").val().replace(/(^\s*)|(\s*$)/g,"");
            if (name === "") {
                name = "Unnamed "+options.type;
            }
            var filename = $("#node-dialog-library-save-filename").val().replace(/(^\s*)|(\s*$)/g,"");
            var pathname = $("#node-dialog-library-save-folder").val().replace(/(^\s*)|(\s*$)/g,"");
            if (filename === "" || !/.+\.js$/.test(filename)) {
                RED.notify("Invalid filename","warning");
                return;
            }
            var fullpath = pathname+(pathname===""?"":"/")+filename;
            if (!overwrite) {
                //var pathnameParts = pathname.split("/");
                //var exists = false;
                //var ds = libraryData;
                //for (var pnp in pathnameParts) {
                //    if (ds.d && pathnameParts[pnp] in ds.d) {
                //        ds = ds.d[pathnameParts[pnp]];
                //    } else {
                //        ds = null;
                //        break;
                //    }
                //}
                //if (ds && ds.f) {
                //    for (var f in ds.f) {
                //        if (ds.f[f].fn == fullpath) {
                //            exists = true;
                //            break;
                //        }
                //    }
                //}
                //if (exists) {
                //    $("#node-dialog-library-save-type").html(options.type);
                //    $("#node-dialog-library-save-name").html(fullpath);
                //    $("#node-dialog-library-save-confirm").dialog( "open" );
                //    return;
                //}
            }
            var queryArgs = [];
            var data = {};
            for (var i=0;i<options.fields.length;i++) {
                var field = options.fields[i];
                if (field == "name") {
                    data.name = name;
                } else {
                    data[field] = $("#node-input-"+field).val();
                }
            }
            
            data.text = options.editor.getValue();
            $.ajax({
                url:"library/"+options.url+'/'+fullpath,
                type: "POST",
                data: JSON.stringify(data),
                contentType: "application/json; charset=utf-8"
            }).done(function(data,textStatus,xhr) {
                RED.notify("Saved "+options.type,"success");
            }).fail(function(xhr,textStatus,err) {
                RED.notify("Saved failed: "+xhr.responseJSON.message,"error");
            });
        }
        $( "#node-dialog-library-save-confirm" ).dialog({
            title: "Save to library",
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        saveToLibrary(true);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });
        $( "#node-dialog-library-save" ).dialog({
            title: "Save to library",
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: "Ok",
                    click: function() {
                        saveToLibrary(false);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
        });

    }
    
    function exportFlow() {
        //TODO: don't rely on the main dialog
        var nns = RED.nodes.createExportableNodeSet(RED.view.selection().nodes);
        $("#dialog-form").html($("script[data-template-name='export-library-dialog']").html());
        $("#node-input-filename").attr('nodes',JSON.stringify(nns));
        $( "#dialog" ).dialog("option","title","Export nodes to library").dialog( "open" );
    }
    
    return {
        init: function() {
            RED.view.on("selection-changed",function(selection) {
                if (!selection.nodes) {
                    RED.menu.setDisabled("menu-item-export",true);
                    RED.menu.setDisabled("menu-item-export-clipboard",true);
                    RED.menu.setDisabled("menu-item-export-library",true);
                } else {
                    RED.menu.setDisabled("menu-item-export",false);
                    RED.menu.setDisabled("menu-item-export-clipboard",false);
                    RED.menu.setDisabled("menu-item-export-library",false);
                }
            });
            
            if (RED.settings.theme("menu.menu-item-import-library") !== false) { 
                loadFlowLibrary();
            }
        },
        create: createUI,
        loadFlowLibrary: loadFlowLibrary,
        
        export: exportFlow
    }
})();


;/**
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
RED.notify = (function() {
    var currentNotifications = [];
    var c = 0;
    return function(msg,type,fixed,timeout) {
        if (currentNotifications.length > 4) {
            var ll = currentNotifications.length;
            for (var i = 0;ll > 4 && i<currentNotifications.length;i+=1) {
                var notifiction = currentNotifications[i];
                if (!notifiction.fixed) {
                    window.clearTimeout(notifiction.timeoutid);
                    notifiction.close();
                    ll -= 1;
                }
            }
        }
        var n = document.createElement("div");
        n.id="red-notification-"+c;
        n.className = "alert";
        n.fixed = fixed;
        if (type) {
            n.className = "alert alert-"+type;
        }
        n.style.display = "none";
        n.innerHTML = msg;
        $("#notifications").append(n);
        $(n).slideDown(300);
        n.close = (function() {
            var nn = n;
            return function() {
                currentNotifications.splice(currentNotifications.indexOf(nn),1);
                $(nn).slideUp(300, function() {
                        nn.parentNode.removeChild(nn);
                });
            };
        })();
        if (!fixed) {
            n.timeoutid = window.setTimeout(n.close,timeout||3000);
        }
        currentNotifications.push(n);
        c+=1;
        return n;
    }
})();

;/**
 * Copyright 2015 IBM Corp.
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

RED.subflow = (function() {
        

    function getSubflow() {
        return RED.nodes.subflow(RED.workspaces.active());
    }
    
    function findAvailableSubflowIOPosition(subflow) {
        var pos = {x:70,y:70};
        for (var i=0;i<subflow.out.length+subflow.in.length;i++) {
            var port;
            if (i < subflow.out.length) {
                port = subflow.out[i];
            } else {
                port = subflow.in[i-subflow.out.length];
            }
            if (port.x == pos.x && port.y == pos.y) {
                pos.x += 55;
                i=0;
            }
        }
        return pos;
    }
    
    function addSubflowInput() {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        var position = findAvailableSubflowIOPosition(subflow);
        var newInput = {
            type:"subflow",
            direction:"in",
            z:subflow.id,
            i:subflow.in.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldInCount = subflow.in.length;
        subflow.in.push(newInput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        
        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+subflow.id) {
                n.changed = true;
                n.inputs = subflow.in.length;
                RED.editor.updateNodeProperties(n);
            }
        });
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                inputCount: oldInCount
            }
        };
        RED.history.push(historyEvent);
        $("#workspace-subflow-add-input").toggleClass("disabled",true);
        RED.view.select();
    }
    
    function addSubflowOutput(id) {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        var position = findAvailableSubflowIOPosition(subflow);
        
        var newOutput = {
            type:"subflow",
            direction:"out",
            z:subflow.id,
            i:subflow.out.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldOutCount = subflow.out.length;
        subflow.out.push(newOutput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        
        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+subflow.id) {
                n.changed = true;
                n.outputs = subflow.out.length;
                RED.editor.updateNodeProperties(n);
            }
        });
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                outputCount: oldOutCount
            }
        };
        RED.history.push(historyEvent);
        RED.view.select();
    }
    
    function init() {
        $("#workspace-subflow-edit").click(function(event) {
            RED.editor.editSubflow(RED.nodes.subflow(RED.workspaces.active()));
            event.preventDefault();
        });
        $("#workspace-subflow-add-input").click(function(event) {
            event.preventDefault();
            if ($(this).hasClass("disabled")) {
                return;
            }
            addSubflowInput();
        });
        $("#workspace-subflow-add-output").click(function(event) {
            event.preventDefault();
            if ($(this).hasClass("disabled")) {
                return;
            }
            addSubflowOutput();
        });
        
        $("#workspace-subflow-delete").click(function(event) {
            event.preventDefault();
            var removedNodes = [];
            var removedLinks = [];
            var startDirty = RED.nodes.dirty();
            
            RED.nodes.eachNode(function(n) {
                if (n.type == "subflow:"+getSubflow().id) {
                    removedNodes.push(n);
                }
                if (n.z == getSubflow().id) {
                    removedNodes.push(n);
                }
            });
            
            for (var i=0;i<removedNodes.length;i++) {
                var rmlinks = RED.nodes.remove(removedNodes[i].id);
                removedLinks = removedLinks.concat(rmlinks);
            }
            
            var activeSubflow = getSubflow();
            
            RED.nodes.removeSubflow(activeSubflow);
            
            RED.history.push({
                    t:'delete',
                    nodes:removedNodes,
                    links:removedLinks,
                    subflow: activeSubflow,
                    dirty:startDirty
            });
            
            RED.workspaces.remove(activeSubflow);
            RED.nodes.dirty(true);
            RED.view.redraw();
        });
        
        RED.view.on("selection-changed",function(selection) {
            if (!selection.nodes) {
                RED.menu.setDisabled("menu-item-subflow-convert",true);
            } else {
                RED.menu.setDisabled("menu-item-subflow-convert",false);
            }
        });
        
    }
        
    function createSubflow() {
        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });
        
        var name = "Subflow "+(lastIndex+1);
           
        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            in: [],
            out: []
        };
        RED.nodes.addSubflow(subflow);
        RED.history.push({
            t:'createSubflow',
            subflow: subflow,
            dirty:RED.nodes.dirty()
        });
        RED.workspaces.show(subflowId);
    }
        
    function convertToSubflow() {
        var selection = RED.view.selection();
        if (!selection.nodes) {
            RED.notify("<strong>Cannot create subflow</strong>: no nodes selected","error");
            return;
        }
        var i;
        var nodes = {};
        var new_links = [];
        var removedLinks = [];
        
        var candidateInputs = [];
        var candidateOutputs = [];
        
        var boundingBox = [selection.nodes[0].x,
            selection.nodes[0].y,
            selection.nodes[0].x,
            selection.nodes[0].y];
        
        for (i=0;i<selection.nodes.length;i++) {
            var n = selection.nodes[i];
            nodes[n.id] = {n:n,outputs:{}};
            boundingBox = [
                Math.min(boundingBox[0],n.x),
                Math.min(boundingBox[1],n.y),
                Math.max(boundingBox[2],n.x),
                Math.max(boundingBox[3],n.y)
            ]
        }
        
        var center = [(boundingBox[2]+boundingBox[0]) / 2,(boundingBox[3]+boundingBox[1]) / 2];
        
        RED.nodes.eachLink(function(link) {
            if (nodes[link.source.id] && nodes[link.target.id]) {
                // A link wholely within the selection
            }
            
            if (nodes[link.source.id] && !nodes[link.target.id]) {
                // An outbound link from the selection
                candidateOutputs.push(link);
                removedLinks.push(link);
            }
            if (!nodes[link.source.id] && nodes[link.target.id]) {
                // An inbound link
                candidateInputs.push(link);
                removedLinks.push(link);
            }
        });
        
        var outputs = {};
        candidateOutputs = candidateOutputs.filter(function(v) {
             if (outputs[v.source.id+":"+v.sourcePort]) {
                 outputs[v.source.id+":"+v.sourcePort].targets.push(v.target);
                 return false;
             }
             v.targets = [];
             v.targets.push(v.target);
             outputs[v.source.id+":"+v.sourcePort] = v;
             return true;
        });
        candidateOutputs.sort(function(a,b) { return a.source.y-b.source.y});
        
        if (candidateInputs.length > 1) {
             RED.notify("<strong>Cannot create subflow</strong>: multiple inputs to selection","error");
             return;
        }
        //if (candidateInputs.length == 0) {
        //     RED.notify("<strong>Cannot create subflow</strong>: no input to selection","error");
        //     return;
        //}
        
        
        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });
        
        var name = "Subflow "+(lastIndex+1);
           
        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            in: candidateInputs.map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:v.target.x-(v.target.w/2)-80,
                y:v.target.y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:v.target.id}]
            }}),
            out: candidateOutputs.map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:v.source.x+(v.source.w/2)+80,
                y:v.source.y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:v.source.id,port:v.sourcePort}]
            }})
        };
        RED.nodes.addSubflow(subflow);
    
        var subflowInstance = {
            id:RED.nodes.id(),
            type:"subflow:"+subflow.id,
            x: center[0],
            y: center[1],
            z: RED.workspaces.active(),
            inputs: subflow.in.length,
            outputs: subflow.out.length,
            h: Math.max(30/*node_height*/,(subflow.out.length||0) * 15),
            changed:true
        }
        subflowInstance._def = RED.nodes.getType(subflowInstance.type);
        RED.editor.validateNode(subflowInstance);
        RED.nodes.add(subflowInstance);
        
        candidateInputs.forEach(function(l) {
            var link = {source:l.source, sourcePort:l.sourcePort, target: subflowInstance};
            new_links.push(link);
            RED.nodes.addLink(link);
        });
        
        candidateOutputs.forEach(function(output,i) {
            output.targets.forEach(function(target) {
                var link = {source:subflowInstance, sourcePort:i, target: target};
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });
        
        subflow.in.forEach(function(input) {
            input.wires.forEach(function(wire) {
                var link = {source: input, sourcePort: 0, target: RED.nodes.node(wire.id) }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });
        subflow.out.forEach(function(output,i) {
            output.wires.forEach(function(wire) {
                var link = {source: RED.nodes.node(wire.id), sourcePort: wire.port , target: output }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });
        
        for (i=0;i<removedLinks.length;i++) {
            RED.nodes.removeLink(removedLinks[i]);
        }
        
        for (i=0;i<selection.nodes.length;i++) {
            selection.nodes[i].z = subflow.id;
        }
    
        RED.history.push({
            t:'createSubflow',
            nodes:[subflowInstance.id],
            links:new_links,
            subflow: subflow,
    
            activeWorkspace: RED.workspaces.active(),
            removedLinks: removedLinks,
            
            dirty:RED.nodes.dirty()
        });
        
        RED.editor.validateNode(subflow);
        RED.nodes.dirty(true);
        RED.view.redraw(true);
    }
    
    
    
    return {
        init: init,
        createSubflow: createSubflow,
        convertToSubflow: convertToSubflow
    }
})();
;/**
 * Copyright 2014 IBM Corp.
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

RED.touch = RED.touch||{};
RED.touch.radialMenu = (function() {
    
    
    var touchMenu = null;
    var isActive = false;
    var isOutside = false;
    var activeOption = null;

    
    function createRadial(obj,pos,options) {
        isActive = true;
        try {
            var w = $("body").width();
            var h = $("body").height();
            
            touchMenu = d3.select("body").append("div")
                .style({
                        position:"absolute",
                        top: 0,
                        left:0,
                        bottom:0,
                        right:0,
                        "z-index": 1000
                })
                .on('touchstart',function() {
                    hide();
                    d3.event.preventDefault();
                });
                    
            

    
            var menu = touchMenu.append("div")
                .style({
                        position: "absolute",
                        top: (pos[1]-80)+"px",
                        left:(pos[0]-80)+"px",
                        "border-radius": "80px",
                        width: "160px",
                        height: "160px",
                        background: "rgba(255,255,255,0.6)",
                        border: "1px solid #666"
                });
                
            var menuOpts = [];
            var createMenuOpt = function(x,y,opt) {
                opt.el = menu.append("div")
                    .style({
                        position: "absolute",
                        top: (y+80-25)+"px",
                        left:(x+80-25)+"px",
                        "border-radius": "20px",
                        width: "50px",
                        height: "50px",
                        background: "#fff",
                        border: "2px solid #666",
                        "text-align": "center",
                        "line-height":"50px"
                    });
                    
                opt.el.html(opt.name);
                
                if (opt.disabled) {
                    opt.el.style({"border-color":"#ccc",color:"#ccc"});
                }
                opt.x = x;
                opt.y = y;
                menuOpts.push(opt);
                
                opt.el.on('touchstart',function() {
                    opt.el.style("background","#999");
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
                opt.el.on('touchend',function() {
                    hide();
                    opt.onselect();
                    d3.event.preventDefault();
                    d3.event.stopPropagation();
                });
            }
            
            var n = options.length;
            var dang = Math.max(Math.PI/(n-1),Math.PI/4);
            var ang = Math.PI;
            for (var i=0;i<n;i++) {
                var x = Math.floor(Math.cos(ang)*80);
                var y = Math.floor(Math.sin(ang)*80);
                if (options[i].name) {
                    createMenuOpt(x,y,options[i]);
                }
                ang += dang;
            }
            

            var hide = function() {
                isActive = false;
                activeOption = null;
                touchMenu.remove();
                touchMenu = null;
            }
                    
            obj.on('touchend.radial',function() {
                    obj.on('touchend.radial',null);
                    obj.on('touchmenu.radial',null);
                    
                    if (activeOption) {
                        try {
                            activeOption.onselect();
                        } catch(err) {
                            RED._debug(err);
                        }
                        hide();
                    } else if (isOutside) {
                        hide();
                    }
            });


            
            obj.on('touchmove.radial',function() {
            try {
                var touch0 = d3.event.touches.item(0);
                var p = [touch0.pageX - pos[0],touch0.pageY-pos[1]];
                for (var i=0;i<menuOpts.length;i++) {
                    var opt = menuOpts[i];
                    if (!opt.disabled) {
                        if (p[0]>opt.x-30 && p[0]<opt.x+30 && p[1]>opt.y-30 && p[1]<opt.y+30) {
                            if (opt !== activeOption) {
                                opt.el.style("background","#999");
                                activeOption = opt;
                            }
                        } else if (opt === activeOption) {
                            opt.el.style("background","#fff");
                            activeOption = null;
                        } else {
                            opt.el.style("background","#fff");
                        }
                    }
                }
                if (!activeOption) {
                    var d = Math.abs((p[0]*p[0])+(p[1]*p[1]));
                    isOutside = (d > 80*80);
                }
                
            } catch(err) {
                RED._debug(err);
            }

                
            });
            
        } catch(err) {
            RED._debug(err);
        }
    }    

    
    return {
        show: createRadial,
        active: function() {
            return isActive;
        }
    }

})();

