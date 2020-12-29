/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.ANIMATION_FILES = [
        'woah.json',
        'cssanimationio.json'
    ];

    this.animations = [];

    this.boot = function() {
        var self = this;

        console.debug('boot');

        this.loadAnimations(this.ANIMATION_FILES, function() {
            console.debug('Finished loading available animations');
            self.buildUI();
        });
    };

    this.buildUI = function() {
        var self = this;
        var components = [
            'settingsCreationInEffect',
            'settingsCreationMiddleEffect',
            'settingsCreationOutEffect'
        ]

        components.forEach(function(id) {
            var select = self.fillSelectElementWithAnimations(id, self.animations);

            $(select).on('change', function(event) {
                self.onEffectSelectChange($(this).val(), event.currentTarget);
            });
        });
    };

    this.onEffectSelectChange = function(value, element) {
        console.log('onEffectSelectChange', value, element);
    };

    this.loadAnimations = function(files, callback) {
        var self = this;

        files.forEach(function(url) {
            fetch('./media/' + url)
                .then(response => response.json())
                .then(function(json) {
                    self.animations.push(json);
                    console.debug('Animation loaded:', json.name, json.url);

                    if(self.animations.length >= files.length && callback) {
                        callback.call(self);
                    }
                });
        });
    };

    this.fillSelectElementWithAnimations = function(elementId, animations) {
        var select = document.getElementById(elementId);

        animations.forEach(function(anim) {
            for(var group in anim.elements) {
                var elements = anim.elements[group];
                var optgroup = document.createElement('optgroup');

                optgroup.label = anim.name + ' - ' + group;

                elements.forEach(function(entry) {
                    var option = document.createElement('option');

                    option.value = anim.name + '|' + entry.value;
                    option.text = entry.name;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            }
        });

        return select;
    };

    this.init = function(win) {
        var self = this;
        console.debug('[child:init] ', win.location.href);

        this.loadChildStyles(win);
        this.runElementsAdjustmentsList(win);

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