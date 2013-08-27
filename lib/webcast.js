(function() {
  var AudioContext, Webcast;

  Webcast = {
    Encoder: {}
  };

  Webcast.Encoder.Raw = (function() {

    function Raw(_arg) {
      this.channels = _arg.channels, this.samplerate = _arg.samplerate;
      this.mime = "audio/x-raw,format=S8,channels=" + this.channels + ",layout=interleaved,rate=" + this.samplerate;
      this.info = {
        audio: {
          channels: this.channels,
          samplerate: this.samplerate,
          encoder: "RAW u8 encoder"
        }
      };
    }

    Raw.prototype.toString = function() {
      return "(new Webcast.Encoder.Raw({\n  channels: " + this.channels + ", \n  samplerate: " + this.samplerate + "\n }))";
    };

    Raw.prototype.close = function(fn) {
      return fn(new Uint8Array);
    };

    Raw.prototype.encode = function(data, fn) {
      var buf, chan, channels, i, samples, _ref, _ref2;
      channels = data.length;
      samples = data[0].length;
      buf = new Int8Array(channels * samples);
      for (chan = 0, _ref = channels - 1; 0 <= _ref ? chan <= _ref : chan >= _ref; 0 <= _ref ? chan++ : chan--) {
        for (i = 0, _ref2 = samples - 1; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
          buf[channels * i + chan] = data[chan][i] * 127;
        }
      }
      return fn(buf);
    };

    return Raw;

  })();

  Webcast.Encoder.Mp3 = (function() {

    Mp3.prototype.mime = "audio/mpeg";

    function Mp3(_arg) {
      this.samplerate = _arg.samplerate, this.bitrate = _arg.bitrate, this.channels = _arg.channels;
      this.shine = new Shine({
        samplerate: this.samplerate,
        bitrate: this.bitrate,
        channels: this.channels,
        mode: this.channels === 1 ? Shine.MONO : Shine.JOINT_STEREO
      });
      this.info = {
        audio: {
          channels: this.channels,
          samplerate: this.samplerate,
          bitrate: this.bitrate,
          encoder: "libshine"
        }
      };
      this;
    }

    Mp3.prototype.toString = function() {
      return "(new Webcast.Encoder.Mp3({\n  bitrate: " + this.bitrate + ",\n  channels: " + this.channels + ",\n  samplerate: " + this.samplerate + "\n }))";
    };

    Mp3.prototype.close = function(fn) {
      return fn(this.shine.close());
    };

    Mp3.prototype.encode = function(data, fn) {
      data = data.slice(0, this.channels);
      return fn(this.shine.encode(data));
    };

    return Mp3;

  })();

  Webcast.Encoder.Resample = (function() {

    function Resample(_arg) {
      var i, _ref;
      this.encoder = _arg.encoder, this.samplerate = _arg.samplerate, this.type = _arg.type;
      this.mime = this.encoder.mime;
      this.info = this.encoder.info;
      this.channels = this.encoder.channels;
      this.ratio = parseFloat(this.encoder.samplerate) / parseFloat(this.samplerate);
      this.type = this.type || Samplerate.FASTEST;
      this.resamplers = [];
      this.remaining = [];
      for (i = 0, _ref = this.channels - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
        this.resamplers[i] = new Samplerate({
          type: this.type
        });
        this.remaining[i] = new Float32Array;
      }
    }

    Resample.prototype.toString = function() {
      return "(new Webcast.Encoder.Resample({\n  encoder: " + (this.encoder.toString()) + ",\n  samplerate: " + this.samplerate + ",\n  type: " + this.type + "\n }))";
    };

    Resample.prototype.close = function(fn) {
      var data, i, _ref;
      for (i = 0, _ref = this.remaining.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
        data = this.resamplers[i].process({
          data: this.remaining[i],
          ratio: this.ratio,
          last: true
        }).data;
      }
      return this.encoder.close(data, fn);
    };

    Resample.prototype.encode = function(buffer, fn) {
      var concat, data, i, used, _ref, _ref2;
      concat = function(a, b) {
        var ret;
        if (typeof b === "undefined") return a;
        ret = new Float32Array(a.length + b.length);
        ret.set(a);
        ret.subarray(a.length).set(b);
        return ret;
      };
      for (i = 0, _ref = buffer.length - 1; 0 <= _ref ? i <= _ref : i >= _ref; 0 <= _ref ? i++ : i--) {
        buffer[i] = concat(this.remaining[i], buffer[i]);
        _ref2 = this.resamplers[i].process({
          data: buffer[i],
          ratio: this.ratio
        }), data = _ref2.data, used = _ref2.used;
        this.remaining[i] = buffer[i].subarray(used);
        buffer[i] = data;
      }
      return this.encoder.encode(buffer, fn);
    };

    return Resample;

  })();

  Webcast.Encoder.Asynchronous = (function() {

    function Asynchronous(_arg) {
      var blob, script, scripts, _i, _len,
        _this = this;
      this.encoder = _arg.encoder, scripts = _arg.scripts;
      this.mime = this.encoder.mime;
      this.info = this.encoder.info;
      this.channels = this.encoder.channels;
      this.pending = [];
      this.scripts = [];
      for (_i = 0, _len = scripts.length; _i < _len; _i++) {
        script = scripts[_i];
        this.scripts.push("'" + script + "'");
      }
      script = "var window;\nimportScripts(" + (this.scripts.join()) + ");\nvar encoder = " + (this.encoder.toString()) + ";\nself.onmessage = function (e) {\n  var type = e.data.type;\n  var data = e.data.data;\n  if (type === \"buffer\") {\n    encoder.encode(data, function (encoded) {\n      postMessage(encoded);\n    });\n    return;\n  }\n  if (type === \"close\") {\n    encoder.close(function (buffer) {\n      postMessage({close:true, buffer:buffer});\n      self.close();\n    });\n    return;\n  }\n};";
      blob = new Blob([script], {
        type: "text/javascript"
      });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = function(_arg2) {
        var data;
        data = _arg2.data;
        return _this.pending.push(data);
      };
    }

    Asynchronous.prototype.toString = function() {
      return "(new Webcast.Encoder.Asynchronous({\n  encoder: " + (this.encoder.toString()) + ",\n  scripts: [" + (this.scripts.join()) + "]\n}))";
    };

    Asynchronous.prototype.close = function(fn) {
      var _this = this;
      this.worker.onmessage = function(_arg) {
        var chunk, data, len, offset, ret, _i, _j, _len, _len2, _ref, _ref2;
        data = _arg.data;
        if (!data.close) {
          _this.pending.push(data);
          return;
        }
        _this.pending.push(data.buffer);
        len = 0;
        _ref = _this.pending;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          chunk = _ref[_i];
          len += chunk.length;
        }
        ret = new Uint8Array(len);
        offset = 0;
        _ref2 = _this.pending;
        for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
          chunk = _ref2[_j];
          ret.set(chunk, offset);
          offset += chunk.length;
        }
        return fn(ret);
      };
      return this.worker.postMessage({
        type: "close"
      });
    };

    Asynchronous.prototype.encode = function(buffer, fn) {
      this.worker.postMessage({
        type: "buffer",
        data: buffer
      });
      return fn(this.pending.shift());
    };

    return Asynchronous;

  })();

  Webcast.Socket = function(_arg) {
    var hello, info, key, mime, send, socket, url, value;
    url = _arg.url, mime = _arg.mime, info = _arg.info;
    socket = new WebSocket(url, "webcast");
    socket.mime = mime;
    socket.info = info;
    hello = {
      mime: mime
    };
    for (key in info) {
      value = info[key];
      hello[key] = value;
    }
    send = socket.send;
    socket.send = null;
    socket.addEventListener("open", function() {
      return send.call(socket, JSON.stringify({
        type: "hello",
        data: hello
      }));
    });
    socket.sendData = function(data) {
      if (!socket.isOpen()) return;
      if (!(data && data.length > 0)) return;
      if (!(data instanceof ArrayBuffer)) {
        data = data.buffer.slice(data.byteOffset, data.length * data.BYTES_PER_ELEMENT);
      }
      return send.call(socket, data);
    };
    socket.sendMetadata = function(metadata) {
      if (!socket.isOpen()) return;
      return send.call(socket, JSON.stringify({
        type: "metadata",
        data: metadata
      }));
    };
    socket.isOpen = function() {
      return socket.readyState === WebSocket.OPEN;
    };
    return socket;
  };

  if (typeof window !== "undefined") {
    AudioContext = window.webkitAudioContext || window.AudioContext;
    AudioContext.prototype.createWebcastSource = function(bufferSize, channels, passThrough) {
      var node, options,
        _this = this;
      node = this.createScriptProcessor(bufferSize, channels, channels);
      passThrough || (passThrough = false);
      options = {
        encoder: null,
        socket: null,
        passThrough: passThrough || false
      };
      node.onaudioprocess = function(buf) {
        var audio, channel, channelData, _ref, _ref2;
        audio = [];
        for (channel = 0, _ref = buf.inputBuffer.numberOfChannels - 1; 0 <= _ref ? channel <= _ref : channel >= _ref; 0 <= _ref ? channel++ : channel--) {
          channelData = buf.inputBuffer.getChannelData(channel);
          audio[channel] = channelData;
          if (options.passThrough) {
            buf.outputBuffer.getChannelData(channel).set(channelData);
          }
        }
        return (_ref2 = options.encoder) != null ? _ref2.encode(audio, function(data) {
          var _ref3;
          if (data != null) {
            return (_ref3 = options.socket) != null ? _ref3.sendData(data) : void 0;
          }
        }) : void 0;
      };
      node.setPassThrough = function(b) {
        return options.passThrough = b;
      };
      node.connectSocket = function(encoder, url) {
        options.encoder = encoder;
        return options.socket = new Webcast.Socket({
          url: url,
          mime: options.encoder.mime,
          info: options.encoder.info
        });
      };
      node.close = function(cb) {
        return options.encoder.close(function(data) {
          var _ref, _ref2;
          if ((_ref = options.socket) != null) _ref.sendData(data);
          if ((_ref2 = options.socket) != null) _ref2.close();
          options.socket = options.encoder = null;
          return typeof cb === "function" ? cb() : void 0;
        });
      };
      node.sendMetadata = function(metadata) {
        var _ref;
        return (_ref = options.socket) != null ? _ref.sendMetadata(metadata) : void 0;
      };
      node.isOpen = function() {
        return options != null ? options.socket.isOpen() : void 0;
      };
      return node;
    };
    window.Webcast = Webcast;
  }

  if (typeof self !== "undefined") self.Webcast = Webcast;

}).call(this);
