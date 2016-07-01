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
    var ntwitter = null;
    var OAuth= null;
    var request = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                var ntwitter = require('twitter-ng');
                var OAuth= require('oauth').OAuth;
                var request = require('request');
            }
        }
    }
    
    function TwitterNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.screen_name = n.screen_name;
        this.consumer_key = n.consumer_key;
        this.consumer_secret = n.consumer_secret;
        this.access_token = n.access_token;
        this.access_token_secret = n.access_token_secret;
    }
    RED.nodes.registerType("twitter-credentials",TwitterNode);

    function TwitterInNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.active = true;
        this.user = n.user;
        //this.tags = n.tags.replace(/ /g,'');
        this.tags = n.tags;
        this.twitter = n.twitter;
        this.topic = n.topic||"tweets";
        this.twitterConfig = RED.nodes.getNode(this.twitter);

        var oa = new OAuth(
            "https://api.twitter.com/oauth/request_token",
            "https://api.twitter.com/oauth/access_token",
            this.twitterConfig.access_token,
            this.twitterConfig.access_token_secret,
            "1.0",
            null,
            "HMAC-SHA1"
        );

        if (RED.device)
        {

            if (this.twitterConfig.screen_name) {
                // console.log (this.twitterConfig.consumer_key);
                // console.log (this.twitterConfig.consumer_secret);
                // console.log (this.twitterConfig.access_token);
                // console.log (this.twitterConfig.access_token_secret);
                var twit = new ntwitter({
                    consumer_key: this.twitterConfig.consumer_key,
                    consumer_secret: this.twitterConfig.consumer_secret,
                    access_token_key: this.twitterConfig.access_token,
                    access_token_secret: this.twitterConfig.access_token_secret
                });


                //setInterval(function() {
                //        twit.get("/application/rate_limit_status.json",null,function(err,cb) {
                //                console.log("direct_messages:",cb["resources"]["direct_messages"]);
                //        });
                //
                //},10000);

                var node = this;
                if (this.user === "user") {
                    node.poll_ids = [];
                    node.since_ids = {};
                    var users = node.tags.split(",");
                    for (var i=0;i<users.length;i++) {
                        var user = users[i].replace(" ","");
                        twit.getUserTimeline({
                                screen_name:user,
                                trim_user:0,
                                count:1
                        },function() {
                            var u = user+"";
                            return function(err,cb) {
                                if (err) {
                                    node.error(err);
                                    return;
                                }
                                if (cb[0]) {
                                    node.since_ids[u] = cb[0].id_str;
                                } else {
                                    node.since_ids[u] = '0';
                                }
                                node.poll_ids.push(setInterval(function() {
                                    twit.getUserTimeline({
                                            screen_name:u,
                                            trim_user:0,
                                            since_id:node.since_ids[u]
                                    },function(err,cb) {
                                        if (cb) {
                                            for (var t=cb.length-1;t>=0;t-=1) {
                                                var tweet = cb[t];
                                                var where = tweet.user.location||"";
                                                var la = tweet.lang || tweet.user.lang;
                                                //console.log(tweet.user.location,"=>",tweet.user.screen_name,"=>",pay);
                                                var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, location:where, lang:la, tweet:tweet };
                                                node.send(msg);
                                                if (t == 0) {
                                                    node.since_ids[u] = tweet.id_str;
                                                }
                                            }
                                        }
                                        if (err) {
                                            node.error(err);
                                        }
                                    });
                                },60000));
                            }
                        }());
                    }
                } else if (this.user === "dm") {
                    node.poll_ids = [];
                    twit.getDirectMessages({
                            screen_name:node.twitterConfig.screen_name,
                            trim_user:0,
                            count:1
                    },function(err,cb) {
                        if (err) {
                            node.error(err);
                            return;
                        }
                        if (cb[0]) {
                            node.since_id = cb[0].id_str;
                        } else {
                            node.since_id = '0';
                        }
                        node.poll_ids.push(setInterval(function() {
                                twit.getDirectMessages({
                                        screen_name:node.twitterConfig.screen_name,
                                        trim_user:0,
                                        since_id:node.since_id
                                },function(err,cb) {
                                    if (cb) {
                                        for (var t=cb.length-1;t>=0;t-=1) {
                                            var tweet = cb[t];
                                            var msg = { topic:node.topic+"/"+tweet.sender.screen_name, payload:tweet.text, tweet:tweet };
                                            node.send(msg);
                                            if (t == 0) {
                                                node.since_id = tweet.id_str;
                                            }
                                        }
                                    }
                                    if (err) {
                                        node.error(err);
                                    }
                                });
                        },120000));
                    });

                } else if (this.tags !== "") {
                    try {
                        var thing = 'statuses/filter';
                        if (this.user === "true") { thing = 'user'; }
                        var st = { track: [node.tags] };
                        var bits = node.tags.split(",");
                        if ((bits.length > 0) && (bits.length % 4 == 0)) {
                            if ((Number(bits[0]) < Number(bits[2])) && (Number(bits[1]) < Number(bits[3]))) {
                                st = { locations: node.tags };
                            }
                            else {
                                node.log("possible bad geo area format. Should be lower-left lon, lat, upper-right lon, lat");
                            }
                        }

                        var setupStream = function() {
                            if (node.active) {
                                twit.stream(thing, st, function(stream) {
                                    //console.log(st);
                                    //twit.stream('user', { track: [node.tags] }, function(stream) {
                                    //twit.stream('site', { track: [node.tags] }, function(stream) {
                                    //twit.stream('statuses/filter', { track: [node.tags] }, function(stream) {
                                    node.stream = stream;
                                    stream.on('data', function(tweet) {
                                        //console.log(tweet.user);
                                        //console.log (tweet);
                                        if (tweet.user !== undefined) {
                                            var where = tweet.user.location||"";
                                            var la = tweet.lang || tweet.user.lang;
                                            //console.log(tweet.user.location,"=>",tweet.user.screen_name,"=>",pay);
                                            var msg = { topic:node.topic+"/"+tweet.user.screen_name, payload:tweet.text, location:where, lang:la, tweet:tweet };
                                            node.send(msg);
                                        }
                                    });
                                    stream.on('limit', function(tweet) {
                                        node.log("tweet rate limit hit");
                                    });
                                    stream.on('error', function(tweet,rc) {
                                        if (rc == 420) {
                                            node.warn("Twitter rate limit hit");
                                        } else {
                                            node.warn("Stream error:"+tweet.toString()+" ("+rc+")");
                                        }
                                        setTimeout(setupStream,10000);
                                    });
                                    stream.on('destroy', function (response) {
                                        if (this.active) {
                                            node.warn("twitter ended unexpectedly");
                                            setTimeout(setupStream,10000);
                                        }
                                    });
                                });
                            }
                        }
                        setupStream();
                    }
                    catch (err) {
                        node.error(err);
                    }
                } else {
                    this.error("Invalid tag property");
                }
            } else {
                this.error("missing twitter credentials");
            }

            this.on('close', function() {
                if (this.stream) {
                    this.active = false;
                    this.stream.destroy();
                }
                if (this.poll_ids) {
                    for (var i=0;i<this.poll_ids.length;i++) {
                        clearInterval(this.poll_ids[i]);
                    }
                }
            });
        }
    }
    RED.nodes.registerType("twitter in",TwitterInNode);


    function TwitterOutNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.twitter = n.twitter;
        this.twitterConfig = RED.nodes.getNode(this.twitter);
        var oa = new OAuth(
            "https://api.twitter.com/oauth/request_token",
            "https://api.twitter.com/oauth/access_token",
            this.twitterConfig.access_token,
            this.twitterConfig.access_token_secret,
            "1.0",
            null,
            "HMAC-SHA1"
        );
        var node = this;

        if (this.twitterConfig.screen_name) {
            var twit = new ntwitter({
                consumer_key: this.twitterConfig.consumer_key,
                consumer_secret: this.twitterConfig.consumer_secret,
                access_token_key: this.twitterConfig.access_token,
                access_token_secret: this.twitterConfig.access_token_secret
            });
            node.on("input", function(msg) {
                node.status({fill:"blue",shape:"dot",text:"tweeting"});

                if (msg.payload.length > 140) {
                    msg.payload = msg.payload.slice(0,139);
                    node.warn("Tweet greater than 140 : truncated");
                }

                if (msg.media && Buffer.isBuffer(msg.media)) {
                    var apiUrl = "https://api.twitter.com/1.1/statuses/update_with_media.json";
                    var signedUrl = oa.signUrl(apiUrl,
                        credentials.access_token,
                        credentials.access_token_secret,
                        "POST");

                    var r = request.post(signedUrl,function(err,httpResponse,body) {
                        if (err) {
                            node.error(err.toString());
                            node.status({fill:"red",shape:"ring",text:"failed"});
                        } else {
                            var response = JSON.parse(body);
                            if (body.errors) {
                                var errorList = body.errors.map(function(er) { return er.code+": "+er.message }).join(", ");
                                node.error("tweet failed: "+errorList);
                                node.status({fill:"red",shape:"ring",text:"failed"});
                            } else {
                                node.status({});
                            }
                        }
                    });
                    var form = r.form();
                    form.append("status",msg.payload);
                    form.append("media[]",msg.media,{filename:"image"});

                } else {
                    twit.updateStatus(msg.payload, function (err, data) {
                        if (err) {
                            node.status({fill:"red",shape:"ring",text:"failed"});
                            node.error(err);
                        }
                        node.status({});
                    });
                }
            });
        }
    }
    RED.nodes.registerType("twitter out",TwitterOutNode);

}
