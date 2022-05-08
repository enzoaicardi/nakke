
var body = document.body;
var docTitle = qs('title').textContent;
var colorMode = localStorage.getItem('nakke-color-mode');
if(colorMode) body.setAttribute('class', 'ns ' + colorMode);

var nakkeVersion = qs('.doc-version').textContent;
var versions = {};
var version = getVersion();

// SWITCH MODE

globalListener('click', '.doc-color-mode span', function(e){

    var t = e.target;

    if(body.classList.contains(t.textContent)) {return;}

    if(t.textContent === 'dark_mode'){
        body.setAttribute('class', 'ns dark_mode');
        localStorage.setItem('nakke-color-mode', 'dark_mode');
        return;
    }

    body.setAttribute('class', 'ns light_mode');
    localStorage.setItem('nakke-color-mode', 'light_mode');

}, {passive: true});

// VARS

var docContent = qs('.doc-content .content');
var pageLoader = qs('body > .doc-loader');
function loadStatus(progress, hidden){
    if(!hidden) {pageLoader.setAttribute('data-load', progress);}
}

// get the current page only on first load
var currentPage = 'index';
var previousPage = {name: '', slug: ''};
var nextPage = {name: '', slug: ''};

var searchContent = [];

nakkeImport('sidebar', qs('.doc-sidebar .content'), true, true);
nakkeImport(getCurrentPage());

// MOBILE BURGER CLICK

var burger = qs('.doc-content .doc-header-right span');

burger.addEventListener('click', function(){ burgerDo(); }, {passive:true});

function burgerDo(state){

    state = state || burger.textContent;
    var dsb = qs('.doc-sidebar');
    var dsm = qs('.doc-summary');

    if(state === 'close'){
        dsb.removeAttribute('style');
        dsm.removeAttribute('style');
        burger.textContent = 'menu';
        return;
    }

    dsb.setAttribute('style', 'left: 0;');
    dsm.setAttribute('style', 'right: 0;');
    burger.textContent = 'close';

}

// SIDEBAR LINK CLICK

globalListener('click', '.cat-content a, .doc-content .doc-content-nav a, .doc-content a[data-page]', function(e){

    e.preventDefault();
    var pageName = e.target.getAttribute('data-page') || '404';
    if(pageName === currentPage) {return;}
    nakkeImport(pageName);

    burgerDo('close');

}, {});

// CHANGE VERSION CLICK
globalListener('click', '.doc-content .doc-available-versions a', function(e){

    e.preventDefault();
    var ver = e.target.getAttribute('data-version') || false;
    if(!ver) {return;}

    changeVersion(ver);

}, {});

function changeVersion(str){
    version.string = str;
    nakkeImport('sidebar', qs('.doc-sidebar .content'), true, true);
    nakkeImport(currentPage);
}

// SUMMARY ANCHOR CLICK
var easingCubic = function(x){ return 1 - Math.pow(1 - x, 3); }

var scrollAnimation = crimson({
    duration: 800,
    easing: easingCubic
});

globalListener('click', '.doc-summary .content .summary a[data-anchor], .doc-content .content a[data-anchor]', function(e){

    e.preventDefault();
    var anchor = e.target.getAttribute('data-anchor');
    scrollToAnchor(anchor);

    function scrollToAnchor(anchor){

        var el = qs('#'+anchor, docContent);
        if(!el) {el = qs('[data-slug="'+slugIt(anchor)+'"]', docContent);}
        if(!el) {return;}
        var h = qs('.doc-content > header');

        var distance = el.offsetTop - (h.offsetHeight+20);
        var scrolled = docContent.scrollTop;
        
        scrollAnimation.stop();
        scrollAnimation.change({
            progress: 0,
            animation: function(p){
                var s = (distance - scrolled)*p+scrolled;
                docContent.scrollTop = s;
            }
        });
        scrollAnimation.play();

        burgerDo('close');

    }

}, {});

// BACK TO TOP CLICK

globalListener('click', '.doc-content .content > footer > p', function(){

    var scrolled = docContent.scrollTop;
    var topanim = crimson({
        duration: 800,
        easing: easingCubic,
        animation: function(p){
            docContent.scrollTop = scrolled * (1-p);
        }
    });
    topanim.play();

}, {passive:true});

// CONTENT SCROLL

var scrollEventShouldWait = false;

