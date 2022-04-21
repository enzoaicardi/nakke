
var body = document.body;
var colorMode = localStorage.getItem('nakke-color-mode');
if(colorMode) body.setAttribute('class', colorMode);

// SWITCH MODE

globalListener('click', '.doc-color-mode span', function(e){

    var t = e.target;

    if(body.getAttribute('class') === t.textContent) return;

    if(t.textContent === 'dark_mode'){
        body.setAttribute('class', 'dark_mode');
        localStorage.setItem('nakke-color-mode', 'dark_mode');
        return;
    }

    body.setAttribute('class', '');
    localStorage.setItem('nakke-color-mode', '');

}, {passive: true});

// VARS

var docContent = qs('.doc-content .content');

// get the current page only on first load
var currentPage = 'index';
var previousPage = {name: '', slug: ''};
var nextPage = {name: '', slug: ''};

var searchContent = [];

nakkeImport('sidebar', qs('.doc-sidebar .content'), true);
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

globalListener('click', '.cat-content a, .doc-content .doc-content-nav a', function(e){

    e.preventDefault();
    var pageName = e.target.getAttribute('data-page') || '404';
    if(pageName === currentPage) return;
    nakkeImport(pageName);

    burgerDo('close');

}, {});

// SUMMARY ANCHOR CLICK
var easingCubic = function(x){ return 1 - Math.pow(1 - x, 3); }

var scrollAnimation = crimson({
    duration: 800,
    easing: easingCubic
});

globalListener('click', 'a', function(e){

    e.preventDefault();
    var anchor = e.target.getAttribute('data-anchor');
    if(!anchor) return;

    var distance = qs('#'+anchor, docContent).offsetTop - 100;
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

}, {}, qs('.doc-summary .content .summary'));

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
    
    if(scrollEventShouldWait) return;

    scrollEventShouldWait = true;
    setTimeout(() => { 
        var sts = qs('.doc-summary .summary a.v');
        if(sts) sts.classList.remove('v');

        var summaryTitle = qs('.doc-summary .summary a[data-anchor="' + currentContentAnchor() + '"]');
        if(summaryTitle) summaryTitle.classList.add('v');

        scrollEventShouldWait = false;
    }, 600);

}, {passive:true});

function currentContentAnchor(){

    var ca = qsa('h1[id], h2[id], h3[id], h4[id]', docContent);

    for(var i=ca.length-1; i>=0; i--){

        var distance = ca[i].offsetTop;
        var scrolled = docContent.scrollTop;

        if(scrolled > distance - 120){
            return ca[i].id;
        }

    }

}

// CODEBOX COPY

if (navigator.clipboard) {
    globalListener('click', '.doc-code-box > header span[data-core-marker]', function(e){

        var ct = e.target.getAttribute('data-content');
        if(!ct) return;

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
    nakkeImport(pageName, false, false, true);

}, {passive: true});

// CODE IMPORT

function nakkeImport(name, container, sidebar, state){

    currentPage = name;

    var url = './pages/' + name + '.sdom';
    container = container || docContent;

    fetch(url)
    .then(function(response) {
        if(response.ok){
            if(!state) history.pushState({page: name}, '', '?page='+name);
            return response.text();
        }else{
            nakkeImport('404');
            return false;
        }
    })
    .then(function(code) {
        if(!code) return;
        container.innerHTML = smallDomTranspile(code).replace(/<img/g, '<img loading="lazy"');
        if(sidebar) {nakkeParseSideBar(); return;}
        nakkeHighlightSideBar();
        nakkeParseContent();
    });

}

// CODE TRANSFORM

// parse sidebar (just one time)
function nakkeParseSideBar(){
    var sidebar = qs('.doc-sidebar .content');
    var sections = qsa('section', sidebar);
    var HTML = '';

    for(var section of sections){
        HTML += '<div class="cat"><div class="cat-header" data-core-catname>';
            HTML += '<p data-core-marker>' + (section.getAttribute('char')[0] || '/') + '</p>';
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

                var pageParam = link.getAttribute('page') || link.textContent;
                
                obj.name = link.textContent;
                obj.page = pageParam;
                searchContent.push(obj);
                
                HTML += '<a href="?page='+pageParam+'" data-page="'+pageParam+'">'+link.textContent+'</a>';
            
            }

        HTML += '</div></div>';
    }

    sidebar.innerHTML = HTML;
}

