(function() {
  var Webcast;

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

    Mp3.prototype.encode = function(data, fn) {
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
      script = "var window;\nimportScripts(" + (this.scripts.join()) + ");\nvar encoder = " + (this.encoder.toString()) + ";\nself.onmessage = function (e) {\n  var type = e.data.type;\n  var data = e.data.data;\n  if (type === \"buffer\") {\n    encoder.encode(data, function (encoded) {\n      postMessage(encoded);\n    });\n    return;\n  }\n};";
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

    Asynchronous.prototype.encode = function(buffer, fn) {
      var _ref;
      if ((_ref = this.worker) != null) {
        _ref.postMessage({
          type: "buffer",
          data: buffer
        });
      }
      return fn(this.pending.shift());
    };

    return Asynchronous;

  })();

  Webcast.Socket = (function() {

    function Socket(_arg) {
      var info, key, mime, uri, value,
        _this = this;
      uri = _arg.uri, mime = _arg.mime, info = _arg.info;
      this.socket = new WebSocket(uri, "webcast");
      this.hello = {
        mime: mime
      };
      for (key in info) {
        value = info[key];
        this.hello[key] = value;
      }
      this.socket.onopen = function() {
        return _this.socket.send(JSON.stringify({
          type: "hello",
          data: _this.hello
        }));
      };
      this;
    }

    Socket.prototype.sendData = function(data) {
      if (!this.isOpen()) return;
      if (!(data && data.length > 0)) return;
      if (!(data instanceof ArrayBuffer)) {
        data = data.buffer.slice(data.byteOffset, data.length * data.BYTES_PER_ELEMENT);
      }
      return this.socket.send(data);
    };

    Socket.prototype.sendMetadata = function(metadata) {
      if (!this.isOpen()) return;
      return this.socket.send(JSON.stringify({
        type: "metadata",
        data: metadata
      }));
    };

    Socket.prototype.isOpen = function() {
      return this.socket.readyState === WebSocket.OPEN;
    };

    Socket.prototype.close = function() {
      return this.socket.close();
    };

    Webcast.Node = function(_arg) {
      var context, key, node, options, uri, value,
        _this = this;
      uri = _arg.uri, this.encoder = _arg.encoder, context = _arg.context, options = _arg.options;
      this.socket = new Webcast.Socket({
        uri: uri,
        mime: this.encoder.mime,
        info: this.encoder.info
      });
      this.options = {
        passThrough: false,
        bufferSize: 4096
      };
      for (key in options) {
        value = options[key];
        this.options[key] = value;
      }
      node = context.createScriptProcessor(this.options.bufferSize, this.encoder.channels, this.encoder.channels);
      node.webcast = this;
      node.onaudioprocess = function(buf) {
        var audio, channel, channelData, _ref;
        audio = [];
        for (channel = 0, _ref = _this.encoder.channels - 1; 0 <= _ref ? channel <= _ref : channel >= _ref; 0 <= _ref ? channel++ : channel--) {
          channelData = buf.inputBuffer.getChannelData(channel);
          audio[channel] = channelData;
          if (_this.options.passThrough) {
            buf.outputBuffer.getChannelData(channel).set(channelData);
          }
        }
        return _this.encoder.encode(audio, function(data) {
          if (data != null) return _this.socket.sendData(data);
        });
      };
      node.close = function() {
        return _this.socket.close();
      };
      node.sendMetadata = function(metadata) {
        return _this.socket.sendMetadata(metadata);
      };
      return node;
    };

    return Socket;

  })();

  if (typeof window !== "undefined") window.Webcast = Webcast;

  if (typeof self !== "undefined") self.Webcast = Webcast;

}).call(this);
