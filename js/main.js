/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.SCREENS_FILE = 'screens/screens.json';
    this.ANIMATION_FILES = [
        'woah.json',
        'cssanimationio.json'
    ];

    this.animations = [];
    this.screens = [];

    this.boot = function() {
        var self = this;

        console.debug('boot');

        this.loadAnimations(this.ANIMATION_FILES, function() {
            console.debug('Finished loading available animations');
            self.buildEffectsUI();
        });

        this.loadScreens(this.SCREENS_FILE, function() {
            console.debug('Finished loading available screens');
            self.buildScreensUI();
        });
    };

    this.buildScreensUI = function() {
        var self = this;
        var select = self.fillSelectElementWithScreens('settingsCreationType', this.screens);

        $(select).on('change', function(event) {
            self.onScreenSelectChange($(this).val(), event.currentTarget);
        });
    };


    this.buildEffectsUI = function() {
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
        console.debug('onEffectSelectChange', value, element);
    };

    this.onScreenSelectChange = function(value, element) {
        this.setContentAreaURL(value);
    };

    this.getContentAreaURLParams = function() {
        var data = {};

        $('.contentParam').each(function(idx, el) {
            var name = $(el).attr('id');
            var value = $(el).val();

            data[name] = value;
        });

        return data;
    };

    this.makeFinalContentURL = function(url, params) {
        var finalUrl = url.replace(/(\$\{([a-zA-Z])*\})*/gi, function(matched) {
            if(!matched) {
                return '';
            }

            var entry = matched.replace('${', '').replace('}', '');

            if(!params[entry]) {
                console.warn('Unable to replace "' + matched + '" with property "' + entry + '" in content URL:', url);
                return '';
            }

            return params[entry];
        });

        return finalUrl;
    };

    this.setContentAreaURL = function(url) {
        var contentIframe = document.getElementById('content');
        var params = this.getContentAreaURLParams();
        var finalUrl = this.makeFinalContentURL(url, params);

        console.log('Set content url:', finalUrl);
        contentIframe.src = finalUrl;
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

    this.loadScreens = function(fileUrl, callback) {
        var self = this;

        fetch(fileUrl)
            .then(response => response.json())
            .then(function(json) {
                self.screens = json;

                if(callback) {
                    callback.call(self);
                }
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

    this.fillSelectElementWithScreens = function(elementId, screens) {
        var select = document.getElementById(elementId);

        screens.forEach(function(screen) {
            var option = document.createElement('option');

            option.value = screen.url;
            option.text = screen.name;
            select.appendChild(option);
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