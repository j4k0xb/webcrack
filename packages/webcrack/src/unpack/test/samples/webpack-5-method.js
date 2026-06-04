// https://github.com/j4k0xb/webcrack/issues/221
// Most likely webpack generated an ObjectProperty with a FunctionExpression, and an obfuscator converted it to an ObjectMethod later.
(() => {
  var modules = {
    2(module, exports, require) {
      'use strict';
      const lib = require(3);
      console.log(lib);
    },
  };
  var installedModules = {};
  function __webpack_require__(moduleId) {
    var _0x1d30a7 = installedModules[moduleId];
    if (_0x1d30a7 !== undefined) {
      return _0x1d30a7.exports;
    }
    var module = (installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {},
    });
    modules[moduleId].call(
      module.exports,
      module,
      module.exports,
      __webpack_require__,
    );
    module.loaded = true;
    return module.exports;
  }
  __webpack_require__.c = installedModules;
  var entryModule = __webpack_require__((__webpack_require__.s = 2));
  module.exports = entryModule;
})();