docContent.addEventListener('scroll', function(){
    
    if(scrollEventShouldWait) {return;}

    scrollEventShouldWait = true;
    setTimeout(() => { 
        var sts = qs('.doc-summary .summary a.v');
        if(sts) {sts.classList.remove('v');}

        var summaryTitle = qs('.doc-summary .summary a[data-anchor="' + currentContentAnchor() + '"]');
        if(summaryTitle) {summaryTitle.classList.add('v');}

        scrollEventShouldWait = false;
    }, 600);

}, {passive:true});

function currentContentAnchor(){

    var ca = qsa('h1[id], h2[id], h3[id], h4[id]', docContent);
    var scrolled = docContent.scrollTop;
    var h = qs('.doc-content > header');

    for(var i=ca.length-1; i>=0; i--){

        var distance = ca[i].offsetTop;

        if(scrolled > distance - (h.offsetHeight + 40)){
            return ca[i].id;
        }

    }

}

// CODEBOX COPY

if (navigator.clipboard) {
    globalListener('click', '.doc-code-box > header span[data-core-marker]', function(e){

        var ct = e.target.getAttribute('data-content');
        if(!ct) {return;}

        var copied = crimson({
            duration: 500,
            easing: easingCubic,
            animation: function(p){
                if(p < 0.5) { e.target.style.transform = 'scale('+(0+(1-p))+')'; return }
                e.target.style.transform = 'scale('+(1*p)+')';
            }
        });

        copied.play();
        navigator.clipboard.writeText(ct).then(function() {
            e.target.classList.add('v'); 
        });
    
    }, {passive:true});
}

// HISTORY

window.addEventListener('popstate', function(e){

    var pageName = e.state ? e.state.page ? e.state.page : '404' : '404';
    var ver = e.state.version;

    if(version.string !== ver){
        version.string = ver;
        nakkeImport('sidebar', qs('.doc-sidebar .content'), true, true);
    }

    nakkeImport(pageName, false, false, true);

}, {passive: true});

// CODE IMPORT

function nakkeImport(name, container, sidebar, state){

    if(!sidebar && name === 'sidebar') {name = '404';}
    if(!sidebar) {currentPage = name;}

    var url = './pages/' + name + '.sdom';
    container = container || docContent;

    loadStatus('0', sidebar);

    fetch(url)
    .then(function(response) {
        if(response.ok){
            if(!state) {history.pushState({page: name, version: version.string}, '', '?page='+name+'&version='+version.string);}
            version = getVersion(version.string);
            loadStatus('50', sidebar);
            return response.text();
        }else{
            nakkeImport('404');
            return false;
        }
    })
    .then(function(code) {

        if(!code) {container.innerHTML = "<h1>This page is empty</h1><p>Try to come back later.</p>";}
        if(code)  {container.innerHTML = smallDomTranspile(code).replace(/<img/g, '<img loading="lazy"');}

        if(sidebar) {nakkeParseSideBar();}
        nakkeHighlightSideBar();

        if(sidebar) {return;}

        docContent.scrollTop = 0;
        nakkeParseContent();
        loadStatus('100');
        
    });

}

// CODE TRANSFORM

// parse sidebar (just one time)
function nakkeParseSideBar(){
    var sidebar = qs('.doc-sidebar .content');
    var sections = qsa('section', sidebar);
    var HTML = '';

    for(var section of sections){
        var fc = section.getAttribute('char');

        HTML += '<div class="cat"><div class="cat-header" data-core-catname>';
            HTML += '<p data-core-marker translate="no">' + (fc ? fc[0] : '#') + '</p>';
            HTML += '<p>' + (section.getAttribute('title') || 'untitled') + '</p>';
        HTML += '</div><div class="cat-content">';

            var links = qsa('a', section);
            for(var link of links){

                var obj = {desc: ''};
                var desc = qs('q', link);

                if(desc) {
                    obj.desc = desc.textContent;
                    desc.remove();
                }

                var pageParam = link.getAttribute('page') || link.textContent.toLowerCase();
                var dp = link.getAttribute('dep'); if(dp) {versions[dp] = true;}
                var nw = link.getAttribute('new'); if(nw) {versions[nw] = true;}

                if(nw && Number(nw) > version.number) {continue;}
                
                obj.name = link.textContent;
                obj.page = pageParam;
                searchContent.push(obj);

                var attr = (dp ? (' dep="'+dp+'"') : '') + (nw ? (' new="'+nw+'"') : '');
                var inner = '<a href="?page='+pageParam+'" data-page="'+pageParam+'">'+link.textContent+'</a>';
                var value = ((dp && dp <= version.number) ? 'dep' : (nw && nw >= version.number) ? 'new' : false);
                    
                inner = '<div'+attr+' class="version-block">'+ (value ? ('<div class="version-marker '+value+'">'+ value +'</div>') : '') +'<div class="version-element-content">' + inner + '</div></div>';

                HTML += inner;
            
            }

        HTML += '</div></div>';
    }

    sidebar.innerHTML = HTML;
}