// parse content
function nakkeParseContent(){
    var codeInline = qsa('q', docContent);
    var codeBlock = qsa('code', docContent);

    for(var code of codeInline){
        code.outerHTML = '<span data-core-marker="code">'+escapeHTML(code.textContent)+'</span>';
    }

    for(var code of codeBlock){

        var pre = code.textContent.split('\n');
        var indent = ' '.repeat(code.getAttribute('spaces') || 0);
        var col1 = '';
        var col2 = '';

        for(var i=0; i<pre.length; i++){
            if(indent) pre[i] = pre[i].replace(indent, '');
            col1 += '<p>'+(i+1)+'</p>';
            col2 += '<p>'+escapeHTML(pre[i])+'</p>';
        }

        var HTML = '<aside class="doc-code-box"><header>';
            HTML += '<p data-core-marker>&lt; &gt;</p>';
            HTML += '<h5>'+(code.getAttribute('title') || 'no title')+'</h5>';
            HTML += '<span class="material-icons" data-content="'+escapeHTML(pre.join('\n'))+'" data-core-marker>content_copy</span></header>';

            HTML += '<div class="doc-box"><div class="doc-table"><div class="doc-table-col1">';
                HTML += col1;
            HTML += '</div><div class="doc-table-col2"><div class="doc-table-col-block">';
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

    // generate summary at the end because elements could be
    // resized or tags can change (this can effect offsetTop)
    nakkeGenerateSummary();

}

// generate summary
function nakkeGenerateSummary(){

    var titles = qsa('h1, h2, h3, h4', docContent);

    var summaryContent = qs('.doc-summary .summary');
    var HTML = ''; var u = 0;

    for(var title of titles){
        var slug = slugIt(title.textContent).toLowerCase() + '-' + (++u);
        var level = title.tagName.toLowerCase();

        title.setAttribute('id', slug);
        HTML += '<a class="'+level+''+(u===1 ? ' v' : '')+'" data-anchor="'+slug+'">'+escapeHTML(title.textContent)+'</a>';
    }

    function slugIt(str){
        return str.replace(/[^a-z0-9_ -]/gi, '').replace(/ /g, '-');
    }

    summaryContent.innerHTML = HTML;

}

function nakkeHighlightSideBar(){

    var links = qsa('.doc-sidebar .content .cat-content a');

    for(var i=0; i<links.length; i++){

        var link = links[i];
        if(link.classList.contains('v')) link.classList.remove('v');
        
        var isPage = currentPage === getPageAttr(link);
                
        if(isPage){
            link.classList.add('v');
            nextPage.name = getPageAttr(links[i+1], 'name');
            nextPage.slug = getPageAttr(links[i+1]);
            previousPage.name = getPageAttr(links[i-1], 'name');
            previousPage.slug = getPageAttr(links[i-1]);
        }

    }

}

function getPageAttr(link, name){
    if(!link) return '';
    if(name) return link.textContent;
    return link.getAttribute('data-page') || '404';
}

// SEARCH

var searchInput = qs('.doc-content header input');

qs('.doc-content > header span').addEventListener('click', function(){

    var t = searchInput;

    if(t.value) searchInFiles(t.value);
    else {nakkeImport(currentPage);}

    burgerDo('close');

}, {passive:true});

searchInput.addEventListener('keydown', function(e){

    var t = e.currentTarget;

    if(e.key === 'Enter'){
    
        if(t.value){
            searchInFiles(t.value);
        }

        if(!t.value){
            nakkeImport(currentPage);
        }

        burgerDo('close');

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
            
            HTML += '<article class="doc-search" data-page="'+obj.page+'"><header><p data-core-marker>page</p><h5>'+pageName+'</h5></header>';
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
    var params = window.location.search;
    if(!params) return 'index';

    var urlParams = new URLSearchParams(params);
    
    var page = urlParams.get('page') || 'index';
    return page;
}