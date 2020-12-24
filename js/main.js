/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.boot = function() {
        console.log('boot');
    };

    this.init = function(win) {
        console.debug('[child:init] ', win.location.href);

        this.loadStyle(win, '../../media/woah/woah.css');

        this.addClass(win, 'main', ['woah', 'spin3D']);
        var el = winContext.document.getElementById('main');

        el.classList.add('woah');
        el.classList.add('spin3D');
        console.log(el);
    };

    this.addClass = function(win, elementId, classes) {
        var el = win.document.getElementById(elementId);

        if(!el) {
            console.warn('Unable to get element by id:', elementId);
            return;
        }

        classes.forEach(function(className) {
            el.classList.add(className);    
        });
    };

    this.loadStyle = function(winContext, url) {
        console.log(winContext.document);
        var link = winContext.document.createElement('link');

        link.href = url;
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.media = 'screen,print';
        
        winContext.document.getElementsByTagName('head')[0].appendChild(link);
    }; 

    this.setting = function(name, defaultValue) {

    };

    this.param = function(name, defaultValue, winContext) {
        var queryString = (winContext || windows).location.search;
        console.log(queryString);
        var urlParams = new URLSearchParams(queryString);
        var value = urlParams.get(name) || defaultValue;

        return value;
    };
};

$(function() {
    LBK.boot();
});