// parse content
function nakkeParseContent(){
    var codeInline = qsa('q', docContent);
    var codeBlock = qsa('code', docContent);
    var links = qsa('a', docContent);
    var imgs = qsa('img', docContent);
    var tables = qsa('table', docContent);
    var lists = qsa('ul li, ol li', docContent);

    toDataAttr(links, 'page');
    toDataAttr(links, 'anchor');
    toDataAttr(imgs, 'flex');
    toStyleAttr(imgs, ['height', 'width'], 'px');

    for(var code of codeInline){
        code.outerHTML = '<span translate="no" data-core-marker="code">'+escapeHTML(code.textContent)+'</span>';
    }

    for(var list of lists){
        list.innerHTML = '<div class="list-dot"></div><div class="list-content">'+list.innerHTML+'</div>';
    }

    for(var table of tables){
        var content = table.innerHTML;
        table.outerHTML = '<div class="doc-table-container"><table>'+content+'</table></div>';
    }

    for(var code of codeBlock){

        var pre = code.textContent.split('\n');
        var indent = ' '.repeat(code.getAttribute('spaces') || 0);
        var col1 = '';
        var col2 = '';

        var lang = code.getAttribute('language');

        for(var i=0; i<pre.length; i++){
            var regex = new RegExp("^"+indent)
            if(indent) {pre[i] = pre[i].replace(regex, '');}
            col1 += '<p>'+(i+1)+'</p>';
            col2 += '<p>'+nakkeHighlightCode(escapeHTML(pre[i]), lang)+'</p>';
        }

        var HTML = '<aside class="doc-code-box"><header>';
            HTML += '<p data-core-marker translate="no">'+ (lang ? ('.'+lang) : "&lt; &gt;") +'</p>';
            HTML += '<h5>'+(code.getAttribute('title') || 'no title')+'</h5>';
            HTML += '<span class="material-icons" data-content="'+escapeHTML(pre.join('\n'))+'" data-core-marker translate="no">content_copy</span></header>';

            HTML += '<div class="doc-box"><div class="doc-table"><div class="doc-table-col1">';
                HTML += col1;
            HTML += '</div><div class="doc-table-col2"><div translate="no" class="doc-table-col-block"' + (lang ? (' data-language="'+lang+'"') : '') + '>';
                HTML += col2;
            HTML += '</div></div></div></div></aside>';

        code.outerHTML = HTML;
    }

    var nav = '<div class="doc-content-nav">';

    nav += '<a data-core-button '
        +(previousPage.slug ? '' : 'class="hidden"')
        +(previousPage.slug ? 'href="?page='+previousPage.slug+'"' : '')
        +'data-page="'+previousPage.slug+'"'
        +'>'
        +previousPage.name
        +'</a>';

    nav += '<a data-core-button="border" '
        +(nextPage.slug ? '' : 'class="hidden"')
        +(nextPage.slug ? 'href="?page='+nextPage.slug+'"' : '')
        +'data-page="'+nextPage.slug+'"'
        +'>'
        +nextPage.name
        +'</a>';
    
    nav += '</div>';

    docContent.insertAdjacentHTML('beforeend', nav + footer);

    // reset version list and add default version
    versions = {}; versions[nakkeVersion] = true;

    // check version elements
    var versionElements = qsa('[dep], [new]', docContent);
    versionDisplay(versionElements);

    // sort version list (high to low)
    versions = Object.keys(versions).sort(function(a, b){return (Number(b) - Number(a));});

    var ver = '<div class="doc-available-versions"><h5>Available versions : </h5>';
    for(num of versions){
        if(num === version.string) { ver += '<p>'+num+'</p>'; continue; }
        ver += '<a data-version="'+num+'" href="?page=' + currentPage + '&version=' + num + '">'+num+'</a>';
    }
    ver += '</div>';

    // insert version list
    docContent.insertAdjacentHTML('beforeend', ver);

    if(version.string !== nakkeVersion){
        var ver = '<div class="doc-available-versions top"><h5>You are watching an earlier version of the document, to return at current version : </h5>';
        ver += '<a data-version="'+nakkeVersion+'" href="?page=' + currentPage + '&version=' + nakkeVersion + '">'+nakkeVersion+'</a></div>';
        docContent.insertAdjacentHTML('afterbegin', ver);
    }


    // generate summary at the end because elements could be
    // resized or tags can change (this can effect offsetTop)
    nakkeGenerateSummary();

    function toDataAttr(elems, attr){
        for(var el of elems){
            var data = el.getAttribute(attr);
            if(data) {
                el.setAttribute('data-'+attr, data);
                el.removeAttribute(attr);
            }
        }
    }

    function toStyleAttr(elems, array, suffix){
        for(var el of elems){
            var style = '';
            for(prop of array){
                var val = el.getAttribute(prop) || false;
                if(val) {style += prop + ':' + val + suffix + ';';}
            }
            el.setAttribute('style', style);
        }
    }

}

