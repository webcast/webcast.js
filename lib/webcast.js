(function() {
  var origLame, origShine;

  window.Webcast = {
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

    Raw.prototype.encode = function(data) {
      var buf, chan, channels, i, samples, _ref, _ref2;
      channels = data.length;
      samples = data[0].length;
      buf = new Int8Array(channels * samples);
      for (chan = 0, _ref = channels - 1; 0 <= _ref ? chan <= _ref : chan >= _ref; 0 <= _ref ? chan++ : chan--) {
        for (i = 0, _ref2 = samples - 1; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
          buf[channels * i + chan] = data[chan][i] * 127;
        }
      }
      return buf;
    };

    return Raw;

  })();

  origLame = Lame;

  Webcast.Encoder.Lame = (function() {

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

    Lame.prototype.encode = function(data) {
      var chan_l, chan_r;
      chan_l = data[0];
      chan_r = data[1] || data[0];
      return origLame.encode_buffer_ieee_float(this.lame, chan_l, chan_r).data;
    };

    return Lame;

  })();

  origShine = Shine;

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

    Shine.prototype.encode = function(data) {
      return this.shine.encode(data);
    };

    return Shine;

  })();

  Webcast.Socket = (function() {

    function Socket(_arg) {
      var data, key, value, _ref,
        _this = this;
      this.uri = _arg.uri, this.encoder = _arg.encoder;
      this.socket = new WebSocket(this.uri, "webcast");
      data = {
        mime: this.encoder.mime
      };
      _ref = this.encoder.info;
      for (key in _ref) {
        value = _ref[key];
        data[key] = value;
      }
      this.socket.onopen = function() {
        return _this.socket.send(JSON.stringify({
          type: "hello",
          data: data
        }));
      };
      this;
    }

    Socket.prototype.sendData = function(data) {
      if (!(data.length > 0)) return;
      if (!(data instanceof ArrayBuffer)) {
        data = data.buffer.slice(data.byteOffset, data.length * data.BYTES_PER_ELEMENT);
      }
      return this.socket.send(data);
    };

    Socket.prototype.sendMetadata = function(metadata) {
      return this.socket.send(JSON.stringify({
        type: "metadata",
        data: metadata
      }));
    };

    Socket.prototype.close = function() {
      return this.socket.close();
    };

    return Socket;

  })();

  Webcast.Node = (function() {

    function Node(_arg) {
      var _this = this;
      this.uri = _arg.uri, this.encoder = _arg.encoder, this.context = _arg.context, this.source = _arg.source;
      this.socket = new Webcast.Socket({
        uri: this.uri,
        encoder: this.encoder
      });
      this.buflen = 4096;
      this.node = this.context.createScriptProcessor(this.buflen, this.encoder.channels, 2);
      this.node.onaudioprocess = function(buf) {
        var audio, channel, data, _ref;
        audio = [];
        for (channel = 0, _ref = _this.encoder.channels - 1; 0 <= _ref ? channel <= _ref : channel >= _ref; 0 <= _ref ? channel++ : channel--) {
          audio[channel] = buf.inputBuffer.getChannelData(channel);
        }
        data = _this.encoder.encode(audio);
        return _this.socket.sendData(data);
      };
      this.source.connect(this.node);
      this.node.connect(this.context.destination);
      this.numberOfInputs = this.node.numberOfInputs;
      this.numberOfOutputs = this.node.numberOfOutputs;
      this.channelCount = this.node.channelCount;
      this.channelCountMode = this.node.channelCountMode;
      this.channelInterpretation = this.node.channelInterpretation;
    }

    Node.prototype.connect = function() {
      this.node.connect.apply(this.node, arguments);
      return this.numberOfOutputs = this.node.numberOfOutputs;
    };

    Node.prototype.disconnect = function() {
      this.node.disconnect.apply(this.node, arguments);
      return this.numberOfOutputs = this.node.numberOfOutputs;
    };

    Node.prototype.close = function() {
      this.disconnect();
      this.source.disconnect();
      return this.socket.close();
    };

    Node.prototype.sendMetadata = function(metadata) {
      return this.socket.sendMetadata(metadata);
    };

    return Node;

  })();

}).call(this);
