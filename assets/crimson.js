/* CrimsonSand
    author: Enzo Aicardi,
    website: enzo.aicardi.pro,
    creation_date: 16/11/2020,
    license: GNU GPLv3
*/

var animeCallBack = window.requestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.msRequestAnimationFrame;

function crimson(obj){

    var debug = obj.debug || false;
    var pstart = 0, pcurrent = 0, easing, animation, onfinish;
    var paused = true;
    var invert = false;
    
    var time = {
        start: performance.now(),
        total: 0
    };

    change(obj);

    function anime(now){

        time.elapsed = Math.max(now - time.start, 0);

        var p = time.elapsed / time.total;
        p = invert?Math.max(pstart-p,0):Math.min(p+pstart,1);

        pcurrent = p;
        var ep = p;

        if(typeof easing === 'function'){ ep = easing(p); }
        else if(typeof easing === 'object'){ ep = []; for(var i=0; i<easing.length; i++){ progress.push(easing[i](p)); } }
        if(debug){ console.log('crimson: animation running... \np = '+ep+';\nl = '+p+';'); }
    
        animation(ep, p);

        if((invert?p>0:p<1) && !paused){
            animeCallBack(anime);
        }else if(!paused){ paused = true; onfinish(p); }

    }

    function ts(){       time.start = performance.now(); }

    function play(v){    if(paused){ paused = false; ts(); pstart = pcurrent = v == null ? pcurrent === (invert?0:1) ? (invert?1:0) : pcurrent : v; animeCallBack(anime); } }
    function stop(){     jumpTo(invert?0:1); if(paused){ paused = false; animeCallBack(anime); }}
    function pause(){    paused = true;}
    function moveTo(v){  paused = true; ts(); pstart = pcurrent = v || 0; animeCallBack(anime); }
    function jumpTo(v){  ts(); pstart = pcurrent = v || 0; }
    function reverse(v){ ts(); pstart = pcurrent; invert = v == null?invert?false:true:v; }

    function change(v){
        if(v.duration != null){ ts(); pstart = pcurrent; time.total = v.duration; }
        if(v.progress != null){ jumpTo(v.progress); }
        if(v.easing){           easing = v.easing; } else { easing || (easing = 'linear'); }
        if(v.onfinish){         onfinish = v.onfinish; } else { onfinish || (onfinish = function(){}); }
        if(v.animation){        animation = v.animation; } else { animation || (animation = function(){}); }
    }

    function status(){   
        return {
            play:        paused?false:true,
            reverse:     invert,
            finish:      pcurrent === (invert?0:1),
            progress:    pcurrent
        };
    }

    return {
        moveTo: moveTo, jumpTo: jumpTo,
        play: play, pause: pause, stop: stop,
        reverse: reverse,

        change: change, status: status
    };

}