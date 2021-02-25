/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.settings = {
        ignoreInitIfAlreadyPlaying: false
    };

    this.SAVE_KEY = 'livebroadcastkit_store_v1';
    this.DEFAULT_RUN_ELEMENT = 'default.blank';
    this.SCREENS_FILE = 'screens/screens.json';
    this.ANIMATION_FILES = [
        'woah.json',
        'cssanimationio.json'
    ];
    this.SIZE_PRESETS = {
        '16:9': {name: '16:9', width: 1920, height: 1080}
    };

    this.elements = {
        'default.blank': {url: './screens/blank', name: 'Blank'},
        'default.test': {url: './screens/test', name: 'Color test'},
    };

    this.elementBeingRun = undefined;
    this.windowElementBeingRun = undefined;

    this.animations = [];
    this.screens = [];

    this.contentAreaUrl = '';
    this.windowContentArea = null;

    this.recorder = null;
    this.recordingData = [];
    this.recorderStream = null;
    this.isProcessingRecordingResult = false;
    this.recordingPanel = null;
    this.recordButton = null;

    this.testButton = null;    
    this.addButton = null;

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

        this.restoreState();
        this.buildSidePanelUI();
        this.runElementById(this.DEFAULT_RUN_ELEMENT);
        
        // Create a ticker function
        window.requestAnimationFrame(function(timestamp) {
            self.doTick(timestamp);
        });
    };

    this.doTick = function(timestamp) {
        var self = this;

        this.tick();

        window.requestAnimationFrame(function(timestamp) {
            self.doTick(timestamp);
        });
    };

    this.tick = function() {
        this.updateRecordingUI();
    };

    this.buildSizePresetsSelect = function() {
        var self = this;
        var select = document.getElementById('settingsSizePreset');

        select.options[select.options.length] = new Option('custom', 'custom');

        for(var id in this.SIZE_PRESETS) {
            var entry = this.SIZE_PRESETS[id];
            select.options[select.options.length] = new Option(entry.name, id);
        };

        $(select).on('change', function(el) {
            var value = $(this).val();
            var entry = self.SIZE_PRESETS[value];

            if(!entry || value == 'custom') {
                return;
            }

            document.getElementById('settingsContentWidth').value = entry.width;
            document.getElementById('settingsContentHeight').value = entry.height;

            self.resizeContentArea(entry.width, entry.height);
        });
    };

    this.resizeContentArea = function(width, height) {
        // TODO: update iframe size here too.

        if(!this.windowContentArea) {
            return;
        }

        this.windowContentArea.resizeTo(width, height);
    };
    
    this.buildRecordingUI = function() {
        var self = this;

        this.recordingPanel = $('#settingsRecordingPanel');
        this.recordButton = document.getElementById('btnRecord');

        $(this.recordButton).on('click', function(event) {
            self.onRecordButtonClick();
        });

        $('#settingsRecordingEnabledToggle').on('change', async function(event) {
            var checked = event.currentTarget.checked;
            
            if(!checked) {
                self.setContentAreaAsExternalWindow(false);
                self.destroyRecorder();
                return;
            }

            // This is the first time recording is enabled.
            // First of all, pop open the content area.
            self.setContentAreaAsExternalWindow(true, './screens/recording/setup.html');

            // Adjust the content area pop up to look like a modal
            // to explain what needs to happen.
            self.resizeContentArea(400, 800);

            // Create the recorder so the user can select the screen to record.
            await self.createRecorder();

            // Show recording preview in iframe
            self.setContentAreaIframeUrl('./screens/recording/');
        });
    };

    this.buildTestAddUI = function() {
        var self = this;

        this.testButton = document.getElementById('btnTest');
        this.addButton = document.getElementById('btnAdd');

        $(this.testButton).on('click', function(event) {
            self.onTestButtonClick();
        });

        $(this.addButton).on('click', function(event) {
            self.onAddButtonClick();
        });        
    };
    
    this.getCreationPanelScreenId = function() {
        var screenId = $('#settingsCreationType').val();
        return screenId;
    };

    this.onTestButtonClick = function() {
        this.runCreationPanelElement();
    };
    
    this.onAddButtonClick = function() {
        this.addElementFromCreationPanel();
        this.refreshElementsPanel();
        this.saveState();

        $('#settingsApplication').get(0).scrollIntoView({ behavior: 'smooth' });

        this.emptyCreationPanel();
    };

    this.emptyCreationPanel = function() {
        $('#settingsCreationType').val('');
        $('#settingsCreationName').val('');
    };

    this.saveState = function() {
        var state = {
            version: 1,
            elements: this.elements,
            panel: this.getFormValuesAsObject('.contentParam')
        }

        console.log('Saving app state to local storage:', state);
        store.set(this.SAVE_KEY, state);
    };

    this.restoreState = function() {
        var state = store.get(this.SAVE_KEY);

        if(!state) {
            console.log('App has no saved state, so this is a cold boot.');
            return;
        }

        console.log('Restoring app state from local storage', state);

        this.elements = state.elements;
        for(var prop in state.panel) {
            $('#' + prop).val(state.panel[prop])
        }
    };

    this.refreshElementsPanel = function() {
        var self = this;
        var content = '';

        $('#settingsElements ul').empty();

        for(var id in this.elements) {
            var element = this.elements[id];
            var isDeletable = id.indexOf('default.') == -1;
            var isRecordable = false; // TODO: implement this

            content += '<li class="list-group-item">' +
                            '<a href="javascript:void(0);" data-action="run" data-element="' + id + '">'+ element.name +'</a> ' +
                            (isDeletable ? '<a href="javascript:void(0);" class="float-right" data-action="delete" data-element="' + id + '">[Delete]</a> ' : '') +
                            (isRecordable ? '<a href="javascript:void(0);" class="float-right" data-action="record" data-element="' + id + '">[Record]</a>' : '') +
                        '</li>';
        }

        $('#settingsElements ul').html(content);

        $('#settingsElements a').on('click', function(event) {
            var id = $(event.currentTarget).data('element');
            var action = $(event.currentTarget).data('action');

            if (action == 'run') {
                self.runElementById(id);
            } else if (action == 'delete') {
                if(!confirm('Are you sure you want to remove this?')) {
                    return;
                }
                self.removeElementFromElementsList(id);
            }
        });
    };

    this.removeElementFromElementsList = function(elementId) {
        var removed = this.removeElementById(elementId);

        if (removed) {
            console.debug('Removed entry from elements list, element id is: ', elementId);
            this.refreshElementsPanel();
            this.saveState();
        }
    };

    this.getScreenById = function(id) {
        var ret = null;

        this.screens.forEach(function(screen) {
            if(screen.id == id) {
                ret = screen;
            }
        });

        return ret;
    };

    this.runElementById = function(elementId, params, force) {
        var element = this.elements[elementId];

        if(!element) {
            console.error('Unable to find element with id:', elementId);
            return;
        }

        this.runElement(element, params, force);
    };

    this.removeElementById = function(elementId) {
        var element = this.elements[elementId];

        if(!element) {
            return false;
        }

        this.elements[elementId] = null;
        delete this.elements[elementId];

        return true;
    };

    this.playElementBeingRun = function(element, params) {
        var win = this.windowContentArea;

        if(!win) {
            console.warn('Unable to play element being run because of invalid window.');
            return;
        }

        if(win.play) {
            win.play(params);
        }

        console.debug('Already loaded element should play now:', element, params);
    };

    this.initElementStylesFromContentAreaSettings = function(win) {
        var body = win.document.body;
        var settings = this.getContentAreaURLParams();

        this.changeElementStyleProp(win, body, 'backgroundColor', settings.settingsContentBgColor);
        console.debug('Changing background-color of element window to conform with settingsContentBgColor', settings.settingsContentBgColor, win);
    };

    this.initElementBeingRun = function() {
        var win = this.isUsingContentAreaAsExternalWindow() ? this.windowContentArea : this.windowElementBeingRun;
        var params = this.getCreationPanelParams();
       
        if(!win) {
            console.warn('Unable to init element being run because of invalid window.');
            return;
        }

        if(this.elementBeingRun.params) {
            console.debug('initElementBeingRun with its own params: ', params);
            params = this.elementBeingRun.params;
        }

        this.initElementStylesFromContentAreaSettings(win, params);

        if(win.init) {
            win.init(params);
        }

        console.debug('Already loaded element should init', params);
    };

    this.runElement = function(element, params, force) {
        var elementParams = params || {};
        var isElementAlreadyRunning = this.elementBeingRun && this.elementBeingRun.url == element.url;

        if(isElementAlreadyRunning && !force && this.settings.ignoreInitIfAlreadyPlaying) {
            // Element already loaded, no need to init it again.
            // We just need to play.
            console.debug('Asking to run an element that is already running, calling play instead');
            this.playElementBeingRun(element, params);
            return;
        }

        console.debug('Running element:', element, elementParams);

        this.elementBeingRun = element;
        var finalUrl = this.setContentAreaURL(element.url);
        
        // If recording is enabled, the iframe URL is fixed at the recording
        // previwer. In such case, we don't update if, only the external
        // window url (pop up)
        if(!this.isRecordingEnabled()) {
            this.setContentAreaIframeUrl(finalUrl, elementParams);
        }

        if(this.isUsingContentAreaAsExternalWindow() || this.isRecordingEnabled()) {
            this.setContentAreaPopupUrl(finalUrl, elementParams);
        }
    };

    this.onRecordButtonClick = async function() {
        if(!this.recorder) {
            this.setContentAreaAsExternalWindow(true);
            this.startRecording();
            return;
        }

        if(this.recorder.state == 'recording') {
            this.stopRecording();
            return;
        }

        if(this.recorder.state == 'inactive') {
            this.startRecording();
            return;
        }

        if(this.recorder.state == 'paused') {
            // TODO: add togglePauseResumeRecording()
            return;
        }

        console.log('onRecordButtonClick', this, this.recorder.state);
    };

    this.buildSidePanelUI = function() {
        var self = this;

        this.buildSizePresetsSelect();
        this.buildRecordingUI();
        this.buildTestAddUI();

        $('#settingsContentExternaWindow').off().on('change', function(event) {
            var checked = event.currentTarget.checked;
            self.setContentAreaAsExternalWindow(checked);
        });

        $('.contentParam').on('change', function(el) {
            var el = $(this);
            var name = el.attr('id');
            var value = el.val();

            self.onSettingsChange(name, value);
        });

        this.refreshElementsPanel();
    };

    this.getSettingsContentSizes = function() {
        var ret = {
            width: document.getElementById('settingsContentWidth').value,
            height: document.getElementById('settingsContentHeight').value
        };

        return ret;
    };

    this.onSettingsChange = function(name, value) {
        if(name == 'settingsContentWidth' || name == 'settingsContentHeight') {
            var sizes = this.getSettingsContentSizes();
            var width = name == 'settingsContentWidth' ? value : sizes.width;
            var height = name == 'settingsContentHeight' ? value : sizes.height;
            
            this.resizeContentArea(width, height);
            $('#settingsSizePreset').val('custom');
        }

        this.saveState();
    };

    this.buildScreensUI = function() {
        var self = this;
        var select = self.fillSelectElementWithScreens('settingsCreationType', this.screens);

        $(select).on('change', function(event) {
            var screenId = $(this).val();
            self.onScreenSelectChange(screenId, event.currentTarget);
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

    this.getCreationPanelParams = function() {
        return this.getFormValuesAsObject('.screenParam', 'name');
    };

    this.onScreenSelectChange = function(screenId, element) {
        this.buildCreationPanelParamsFromScreenId(screenId);
        this.runCreationPanelElement(screenId);
    };

    this.buildCreationPanelParamsFromScreenId = function(screenId) {
        var screen = this.getScreenById(screenId);
        var inputs = '';
        var prefix = 'settingsCreationParam_';

        if(!screen) {
            console.warn('Unable to find screen with id:', screenId);
            return;
        }

        if(!screen.params) {
            return;
        }

        for(var name in screen.params) {
            var entry = screen.params[name];
            var id = prefix + name;            
            var label, type, type = 'text', value = '';

            if(this.isString(entry)) {
                label = name;
                type = entry;
            } else if(this.isArray(entry) || entry.options){
                label = entry.label || name;
                type = 'select';
                value = entry.options || entry;
            } else {
                label = entry.label;
                type = entry.type;
                value = entry.value;
            }

            inputs += '<label for="' + id + '" class="mt-2">' + label + '</label>';
            inputs += this.generateFormElementFromScreenEntry(type, id, name, value);
        }

        $('#settingsCreationScreenParams').empty().html(inputs);
        this.hidrateCreationPanelParamInputs();
    };

    this.getBase64 = function(file, callback) {
        var reader = new FileReader();
        reader.addEventListener('load', function() { callback(reader.result) });
        reader.readAsDataURL(file);
    };

    this.hidrateCreationPanelParamInputs = function() {
        var self = this;

        $('#settingsCreationScreenParams input').each(function(idx, el) {
            var type = $(el).attr('type');

            if(type != 'file') {
                return;
            }

            $(el).on('change', function(event) {
                var element = event.currentTarget;

                if(element.files.length == 0) {
                    return;
                }

                var file = element.files[0];

                self.getBase64(file, function(base64Data){
                    $(el).data('value-base64', base64Data);
                });
                
                var id = $(element).attr('id');
                var objURL = window.URL.createObjectURL(file);

                $('#preview_' + id)
                    .empty()
                    .html('<img src="' + objURL + '" />')
                    .show();
                $(element).hide();
            });
        });
    };

    this.generateFormElementFromScreenEntry = function(type, id, name, value) {
        var inputs = '';

        switch(type) {
            case 'text':
            case 'color':
                inputs += '<input type="' + type + '" class="form-control contentParam screenParam" id="' + id + '" name="' + name + '" value="' + value + '" />';
                break;
            case 'textarea':
                inputs += '<textarea class="form-control contentParam screenParam" id="' + id + '" name="' + name + '" rows="3">' + value + '</textarea>';
                break;                    
            case 'select':
                inputs += '<select class="form-control contentParam screenParam" id="' + id + '" name="' + name + '">';
                value.map(function(option) {
                    inputs += '<option>' + option + '</option>';
                });
                inputs += '</select>';
                break; 
            case 'file':
                inputs += 
                    '<input type="file" class="form-control contentParam screenParam" id="' + id + '" name="' + name + '" accept="image/*" />' +
                    '<div id="preview_' + id + '" style="display:none;" class="file-preview"></div>';
                break;  
        }

        return inputs;
    };

    // https://stackoverflow.com/a/9436948
    this.isString = function(obj) {
        return (typeof obj === 'string' || obj instanceof String)
    }

    // https://stackoverflow.com/a/4775737
    this.isArray = function(obj) {
        return (Object.prototype.toString.call( obj ) === '[object Array]')
    }

    this.runCreationPanelElement = function(informedScreenId) {
        var screenId = informedScreenId || this.getCreationPanelScreenId();
        var screen = this.getScreenById(screenId);
        var params = this.getCreationPanelParams();

        if(!screen) {
            console.warn('Unable to find screen with id:', screenId);
            return;
        }

        this.runElement({
            url: screen.url
        }, params);
    };

    // https://gist.github.com/codeguy/6684588
    this.slugify = function(str) {
        str = str.replace(/^\s+|\s+$/g, ''); // trim
        str = str.toLowerCase();
      
        // remove accents, swap ñ for n, etc
        var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
        var to   = "aaaaeeeeiiiioooouuuunc------";
        for (var i=0, l=from.length ; i<l ; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }
    
        str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
            .replace(/\s+/g, '-') // collapse whitespace and replace by -
            .replace(/-+/g, '-'); // collapse dashes
    
        return str;
    }

    this.addElementFromCreationPanel = function() {
        var screenId = this.getCreationPanelScreenId();
        var screen = this.getScreenById(screenId);
        var name = $('#settingsCreationName').val();
        var id = screenId + '_' + this.slugify(name);

        var element = {
            name: name,
            url: screen ? screen.url : '',
            screenId: screenId,
            params: this.getCreationPanelParams()
        }

        console.debug('Saving element:', id, element);
        this.elements[id] = element;
    };    

    this.getContentAreaURLParams = function() {
        return this.getFormValuesAsObject('.contentParam');
    };

    this.getFormValuesAsObject = function(selector, attributeAsName) {
        var data = {};
        var attr = attributeAsName || 'id';

        $(selector).each(function(idx, el) {
            var name = $(el).attr(attr);
            var value = $(el).val();
            var type = $(el).attr('type');

            if(type == 'file') {
                value = $(el).data('value-base64');
            }

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

    this.setContentAreaAsExternalWindow = function(value, url) {
        $('#settingsContentExternaWindow').bootstrapToggle(value ? 'on' : 'off', true);

        url = url || this.contentAreaUrl;

        if(value && !this.windowContentArea) {
            this.popupContentArea(url);

        } else if(!value && this.windowContentArea) {
            this.windowContentArea.window.close();
            this.windowContentArea = null;
        }
    };

    this.setRecordingEnabledToggle = function(value) {
        $('#settingsRecordingEnabledToggle').bootstrapToggle(value ? 'on' : 'off', true);
    };

    this.isUsingContentAreaAsExternalWindow = function() {
        return document.getElementById('settingsContentExternaWindow').checked;
    };

    this.isRecordingEnabled = function() {
        return document.getElementById('settingsRecordingEnabledToggle').checked;
    };

    this.popupContentArea = function(url, width, height, force) {
        if(this.windowContentArea && !force) {
            // window already exists
            return;
        }
        
        var self = this;
        var contentSize = this.getSettingsContentSizes();

        const w = width || contentSize.width;
        const h = height || contentSize.height;

        var windowFeatures = 'menubar=no,location=no,resizable=no,scrollbars=no,status=no';

        this.windowContentArea = window.open(url, 'Content | Live Broadcast Kit • CC UFFS', windowFeatures);
        this.windowContentArea.resizeTo(w, h);

        this.windowContentArea.addEventListener('beforeunload', function(event) {
            // FIX call to self.onWindowContentAreaClosed();
        });
    };

    this.onWindowContentAreaClosed = function() {
        console.log('Content area external window closed!');
        
        this.setContentAreaAsExternalWindow(false);
        this.setRecordingEnabledToggle(false);        
        
        this.stopRecording();
        this.destroyRecorder();
        this.runElementById(this.DEFAULT_RUN_ELEMENT, {}, true);

        this.windowContentArea = null;        
    };

    this.setContentAreaPopupUrl = function(url, params) {
        if(!this.windowContentArea) {
            this.popupContentArea(url);
        }

        this.windowContentArea.location = url;
    };

    this.setContentAreaIframeUrl = function(url, params) {
        var contentIframe = document.getElementById('content');
        contentIframe.src = url;
    };

    this.setContentAreaURL = function(url) {
        var params = this.getContentAreaURLParams();
        var finalUrl = this.makeFinalContentURL(url, params);

        console.log('Set content url:', finalUrl);
        this.contentAreaUrl = finalUrl;

        return this.contentAreaUrl;
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

            option.value = screen.id;
            option.text = screen.name;
            select.appendChild(option);
        });

        return select;
    };

    this.init = function(win, ignoreAdjustList) {
        var self = this;
        console.debug('[child:init] ', win.location.href);

        this.windowElementBeingRun = win;
        this.loadChildStyles(win);
        
        if(!ignoreAdjustList) {
            this.runElementsAdjustmentsList(win);
        }

        this.initElementBeingRun();

        return {
            param: function(name, defaultValue) {
                return self.param(name, defaultValue, win);
            },
            getPlaybackSrcObject: function() {
                return self.recorderStream;
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

    this.mixAudioStreams = function(stream1, stream2) {
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
    
        if(stream1.getAudioTracks().length > 0)
            ctx.createMediaStreamSource(stream1).connect(dest);
    
        if(stream2.getAudioTracks().length > 0)
            ctx.createMediaStreamSource(stream2).connect(dest);
    
        let tracks = dest.stream.getTracks();
        tracks = tracks.concat(stream1.getVideoTracks()).concat(stream2.getVideoTracks());
    
        return new MediaStream(tracks)
    };
    
    this.generateFilename = function() {
        const now = new Date();
        const timestamp = now.toISOString();
        return `recording_${timestamp}`;
    };

    this.onRecordingDataAvailable = function() {
        this.isProcessingRecordingResult = false;
        console.log('self.recordingData', this.recordingData);
    };

    this.destroyRecorder = function() {
        if(this.recorder && this.recorder.state != 'inactive') {
            this.recorder.stop();
        }

        if(this.recorderStream) {
            this.recorderStream.getTracks().forEach(function(track) {
                track.stop();
            });
        }

        this.recorder = null;
        this.recorderStream = null;
    };

    this.createRecorder = async function() {
        var self = this;
        let gumStream, gdmStream;
        
        this.recordingData = [];
        
        try {
            gumStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
            gdmStream = await navigator.mediaDevices.getDisplayMedia({video: {displaySurface: 'application', frameRate: null}, audio: true});
    
        } catch (e) {
            console.error('Problem to create recorder:', e);
            return
        }
    
        this.recorderStream = gumStream ? this.mixAudioStreams(gumStream, gdmStream) : gdmStream;
        this.recorder = new MediaRecorder(this.recorderStream, {mimeType: 'video/webm'});
    
        this.recorder.ondataavailable = e => {
            if (!e.data || e.data.size <= 0) {
                return;
            }

            self.recordingData.push(e.data);
            self.onRecordingDataAvailable(e);
        };
    
        this.recorder.onStop = function() {
            self.recorderStream.getTracks().forEach(track => track.stop());
            gumStream.getTracks().forEach(track => track.stop());
            gdmStream.getTracks().forEach(track => track.stop());
        };
    
        this.recorderStream.addEventListener('inactive', function() {
            console.log('Capture stream inactive');
        });
    };

    this.startRecording = function() {
        if(!this.recorder) {
            console.error('Trying to record without a recorder.');
            return;
        }
        this.recorder.start();
        this.isProcessingRecordingResult = false;
    };
    
    this.updateRecordingUI = function() {
        var panel = this.recordingPanel;

        if(!this.isRecordingEnabled()) {
            if(!panel.hasClass('hide')) {
                panel.removeClass('show');
                panel.addClass('hide');
            }
            $('#btnRecord').hide();
            return;
        }

        $('#btnRecord').show();

        if(!panel.hasClass('show')) {
            panel.removeClass('hide');
            panel.addClass('show');
        }

        if(!this.recorder) {
            return;
        }

        if(this.recorder.state ==='recording') {
            this.recordButton.innerHTML = 'Stop';
        } else {
            this.recordButton.innerHTML = 'Record';
        }
    };

    this.stopRecording = function () {
        if(this.recorder && this.recorder.state != 'inactive') {
            this.recorder.stop();
        }
        this.isProcessingRecordingResult = true;        
    };

    this.isRecording = function() {
        return this.recorder && (this.recorder.state === 'recording' || this.recorder.state === 'paused');
    }
   
    this.togglePauseResumeRecording = function() {
        if(this.recorder.state ==='paused'){
            this.recorder.resume();
        } else if (this.recorder.state === 'recording'){
            this.recorder.pause();
        } else {
            console.error(`recorder in unhandled state: ${this.recorder.state}`);
        }
    
        console.log(`recorder ${this.recorder.state === 'paused' ? "paused" : "recording"}`);
    };
    
    this.saveRecording = function() {
        console.log(this.recordingData);
        const blob = new Blob(this.recordingData, {type: 'video/webm'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${this.generateFilename()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log(`${a.download} save option shown`);
        }, 100);
    };
};

$(function() {
    LBK.boot();
});