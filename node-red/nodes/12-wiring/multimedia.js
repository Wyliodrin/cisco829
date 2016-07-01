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
    
    var child_process = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                child_process = require ('child_process');
            }
        }
    }

    function SayNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.language = n.language;
        var node = this;
    
        this.on("input",function(msg) {
            var language = node.language;
            if (!node.language || node.language.length == 0) node.language = msg.topic;
            child_process.exec ('say '+language+' "'+msg.payload+'"');
        });
    }
   
    RED.nodes.registerType("say",SayNode);
}
