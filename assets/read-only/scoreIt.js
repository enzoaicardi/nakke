
/*
    @params {String} value               - The value to compare
    @params {Array} obj                  - The object or array to explore
    @params {Array<string>} path         - Path to the data to score [2, 'data', 'name']
*/

function scoreIt(value, object, options){

    var v = secate(value);
    var array = [];

    // define options by default
    var path = options?.path || [];
    var sortKey = options?.sortKey || false;
    var u = 0;

    // check every entry
    for(var key in object){

        /*
            @return
            {String}, {undefined}, {""}
            --> if options.sortKey, use the key to sort
        */
        var d = sortKey ? key : getData(object[key]);

        /* 
            @return
            {Number} score - Percentage
        */
        var score = d && d !== '' ? searchProximity(v, secate(d)) : 0;

        array.push({
            score: score,
            obj: object[key],
            str: d,
            key: key,
            id: u
        });

        u++;

    }

    function getData(obj){

        let i = 0;
        let l = path.length;
        let data = obj;

        while(i<l){
            data = data[path[i]];
            i++;
        }

        return data;

    }

    var output = array.sort(function(a, b){
        return (b.score - a.score);
    });

    return output;

}


// séparation et épuration de la valeur d'entrée
function secate(s){

    function pure(str){return str.replace(/[áàãâä]/gi,"a").replace(/[éè¨ê]/gi,"e").replace(/[íìïî]/gi,"i").replace(/[óòöôõ]/gi,"o").replace(/[úùüû]/gi, "u").replace(/[ç]/gi, "c").replace(/[ñ]/gi, "n").toLowerCase();}

    s = pure(s);

    var i, j;
    var matrix = [];
    
    for(i=0; i<s.length; i++){

        matrix[i] = [];

        for(j=0; j<s.length-i; j++){
            matrix[i][j] = s.slice(j,j+i+1);
        }

    }
    
    return matrix;

}

function charCount(a, e){
    a[e] = a[e] ? a[e] + 1 : 1;
    return a;
}

function divByShortest(a, b){
    return Math.floor((typeof b == 'number' ? a > b ? b / a : a / b : 0) * 100);
}

// création du score
function searchProximity(s, r){

    if(!s || !r){return 0;}

    var i;
    var matrix = [divByShortest(s[0].length, r[0].length)];

    // pour chaque tableau
    for(i=0; i<s.length && i<r.length; i++){

        var sc = s[i].reduce(charCount, {});
        var rc = r[i].reduce(charCount, {});
        var a = [];

        var j = 0;

        for(var char in sc){
            a[j] = Math.floor((typeof rc[char] == 'number' ? sc[char] > rc[char] ? rc[char] / sc[char] : 1 : 0) * 100);
            j++;
        }

        var t = Math.round(a.reduce(function(a, e){return a+e;},0) / j);
        matrix[i+1] = t;

    }

    var score = Math.round(matrix.reduce(function(a, e){return a+e;},0) / (i+1));
    return score;

}