(function() {
  var Webcast, origLame, origWorker;

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
      return "new Webcast.Encoder.Raw({\n  channels: " + this.channels + ", \n  samplerate: " + this.samplerate + "\n})";
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

  origLame = Lame;

  Webcast.Encoder.Lame = (function() {
    var origShine;

    Lame.prototype.mime = "audio/mpeg";

    function Lame(_arg) {
      this.samplerate = _arg.samplerate, this.bitrate = _arg.bitrate, this.channels = _arg.channels;
      this.lame = origLame.init();
      origLame.set_bitrate(this.lame, this.bitrate);
      if (this.channels === 1) {
        origLame.set_mode(this.lame, origLame.MONO);
      } else {
        origLame.set_mode(this.lame, origLame.JOINT_STEREO);
      }
      origLame.set_num_channels(this.lame, this.channels);
      origLame.set_out_samplerate(this.lame, this.samplerate);
      origLame.init_params(this.lame);
      this.info = {
        audio: {
          channels: this.channels,
          samplerate: this.samplerate,
          bitrate: this.bitrate,
          encoder: "libmp3lame"
        }
      };
      this;
    }

    Lame.prototype.toString = function() {
      return "new Webcast.Encoder.Lame({\n  bitrate: " + this.bitrate + ",\n  channels: " + this.channels + ",\n  samplerate: " + this.samplerate + "\n})";
    };

    Lame.prototype.encode = function(data, fn) {
      var chan_l, chan_r;
      chan_l = data[0];
      chan_r = data[1] || data[0];
      return fn(origLame.encode_buffer_ieee_float(this.lame, chan_l, chan_r).data);
    };

    origShine = Shine;

    return Lame;

  })();

  Webcast.Encoder.Shine = (function() {

    Shine.prototype.mime = "audio/mpeg";

    function Shine(_arg) {
      this.samplerate = _arg.samplerate, this.bitrate = _arg.bitrate, this.channels = _arg.channels;
      this.shine = new origShine({
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

    Shine.prototype.toString = function() {
      return "new Webcast.Encoder.Shine({\n  bitrate: " + this.bitrate + ",\n  channels: " + this.channels + ",\n  samplerate: " + this.samplerate + "\n})";
    };

    Shine.prototype.encode = function(data, fn) {
      return fn(this.shine.encode(data));
    };

    return Shine;

  })();

  if (typeof Worker !== "undefined") origWorker = Worker;

  Webcast.Encoder.Worker = (function() {

    function Worker(_arg) {
      var blob, imported, script, _i, _len, _ref,
        _this = this;
      this.encoder = _arg.encoder, this.scripts = _arg.scripts;
      this.mime = this.encoder.mime;
      this.info = this.encoder.info;
      this.channels = this.encoder.channels;
      this.pending = [];
      imported = [];
      _ref = this.scripts;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        script = _ref[_i];
        imported.push("'" + script + "'");
      }
      script = "var window;\nimportScripts(" + (imported.join()) + ");\nvar encoder = " + (this.encoder.toString()) + ";\nself.onmessage = function (e) {\n  var type = e.data.type;\n  var data = e.data.data;\n  if (type === \"buffer\") {\n    encoder.encode(data, function (encoded) {\n      postMessage(encoded);\n    });\n    return;\n  }\n};";
      blob = new Blob([script], {
        type: "text/javascript"
      });
      this.worker = new origWorker(URL.createObjectURL(blob));
      this.worker.onmessage = function(_arg2) {
        var data;
        data = _arg2.data;
        return _this.pending.push(data);
      };
    }

    Worker.prototype.encode = function(buffer, fn) {
      var _ref;
      if ((_ref = this.worker) != null) {
        _ref.postMessage({
          type: "buffer",
          data: buffer
        });
      }
      return fn(this.pending.shift());
    };

    return Worker;

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
      if (!(data.length > 0)) return;
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
