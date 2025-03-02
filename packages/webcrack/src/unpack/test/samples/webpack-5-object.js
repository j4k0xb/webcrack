(() => {
  var modules = {
    2: (module, exports, require) => {
      "use strict";
      const lib = require(3);
      console.log(lib);
      const _0x8da276 = require(require.ab + "build/Release/spdlog.node");
    },
    3: module => {
      "use strict";

      module.exports = 'foo'
    }
  };
  var installedModules = {};
  function __webpack_require__(moduleId) {
    var _0x1d30a7 = installedModules[moduleId];
    if (_0x1d30a7 !== undefined) {
      return _0x1d30a7.exports;
    }
    var module = installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    module.loaded = true;
    return module.exports;
  }
  __webpack_require__.c = installedModules;
  __webpack_require__.n = module => {
    var getter = module && module.__esModule ? () => module.default : () => module;
    __webpack_require__.d(getter, {
      a: getter
    });
    return getter;
  };
  __webpack_require__.d = (exports, definition) => {
    for (var _0x43c485 in definition) {
      if (__webpack_require__.o(definition, _0x43c485) && !__webpack_require__.o(exports, _0x43c485)) {
        Object.defineProperty(exports, _0x43c485, {
          enumerable: true,
          get: definition[_0x43c485]
        });
      }
    }
  };
  __webpack_require__.o = (object, property) => Object.prototype.hasOwnProperty.call(object, property);
  __webpack_require__.r = exports => {
    if (typeof Symbol != "undefined" && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: "Module"
      });
    }
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
  };
  if (__webpack_require__ !== undefined) {
    __webpack_require__.ab = __dirname + "/native_modules/";
  }
  var entryModule = __webpack_require__(__webpack_require__.s = 2);
  module.exports = entryModule;
})();