function versionDisplay(els){

    function addVersion(el){

        var dp = el.getAttribute('dep'); el.removeAttribute('dep');
        var nw = el.getAttribute('new'); el.removeAttribute('new');

        if(dp) {versions[dp] = true; dp = Number(dp);}
        if(nw) {versions[nw] = true; nw = Number(nw);}

        return {dp: dp, nw: nw};

    }

    for(var i=0; i<els.length; i++){

        var el = els[i];

        var ver = addVersion(el), dp = ver.dp, nw = ver.nw; 
        // si l'élément a des attributs vides ou n'existe plus
        if(!dp && !nw){continue;}

        if(nw && nw > version.number){

            function deleteAfter(elem, level){

                var nextNode = elem.nextSibling; 

                if(nextNode.matches(level + ', .doc-content-nav, footer')){return;}
                if(nextNode.matches('h2, h3, h4')){addVersion(nextNode);}

                deleteAfter(nextNode, level); nextNode.remove();

            }

            if(el.matches('h2, h3, h4')){
                var level = el.matches('h2') ? 'h2' : 
                            el.matches('h3') ? 'h2, h3' : 
                            el.matches('h4') ? 'h2, h3, h4' : 'h2, h3, h4';

                deleteAfter(el, level);
            }

            el.remove();
            return;
        }

        var value = ((dp && dp <= version.number) ? 'dep' : (nw && nw >= version.number) ? 'new' : false);
        if(!value){continue;}
        el.innerHTML = '<div class="version-block"><div class="version-marker '+value+'">'+ value +'</div><div class="version-element-content">' + el.innerHTML + '</div></div>';

    }

}

// generate summary
function nakkeGenerateSummary(){

    var titles = qsa('h1, h2, h3, h4', docContent);

    var summaryContent = qs('.doc-summary .summary');
    var HTML = ''; var u = 0;

    for(var title of titles){
        var versionContent = qs('.version-element-content', title);
        var content = versionContent ? versionContent.textContent : title.textContent;
        var slug = slugIt(content);
        var uuid = slug + '-' + (++u);
        var level = title.tagName.toLowerCase();

        title.setAttribute('id', uuid);
        title.setAttribute('data-slug', slug);
        HTML += '<a class="'+level+''+(u===1 ? ' v' : '')+'" data-anchor="'+uuid+'">'+escapeHTML(content)+'</a>';
    }

    summaryContent.innerHTML = HTML;

}

function slugIt(str){
    return str.replace(/^( |\t)+/gi, 'x').replace(/[^a-z0-9_ -]/gi, 'x').replace(/ /g, '-').toLowerCase();
}

function nakkeHighlightSideBar(){

    var links = qsa('.doc-sidebar .content .cat-content a');
    var pageFound = false;

    for(var i=0; i<links.length; i++){

        var link = links[i];
        var isPage = currentPage === getPageAttr(link);
                
        if(isPage){

            // underline sidebar link and change the page title
            link.classList.add('v');
            qs('title').textContent = link.textContent + docTitle;
            pageFound = true;

            nextPage.name = getPageAttr(links[i+1], 'name');
            nextPage.slug = getPageAttr(links[i+1]);
            previousPage.name = getPageAttr(links[i-1], 'name');
            previousPage.slug = getPageAttr(links[i-1]);

            continue;
        }

        link.classList.remove('v');

    }

    if(!pageFound) {qs('title').textContent = 'Not Found' + docTitle;}

}

function getPageAttr(link, name){
    if(!link) {return '';}
    if(name)  {return link.textContent;}
    return link.getAttribute('data-page') || '404';
}

