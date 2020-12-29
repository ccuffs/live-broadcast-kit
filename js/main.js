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
        
        this.runElementsAdjustmentsList(win);
        this.adjustElementSize(win, win.document.body);
        this.adjustElementSize(win, win.document.getElementById('elements'));

        this.addClass(win, 'main', ['woah', 'spin3D']);

        return {
            param: function(name, defaultValue) {
                return self.param(name, defaultValue, win);
            },
        };
    };

    // Will process something like:
    //   adjusts=elements,width;1920px,height;1080px|other,display;block
    //
    // making:
    //    elements
    //          width: 1920px;
    //          height: 1080px;
    //    other
    //          display: block;  
    this.runElementsAdjustmentsList = function(win) {
        var self = this;
        var entriesString = this.param('adjusts', '', win);
        var entries = entriesString.split('|');

        entries.forEach(function(infos) {
            var runList = infos.split(',');

            if(!runList.length) {
                return;
            }
            console.log(runList);
            var elementId = runList[0];
            var element = win.document.getElementById(elementId);

            for(var i = 1; i < runList.length; i++) {
                var pair = runList[i].split(';');

                if(pair.length != 2) {
                    console.warn('Invalid pair for adjusts list:', runList[i], infos);
                    return;
                }

                self.changeElementStyleProp(win, element, pair[0], pair[1]);
            }
        });
    };

    this.changeElementStyleProp = function(win, el, prop, value) {
        if(!el || !prop) {
            return;
        }

        el.style[prop] = value;
        console.debug('Element style prop changed:', prop, value, el, win);
    };

    this.adjustElementSize = function(win, el) {
        if(!el) {
            return;
        }

        var windowWidth = this.param('windowWidth', 1920, win) | 0;
        var windowHeight = this.param('windowHeight', 1080, win) | 0;

        el.style.width = windowWidth + 'px';
        el.style.height = windowHeight + 'px';

        console.debug('Element size adjusted to w:' + windowWidth + 'px h:' + windowHeight + 'px', el, win);
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