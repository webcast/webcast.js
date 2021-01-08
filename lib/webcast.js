"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Socket {
  constructor(_ref) {
    let mediaRecorder = _ref.mediaRecorder,
        rawUrl = _ref.url,
        info = _ref.info;
    const parser = document.createElement("a");
    parser.href = rawUrl;
    const user = parser.username;
    const password = parser.password;
    parser.username = parser.password = "";
    const url = parser.href;
    this.socket = new WebSocket(url, "webcast");

    const hello = _objectSpread(_objectSpread(_objectSpread({
      mimeType: mediaRecorder.mimeType
    }, user ? {
      user
    } : {}), password ? {
      password
    } : {}), info);

    this.socket.addEventListener("open", () => this.socket.send(JSON.stringify({
      type: "hello",
      data: hello
    })));

    mediaRecorder.ondataavailable = e => {
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) switch (_context.prev = _context.next) {
          case 0:
            _context.t0 = this.socket;
            _context.next = 3;
            return regeneratorRuntime.awrap(e.data.arrayBuffer());

          case 3:
            _context.t1 = _context.sent;
            return _context.abrupt("return", _context.t0.send.call(_context.t0, _context.t1));

          case 5:
          case "end":
            return _context.stop();
        }
      }, null, this, null, Promise);
    };

    mediaRecorder.onstop = e => {
      return regeneratorRuntime.async(function _callee2$(_context2) {
        while (1) switch (_context2.prev = _context2.next) {
          case 0:
            _context2.t0 = this.socket;
            _context2.next = 3;
            return regeneratorRuntime.awrap(e.data.arrayBuffer());

          case 3:
            _context2.t1 = _context2.sent;

            _context2.t0.send.call(_context2.t0, _context2.t1);

            this.socket.close();

          case 6:
          case "end":
            return _context2.stop();
        }
      }, null, this, null, Promise);
    };
  }

  sendMetadata(data) {
    this.socket.send(JSON.stringify({
      type: "metadata",
      data
    }));
  }

}

;
window.Webcast = {
  version: '1.0.0',
  Socket
};