// SEARCH

var searchInput = qs('.doc-content header input');

qs('.doc-content > header code').addEventListener('click', function(){

    var t = searchInput;

    if(t.value) {searchInFiles(t.value);}
    else {nakkeImport(currentPage);}

    burgerDo('close');

}, {passive:true});

searchInput.addEventListener('keydown', function(e){

    var t = e.currentTarget;

    if(e.key === 'Enter'){
    
        burgerDo('close');

        if(/^@[0-9]+(\.[0-9]+)?$/.test(t.value)){
            var ver = t.value.substring(1);
            changeVersion(ver);
        }

        if(t.value){
            searchInFiles(t.value);
            return;
        }

        nakkeImport(currentPage);

    }

}, {passive:true});

function searchInFiles(str){

    var HTML = '<h1>Results for "'+str+'"</h1>';

    var array = searchScoreUpdate(str);
    for(var obj of array){
        if(obj.score > 50){
            var regex = new RegExp(obj.word, "gi");

            var description = obj.desc ? escapeHTML(obj.desc).replace(regex, '<mark>'+obj.word+'</mark>') : 'No description for this page';
            var pageName = escapeHTML(obj.name).replace(regex, '<mark>'+obj.word+'</mark>');
            
            HTML += '<article class="doc-search" data-page="'+obj.page+'"><header><p data-core-marker translate="no">page</p><h5>'+pageName+'</h5></header>';
            HTML += '<p class="doc-search-desc">'+description+'</p></article>';
        }
    }

    docContent.innerHTML = HTML;
    nakkeGenerateSummary();

    var articles = qsa('.doc-content .content article.doc-search');
    for(var a of articles){
        a.addEventListener('click', changePage, {passive:true});
    }

    function changePage(e){
        nakkeImport(e.currentTarget.getAttribute('data-page') || '404');
    }

}

function searchScoreUpdate(str){

    var sc = searchContent;

    // optimize search by creating an array of strings
    for(var i=0; i<sc.length; i++){
        var words = (sc[i].name +' '+ sc[i].desc).split(' ');
        var high = scoreIt(str, words)[0];
        searchContent[i].score = high.score;
        searchContent[i].word = high.str;
    }

    // return searchContent copy with good sort
    return searchContent.sort(function(a, b){
        return (b.score - a.score);
    });

}

/**
 * Get the current URL params and return the page
 * @returns the current page name
 */
function getCurrentPage(){
    var page = getParam('page', 'index');
    currentPage = page;
    return page;
}

function getVersion(current){
    var string = current || getParam('version', nakkeVersion);
    var number = Number(string);
    return {string: string, number: number};
}

function getParam(param, original){

    var params = window.location.search;
    if(!params) {return original;}

    var urlParams = new URLSearchParams(params);
    
    var value = urlParams.get(param) || original;
    return value;

}

