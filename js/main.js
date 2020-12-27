/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.boot = function() {
        console.log('boot');
    };

    this.init = function(win) {
        var self = this;
        console.debug('[child:init] ', win.location.href);

        this.loadChildStyles(win);
        this.addClass(win, 'main', ['woah', 'spin3D']);

        return {
            param: function(name, defaultValue) {
                return self.param(name, defaultValue, win);
            },
        };
    };

    this.loadChildStyles = function(win) {
        var self = this;
        var elements = [
            'woah/woah.css',
            'cssanimation.io/cssanimation.min.css',
            'animate.css/animate.min.css',
        ];

        elements.forEach(function(file) {
            self.loadStyle(win, '../../media/' + file);
        })
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

    this.loadStyle = function(win, url) {
        var link = win.document.createElement('link');

        link.href = url;
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.media = 'screen,print';
        
        win.document.getElementsByTagName('head')[0].appendChild(link);

        console.debug('Loading style', link, win);        
    }; 

    this.setting = function(name, defaultValue) {

    };

    this.param = function(name, defaultValue, winContext) {
        var queryString = (winContext || windows).location.search;

        var urlParams = new URLSearchParams(queryString);
        var value = urlParams.get(name) || defaultValue;

        return value;
    };
};

$(function() {
    LBK.boot();
});