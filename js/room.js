(function(root, $) {

  var defaults = {
    editor: {}
  };

  function Room(options) {
    this.options = options;
    this.position = {};
    this.watch = false;
    this.editor;

    this.prepare();
  }

  Room.prototype.prepare = function() {
    this.room = this.getRoom();
    this.fb = new Firebase(this.options.conn + this.room);

    this.sharedVideosEl = document.querySelector(this.options.sharedVideosEl);
    this.runBt = $(this.options.runBt);
    this.showCodeBt = $('.show-code');
    this.closeCodeBt = $('.closecode-bt');

    this.configEditor();
    this.aceInput = document.querySelector(this.options.editor.input);

    this.bind();

    this.countLog((this.watch) ? 'watch' : 'developer');

    if (!this.watch) {
      this.libManager = new LibrariesManager({
        form: '#external-libraries',
        editor: this.editor
      });
    }
  };

  Room.prototype.countLog = function(type) {
    var users = this.fb.child('users_' + type),
      // name = prompt('Your name/nickname?', 'An Amazing Coder') || (+new Date());
      name = (+new Date());

    var user = users.push({
      user: name
    });

    user.onDisconnect().remove();
  };

  Room.prototype.bind = function() {
    this.fb.on('value', this.fbUpdateValue.bind(this));
    this.fb.once('value', function(data) {
      var val = data.val(), usersLength = 0;
      if(val.users_developer) {
        for(var index in val.users_developer) {
          usersLength++;
        }
      }

      if(usersLength > this.options.usersLimit) {
        alert('You cant enter into this room, too many uers.');
        this.redirect();
      }
    }.bind(this));

    this.webRTC = this.getWebRTC();
    if(this.watch) {
      this.webRTC.joinRoom(this.room);
    } else {
      this.webRTC.on('readyToCall', this.onReadyToCall.bind(this));
    }
    this.webRTC.on('videoAdded', this.onVideoAdded.bind(this));
    this.webRTC.on('videoRemoved', this.onVideoRemoved.bind(this));

    this.aceInput.addEventListener('keyup', this.onAceKeyup.bind(this));

    this.runBt.on('click', this.updateIframe.bind(this));
    this.showCodeBt.on('click', this.showCode.bind(this));
    this.closeCodeBt.on('click', this.closeCode.bind(this));
  };

  Room.prototype.updateIframe = function() {
    if(document.querySelector('#run iframe')) {
      document.getElementById('run').removeChild(document.querySelector('#run iframe'));
    }
    var iframe, html;
    iframe = document.createElement('iframe');
    html = this.editor.getValue();

    iframe.id = 'run';
    iframe.src = 'data:text/html;charset=utf-8,' + encodeURI(html);

    document.getElementById('run').appendChild(iframe);
  };

  Room.prototype.onReadyToCall = function() {
    if(this.room) this.webRTC.joinRoom(this.room);
  };

  Room.prototype.showCode = function() {
    this.updateIframe();
    setTimeout(function() {
      $('body').addClass('is-showcode');
    }.bind(this), 100);
  };

  Room.prototype.closeCode = function() {
    $('body').removeClass('is-showcode');
  };

  Room.prototype.onVideoAdded = function(video, peer) {
    var videoContainer = document.createElement('div');
    videoContainer.classList.add('videos-video');
    videoContainer.id = 'video_' + this.webRTC.getDomId(peer);
    videoContainer.appendChild(video);

    this.sharedVideosEl.appendChild(videoContainer);
  };

  Room.prototype.onVideoRemoved = function(video, peer) {
    var videoToRemove = document.getElementById('video_' + this.webRTC.getDomId(peer));
    videoToRemove.parentNode.removeChild(videoToRemove);
  };

  Room.prototype.getWebRTC = function() {
    var configs = {};
    configs.localVideoEl = this.options.videoEl;
    if(this.watch) {
      configs.remotesVideos = 'remote-videos';
      $('#video-main').remove();
    }
    configs.autoRequestMedia = !this.watch;

    configs.detectSpeakingEvents = true;

    return new SimpleWebRTC(configs);
  };

  Room.prototype.fbUpdateValue = function(data) {
    var val = data.val(),
      usersLength = 0;

    if(!val.subject) {
      this.redirect();
    }

    if(val.password) {
      var password = prompt('This room requires password:', 'Insert the password here');
    }

    if(password != val.password) {
      alert('Sorry, wrong password, you\'ll be redirected to the Rooms list');
      this.redirect();
    }

    this.editor.setValue(val.code);
    this.editor.gotoLine(this.position.row + 1 || 1, this.position.column || 0);
  };

  Room.prototype.onAceKeyup = function() {
    this.position = this.editor.getCursorPosition();

    this.fb.update({
      code: this.editor.getValue()
    });
  };

  Room.prototype.configEditor = function() {
    var editor = ace.edit(this.options.editor.el);

    editor.setTheme(this.options.editor.theme);
    editor.session.setMode(this.options.editor.mode);
    editor.setOptions(this.options.editor.options);
    editor.$blockScrolling = this.options.editor.$blockScrolling;
    editor.setShowPrintMargin(false);
    if(this.watch) {
      editor.setReadOnly(true)
    }

    ed = editor;
    this.editor = editor;
  };

  Room.prototype.getRoom = function() {
    var room = location.search && location.search.split('?')[1],
      watch;

    watch = room.split('===watch');
    room = watch[0];

    this.watch = (watch[1] === '');

    if(!room) {
      this.redirect();
    }

    return room;
  };

  Room.prototype.redirect = function() {
    window.location = '/';
  };

  root.Room = Room;

} (window.App, jQuery));