function nakkeHighlightCode(code, lang){

    if(!lang) {return code;}

    if(!/^(html|css|js|xml|sdom)$/.test(lang)){
        lang = 'generic';
    }

    // TAGS and ATTRIBUTES
    if(lang === "html" || lang === "xml"){
        var matches = code.match(/(&lt;\/?)(.+?)(&gt;)/gi);

        for(var i in matches){
            var str = matches[i].replace(/([-a-z0-9:]+)(=)/gi, '<span class="attribute">$1</span><span class="declaration">$2</span>')
                                .replace(/(&lt;\/?(!--)?)(.+?)((--)?&gt;)/gi, '<span class="declaration">$1</span><span class="tag">$3</span><span class="declaration">$4</span>');
            
            code = code.replace(matches[i], str);
        }
    }

    else if(lang === "sdom"){
        code = code.replace(/(^(\t| )*| (\+|-)*)([a-z0-9]+[-a-z0-9]*!?)(( *\.[-_a-z0-9 ]+)*)/gi, '<span class="declaration">$1</span><span class="tag">$4</span><span class="class">$5</span>')
                   .replace(/( ?[a-zA-Z]+)<\/span><span class="class"> ?<\/span>\(/gi, '<span class="function">$1</span></span>(')
                   .replace(/( ?\[.+?\])/gi, '<span class="attribute">$1</span>')
                   .replace(/( ?\((\\\)|[^\)][^\)\\]?)*\))/gi, '<span class="declaration">$1</span>');
    }

    // JAVASCRIPT KEYWORDS
    else if(lang === "js"){
        code = code.replace(/(^| )(new |return )/gi, '$1<span class="tag">$2</span>')
        .replace(/(^| )(continue|break)( *;)/gi, '$1<span class="tag">$2</span>$3')
        .replace(/(^| )(else|try|catch)( *\{)/gi, '$1<span class="tag">$2</span>$3')
        .replace(/(^| )(if|for|while)( *\()/gi, '$1<span class="tag">$2</span>$3')
        .replace(/([a-z_]+):(.*?)(,|[^;]?$)/gi, '<span class="declaration">$1</span>:$2$3')
        .replace(/\(([^\(]*?)\)( *\=\&gt;)/gi, '(<span class="declaration">$1</span>)<span class="function">$2</span>')
        .replace(/([a-z_]+)\(([^\(]*?)\)/gi, '<span class="function">$1</span>(<span class="declaration">$2</span>)')
        .replace(/([a-z_]+ *)\(/gi, '<span class="function">$1</span>(')
        .replace(/(function |class )/gi, '<span class="keyword">$1</span>')
        .replace(/(var |let |const )( *[a-z_]+)/gi, '<span class="attribute">$1</span><span class="declaration">$2</span>');
    }

    // ALL STRINGS
    if(lang === 'sdom'){
        code = code.replace(/( (-|\+)+)(&quot;|\{)/gi, '<span class="declaration">$1</span>$3')
                   .replace(/( ?\{(\\\}|[^\}][^\}\\]?)*\})/gi, '<span class="string">$1</span>');
                   
    }

    code = code.replace(/( ?\&quot\;(\\\&quot\;|.[^&\\]?)*?\&quot\;)/gi, '<span class="string">$1</span>');
    
    if(lang !== 'sdom'){
        code = code.replace(/( ?\&\#39\;(\\\&\#39\;|.[^&\\]?)*?\&\#39\;)/gi, '<span class="string">$1</span>')
                   .replace(/( ?`.*?`)/gi, '<span class="string">$1</span>');
    }

    // CSS
    if(lang === 'css'){
        code = code
                   .replace(/( ?--[-_a-z0-9]+)( *:)/gi, '<span class="declaration">$1</span>$2')
                   .replace(/( |\(|,|;|:)( ?[0-9]+[a-z\%µ]*)( |\)|,|;)/gi, '$1<span class="tag">$2</span>$3')
                   .replace(/( ?\[.+?\])/gi, '<span class="attribute">$1</span>')
                   .replace(/( ?&gt;)/gi, '<span class="declaration">$1</span>')
                   .replace(/(^ *[-_a-z0-9]+)( *:)/gi, '<span class="declaration">$1</span>$2')
                   .replace(/([-_a-z0-9]+)(\()/gi, '<span class="function">$1</span>$2')
                   .replace(/( ?@[-_a-z0-9]+ +[-a-z]+)/gi, '<span class="tag">$1</span>');
    }

    // GENERIC LANG
    if(lang === 'generic'){
        code = code.replace(/( ?(&amp;|&gt;=?|&lt;=?|\||={2,}))/gi, '<span class="declaration">$1</span>')
                   .replace(/( ?[0-9]+[a-z]+)/gi, '<span class="tag">$1</span>')
                   .replace(/((^| )[-_a-z]+ *)\(/gi, '<span class="function">$1</span>(')
                   .replace(/\[(.*?)\]/gi, '[<span class="declaration">$1</span>]')
                   .replace(/\((.*?)\)/gi, '(<span class="declaration">$1</span>)')
                   .replace(/( ?(\{|\}|:| \+ | - |;$|\(|\)|\[|\]))/gi, '<span class="keyword">$1</span>');
    }

    // ALL COMMENTS
    var comment_match;
    if(lang === 'html'){ comment_match = code.match(/&lt;!--.*?--&gt;/gi); }
    if(lang === 'sdom'){ comment_match = code.match(/(^| )#[^a-z0-9].*/gi); }
    if(lang === "css"){ comment_match = code.match(/\/\*.*?\*\//gi); }
    if(lang === 'js' || lang === 'generic'){ comment_match = code.match(/(\/\/.*|\/\*.*?\*\/)/gi); }

    for(var i in comment_match){
        var str = comment_match[i].replace(/<span class="[-a-z]+">/gi, '').replace(/<\/span>/gi, '');
        code = code.replace(comment_match[i], '<span class="comment">' + str + '</span>');
    }

    code = code.replace(/^(( |\t)+)/, '<span class="line-start">$1</span>')

    return code;

}