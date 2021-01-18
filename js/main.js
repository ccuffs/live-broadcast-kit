/**
 * @author Fernando Bevilacqua <fernando.bevilacqua@uffs.edu.br>
 * @license MIT
 */
var LBK = new function() {
    this.DEFAULT_CONTENT_AREA_URL = 'screens/blank/';
    this.SCREENS_FILE = 'screens/screens.json';
    this.ANIMATION_FILES = [
        'woah.json',
        'cssanimationio.json'
    ];
    this.SIZE_PRESETS = {
        '16:9': {name: '16:9', width: 1920, height: 1080}
    };

    this.animations = [];
    this.screens = [];

    this.contentAreaUrl = '';
    this.windowContentArea = null;

    this.recorder = null;
    this.recordingData = [];
    this.recorderStream;

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

        this.buildSidePanelUI();
        this.setContentAreaURL(this.DEFAULT_CONTENT_AREA_URL);
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
        $('#btnRecord').on('click', function(event) {
            self.startRecording();

            setTimeout(function() {
                console.log('Auto stop');
                self.stopRecording();
            }, 6000);

            setTimeout(function() {
                console.log('Save');
                self.saveRecording();
            }, 10000);
        });
    };

    this.buildSidePanelUI = function() {
        var self = this;

        this.buildSizePresetsSelect();
        this.buildRecordingUI();

        $('#settingsContentExternaWindow').on('change', function(event) {
            var checked = event.currentTarget.checked;
            self.setContentAreaAsExternalWindow(checked);
        });

        $('.contentParam').on('change', function(el) {
            var el = $(this);
            var name = el.attr('id');
            var value = el.val();

            self.onSettingsChange(name, value);
        });
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

    this.setContentAreaAsExternalWindow = function(value) {
        $('#settingsContentExternaWindow').bootstrapToggle(value ? 'on' : 'off', true);

        if(value && !this.windowContentArea) {
            this.popupContentArea(this.contentAreaUrl);

        } else if(!value && this.windowContentArea) {
            this.windowContentArea.window.close();
        }
    };

    this.isUsingContentAreaAsExternalWindow = function() {
        return document.getElementById('settingsContentExternaWindow').checked;
    };

    this.popupContentArea = function(url) {
        var self = this;
        var contentSize = this.getSettingsContentSizes();
        var windowFeatures = 'menubar=no,location=no,resizable=no,scrollbars=no,status=no';
        
        this.windowContentArea = window.open(url, 'Content | Live Broadcast Kit • CC UFFS', windowFeatures);
        this.windowContentArea.resizeTo(contentSize.width, contentSize.height);

        this.windowContentArea.onbeforeunload = function() {
            self.windowContentArea = null;
            self.setContentAreaAsExternalWindow(false);
        };
    };

    this.updateContentAreaPopup = function(url) {
        if(!this.isUsingContentAreaAsExternalWindow()) {
            return;
        }

        if(!this.windowContentArea) {
            this.popupContentArea(url);
        }

        this.windowContentArea.location = url;
    };

    this.updateContentAreaIframe = function(url) {
        var contentIframe = document.getElementById('content');
        contentIframe.src = url;
    };

    this.setContentAreaURL = function(url) {
        var params = this.getContentAreaURLParams();
        var finalUrl = this.makeFinalContentURL(url, params);

        console.log('Set content url:', finalUrl);
        this.contentAreaUrl = finalUrl;

        this.updateContentAreaIframe(finalUrl);
        this.updateContentAreaPopup(finalUrl);
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
    
    this.startRecording = async function() {
        var self = this;
        let gumStream, gdmStream;
        
        this.recordingData = [];
    
        try {
            gumStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
            gdmStream = await navigator.mediaDevices.getDisplayMedia({video: {displaySurface: "browser"}, audio: true});
    
        } catch (e) {
            console.error("capture failure", e);
            return
        }
    
        this.recorderStream = gumStream ? this.mixAudioStreams(gumStream, gdmStream) : gdmStream;
        this.recorder = new MediaRecorder(this.recorderStream, {mimeType: 'video/webm'});
    
        this.recorder.ondataavailable = e => {
            console.log('ondataavailable', e);
            if (e.data && e.data.size > 0) {
                self.recordingData.push(e.data);
                console.log('self.recordingData', self.recordingData);
            }
        };
    
        this.recorder.onStop = () => {
            self.recorderStream.getTracks().forEach(track => track.stop());
            gumStream.getTracks().forEach(track => track.stop());
            gdmStream.getTracks().forEach(track => track.stop());
    
        };
    
        this.recorderStream.addEventListener('inactive', () => {
            console.log('Capture stream inactive');
            self.stopRecording();
        });
    
        this.recorder.start();
        console.log("started recording");
    };
    
    this.stopRecording = function () {
        console.log("Stopping recording");
        this.recorder.stop();
    };
    
    this.pauseRecording = function() {
        if(this.recorder.state ==='paused'){
            this.recorder.resume();
        } else if (recorder.state === 'recording'){
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