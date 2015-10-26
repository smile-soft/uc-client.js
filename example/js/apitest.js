/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

window.onerror = function(msg, url, linenumber) {
     console.error('Error message: '+msg+'\nURL: '+url+'\nLine number: '+linenumber);
 };


;(function(window, document){

    var client,
        dialInput,
        callBtn,
        answerBtn,
        dropBtn,
        closeBtn,
        pauseBtn,
        confBtn,
        callInfo,
        stateInfo,
        exitCode;

    function addEvent(obj, evType, fn) {
      if (obj.addEventListener) obj.addEventListener(evType, fn, false);
      else if (obj.attachEvent) obj.attachEvent("on"+evType, fn);
    }

    function removeEvent(obj, evType, fn) {
      if (obj.removeEventListener) obj.removeEventListener(evType, fn, false);
      else if (obj.detachEvent) obj.detachEvent("on"+evType, fn);
    }

    //get client state name from state code
    function getFriendlyState(state){
        var fstate;
        if(state === 0)
            fstate = 'Unregistered';
        else if(state === 1)
            fstate = 'Pause';
        else if(state === 3)
            fstate = 'Incoming call from';
        else if(state === 4)
            fstate = 'Outgoing call to';
        else if(state === 5 || state === 9)
            fstate = 'Connected with';
        else if(state === 6)
            fstate = 'Wrap';
        else if(state === 7)
            fstate = 'Generic Task';
        else if(state === 8)
            fstate = 'Idle';

        return fstate;
    }

    function init(){
        dialInput = document.getElementById('dial-input');
        callBtn = document.getElementById('call-btn');
        answerBtn = document.getElementById('answer-btn');
        dropBtn = document.getElementById('drop-btn');
        closeBtn = document.getElementById('close-btn');
        confBtn = document.getElementById('conf-btn');
        callInfo = document.getElementById('call-info');
        stateInfo = document.getElementById('state-info');
        exitCode = document.getElementById('exit-code');

        addEvent(callBtn, 'click', call);
        addEvent(answerBtn, 'click', answer);
        addEvent(dropBtn, 'click', drop);
        addEvent(closeBtn, 'click', close);
        addEvent(confBtn, 'click', conf);
        
        client = SmileSoft.Client();
    }

    function call(){
        var number = dialInput.value;
        client.call(number.toString());
    }

    function answer(){
        client.answer();
    }

    function drop(){
        client.drop();
    }

    function conf(){
        client.conference();
    }

    SmileSoft.on('Error', function (params){
      console.error('Error: ', params);
    });

    SmileSoft.on('Client.moduleInitiated', function (){
      console.log('Module initiated');
    });

    SmileSoft.on('Client.statechange', function (params){
      console.log('onstatechange:', params);
      stateInfo.textContent = JSON.stringify(params);
    });

    SmileSoft.on('Client.incomingcall', function (params){
      console.log('incomingcall:', params);
      callInfo.textContent = JSON.stringify(params);
    });

    init();

})(window, document);
