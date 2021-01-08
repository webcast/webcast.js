"use strict";

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

window.Webcast = {
  version: '1.0.0',
  sendMedia: function sendMedia(_ref) {
    var mediaRecorder = _ref.mediaRecorder,
        rawUrl = _ref.url,
        info = _ref.info;
    var parser = document.createElement("a");
    parser.href = rawUurl;
    var user = parser.username;
    var password = parser.password;
    parser.username = parser.password = "";
    var url = parser.href;
    var socket = new WebSocket(url, "webcast");
    socket.mime = mime;
    socket.info = info;

    var hello = _objectSpread(_objectSpread(_objectSpread({
      mimeType: mediaRecorder.mimeType
    }, user ? {
      user: user
    } : {}), password ? {
      password: password
    } : {}), info);

    socket.addEventListener("open", function () {
      return socket.send(JSON.stringify({
        type: "hello",
        data: hello
      }));
    });

    mediaRecorder.ondataavailable = /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(e) {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.t0 = socket;
                _context.next = 3;
                return e.data.arrayBuffer();

              case 3:
                _context.t1 = _context.sent;
                return _context.abrupt("return", _context.t0.send.call(_context.t0, _context.t1));

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function (_x) {
        return _ref2.apply(this, arguments);
      };
    }();

    mediaRecorder.onstop = /*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(e) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.t0 = socket;
                _context2.next = 3;
                return e.data.arrayBuffer();

              case 3:
                _context2.t1 = _context2.sent;

                _context2.t0.send.call(_context2.t0, _context2.t1);

                socket.close();

              case 6:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    }();
  }
};