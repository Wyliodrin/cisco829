/**
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
    var util = require("util");
    // var debuglength = RED.settings.debugMaxLength||1000;
    var useColors = false;
    // util.inspect.styles.boolean = "red";
    
    function PrintNode(n) {
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.complete = n.complete;
        this.field = n.field;
        this.active = (n.active == null)||n.active;
        var node = this;
    
        this.on("input",function(msg) {
            if (this.active)
            {
                if (this.complete == "true") { // debug complete msg object
                    console.log(util.inspect(msg, {colors:useColors, depth:10}));
                } 
                else 
                { // debug just the msg.payload
                    if (this.field && this.field.length > 0)
                    {
                        console.log(util.inspect(msg[this.field], {colors:useColors}));
                    }
                    else
                    if (typeof msg.payload === "string") {
                        console.log(msg.payload);
                    }
                    else if (typeof msg.payload === "object") { console.log(util.inspect(msg.payload, {colors:useColors, depth:10})); }
                    else { console.log(util.inspect(msg.payload, {colors:useColors})); }
                }
            }
        });
    }
   
    RED.nodes.registerType("print",PrintNode);
}
