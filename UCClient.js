(function (moduleName, global, definition) {

	var API = global.SmileSoft = global.SmileSoft || (function (){

		var subs = {};
		var hOP = subs.hasOwnProperty;

		return {
			on: function(sub, listener) {
				// Create the subscription's object if not yet created
				if(!hOP.call(subs, sub)) subs[sub] = [];

				// Add the listener to queue
				var index = subs[sub].push(listener) -1;

				// Provide handle back for removal of subscription
				return {
					remove: function() {
						delete subs[sub][index];
					}
				};
			},
			emit: function(sub, info) {
				// If the subscription doesn't exist, or there's no listeners in queue, just leave
				if(!hOP.call(subs, sub)) return;

				// Cycle through subscriptions queue, fire!
				subs[sub].forEach(function(item) {
					item(info != undefined ? info : {});
				});
			}
		};
	})();
	
	API[moduleName] = definition(moduleName, API);

})('Client', this, function (moduleName, Instance) {

	"use strict";

	// Modules's initiation options
	var options = {
		// Server IP address or Domain name and server port (if other than 80/443)
		// Exp: 192.168.1.100:8880 or www.example.com
		server: window.location.host,
		websockets: true,
		updateInterval: 1000
	},

	// Module's subscriptions
	subs = {
		// Module initiated
		moduleInitiated: 'moduleInitiated',
		// Received current process information
		incomingCall: 'incomingcall',
		// Received current state information
		stateChange: 'statechange'
	},

	// Current protocol
	protocol = window.location.protocol.indexOf('https') !== -1 ? 'https' : 'http',

	// Interval to request current client's state from the server
	updateStateInterval,

	// Websocket object
	websocket,

	websocketTry = 1,

	initiated = false,

	// Module's public api
	api;

	function on(sub, cb){
		Instance.on(moduleName+'.'+subs[sub], function (params){
			cb(params);
		});
	}

	function emit(sub, params){
		Instance.emit(moduleName+'.'+subs[sub], params);
	}

	/**
	 * Extend's object with properties
	 * 
	 * @return {Object} Merged objects
	 */
	function extendObj(target, source){
		var a = Object.create(target);
		Object.keys(source).map(function (prop) {
			prop in a && (a[prop] = source[prop]);
		});
		return a;
	}

	// Reconnection Exponential Backoff Algorithm
	// http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app
	function generateInterval (k) {
		var maxInterval = (Math.pow(2, k) - 1) * 1000;

		if (maxInterval > 30*1000) {
			// If the generated interval is more than 30 seconds, 
			// truncate it down to 30 seconds.
			maxInterval = 30*1000;
		}

		// Generate the interval to a random number 
		// between 0 and the maxInterval determined from above
		return Math.random() * maxInterval;
	}

	function setStateRequestInterval(){
		// updateStateInterval = setInterval(function(){
		// 	api.getState();
		// }, options.updateInterval);
    }

    function onWebsocketOpen(){
        console.log('Websocket opened');
        emit('moduleInitiated');
        // api.getState();
    }

    function onWebsocketMessage(e){
        var data = JSON.parse(e.data),
            method = data.method;

        console.log('onWebsocketMessage data: ', data);

        if(data.error) {
			Instance.emit('Error', { module: moduleName, error: data.error });
        }

        if(data.method){
            var params = data.params;
            if(method == 'incomingCall'){
				incomingCall(params);
            } else if(method == 'stateChanged'){
				setState(params);
            }
        } else if(data.id){
			callbackOnId(data.id, data.result);
        }
    }

    function onWebsocketClose(){
        console.log('Websocket closed');
        if(options.websockets) {
			var time = generateInterval(websocketTry);
			setTimeout(function(){
				websocketTry++;
				init();
			}, time);
        }
    }

    function onWebsocketError(error){
		Instance.emit('Error', { module: moduleName, error: error });
    }

    /**
     * Select request protocol
     * 
     * @param  {Boolean} state true - switch to Websockets, false - switch to XMLHttpRequst
     * @return none
     */
	function init(){
		if(!options.websockets){
			if(websocket !== undefined) websocket.close();
			console.log('Switched to XMLHttpRequest');
			setStateRequestInterval();
			emit('moduleInitiated');
		}
		else{
			if(!window.WebSocket) {
				console.log('WebSocket is not supported. Please update your browser.');
				console.log('Fallback to XMLHttpRequest');
				options.websockets = false;
				return init();
			}

			console.log('Switched to Websockets');
			
			// Clear "getState" method request interval and switch to websockets
			if(updateStateInterval !== undefined) clearInterval(updateStateInterval);

			// Initiate Websocket handshake
			websocket = new WebSocket((protocol === 'https' ? 'wss' : 'ws') + '://'+options.server+'/','json.api.smile-soft.com');
			websocket.onopen = onWebsocketOpen;
			websocket.onmessage = onWebsocketMessage;
			websocket.onclose = onWebsocketClose;
			websocket.onerror = onWebsocketError;
		}
	}

	function getXmlHttp(){
		if(window.XMLHttpRequest){
			return new XMLHttpRequest();
		} else{
			return new ActiveXObject("Microsoft.XMLHTTP");
		}
	}

	/**
	 * Send request to the server via XMLHttpRequest or Websockets
	 * @param  {String} method Server API method
	 * @param  {Object} params Request parameters
	 * @param  {Number} id     Callback id. Send from server to client via Websockets
	 * @return {String}        Returns response from the server
	 */
	function sendRequest(method, params, callback){
		var jsonrpc = {}, xhr, parsedJSON, requestTimer, err = null;
		jsonrpc.method = method;

		if(params) jsonrpc.params = params;
		if(typeof callback === 'number') jsonrpc.id = callback;

		jsonrpc = JSON.stringify(jsonrpc);

		if(options.websockets)
			websocket.send(jsonrpc);
		else{
			xhr = getXmlHttp();
			xhr.open("POST", protocol+'://'+options.server+"/", true);

			requestTimer = setTimeout(function(){
				xhr.abort();
			}, 30000);
			xhr.onreadystatechange = function() {
				if (xhr.readyState==4){
					clearTimeout(requestTimer);
					if(xhr.response) {
						parsedJSON = JSON.parse(xhr.response);
						if(parsedJSON.error) {
							err = parsedJSON.error;
							Instance.emit('Error', { module: moduleName, error:  err});
						}
						if(callback) {
							callback(parsedJSON.result);
						}
					}
				}
			};
			xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
			xhr.send(jsonrpc);
		}
	}

	/**
	 * State chage event received from the server
	 */
	function setState(stateInfo){
		emit('stateChange', stateInfo);
	}

	/**
	 * Current process information received from the server
	 * @param {Object} processInfo process information
	 * @return none
	 */
	function incomingCall(callInfo){
		emit('incomingCall', callInfo);
	}

	/**
	 * Module's initiation function that accepts initiation options
	 * 
	 * @param  {Object} opts module's initiation options
	 * @return {Object}      [description]
	 */
	function client(opts){
		if(opts) options = extendObj(options, opts);
		if(initiated) return console.log('Module '+moduleName+' already initiated, do nothing');
		init();
		initiated = true;
		return api;
	}

	api = {

		// Current process info
		process: {},

		// Current state
		state: null,

		// Current substate
		substate: null,

		/**
		 * Get information of current client's state
		 * Possible states:
		 * 0 - 'Unregistered'
		 * 1 - 'Pause'
		 * 3 - 'Incoming call'
		 * 4 - 'Outgoing call'
		 * 5 - 'Connected with incomming call'
		 * 6 - 'Wrap'
		 * 7 - 'Generic task'
		 * 8 - 'Idle'
		 * 9 - 'Connected with outgoing call'
		 * 
		 * @return {Object} current client's state
		 * 
		 */
		getState: function(){
			sendRequest('getState', null, (options.websockets ? 5 : setState));
		},

		/**
		 * Initiate outgoing call
		 * @param  {String} number telephone number to dial
		 * @return none
		 */
		call: function(number){
			sendRequest('initCall', { number: number });
		},

		/**
		 * Answer to incoming call
		 * @return none
		 */
		answer: function(){
			sendRequest('answerCall');
		},

		/**
		 * Press hold button
		 * @return none
		 */
		hold: function(){
			sendRequest('pressHold');
		},

		/**
		 * Press conference button
		 * @return none
		 */
		conference: function(){
			sendRequest('pressConference');
		},

		/**
		 * Drop current call
		 * @return none
		 */
		drop: function(){
			sendRequest('dropCall');
		}

	};

	on('statechange', function (params){
		api.state = params.state;
		api.substate = params.substate;
	});

	return client;

});