(() => {
  var deferred;
  var startup;
  var __webpack_modules__ = {
    97418: module => {
      module.exports = 'foo';
    }
  };
  var __webpack_module_cache__ = {};
  function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }
    var module = __webpack_module_cache__[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };
    __webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    module.loaded = true;
    return module.exports;
  }
  __webpack_require__.m = __webpack_modules__;
  __webpack_require__.x = () => {
    var __webpack_exports__ = __webpack_require__.O(undefined, [736, 885], () => __webpack_require__(36093));
    return __webpack_exports__ = __webpack_require__.O(__webpack_exports__);
  };
  deferred = [];
  __webpack_require__.O = (result, chunkIds, fn, priority) => {
    if (!chunkIds) {
      var notFulfilled = Infinity;
      for (i = 0; i < deferred.length; i++) {
        for (var [chunkIds, fn, priority] = deferred[i], fulfilled = true, j = 0; j < chunkIds.length; j++) {
          if ((priority & false || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every(key => __webpack_require__.O[key](chunkIds[j]))) {
            chunkIds.splice(j--, 1);
          } else {
            fulfilled = false;
            if (priority < notFulfilled) {
              notFulfilled = priority;
            }
          }
        }
        if (fulfilled) {
          deferred.splice(i--, 1);
          var r = fn();
          if (r !== undefined) {
            result = r;
          }
        }
      }
      return result;
    }
    priority = priority || 0;
    for (var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) {
      deferred[i] = deferred[i - 1];
    }
    deferred[i] = [chunkIds, fn, priority];
  };
  __webpack_require__.n = module => {
    var getter = module && module.__esModule ? () => module.default : () => module;
    __webpack_require__.d(getter, {
      a: getter
    });
    return getter;
  };
  __webpack_require__.d = (exports, definition) => {
    for (var key in definition) {
      if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key]
        });
      }
    }
  };
  __webpack_require__.f = {};
  __webpack_require__.e = chunkId => Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
    __webpack_require__.f[key](chunkId, promises);
    return promises;
  }, []));
  __webpack_require__.u = chunkId => ({
    '736': 'vendor',
    '885': 'pyright'
  })[chunkId] + '.bundle.js';
  __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  __webpack_require__.r = exports => {
    if (typeof Symbol != 'undefined' && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: 'Module'
      });
    }
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
  };
  __webpack_require__.nmd = module => {
    module.paths = [];
    if (!module.children) {
      module.children = [];
    }
    return module;
  };
  __webpack_require__.j = 377;
  (() => {
    var installedChunks = {
      '377': 1
    };
    __webpack_require__.O.require = chunkId => installedChunks[chunkId];
    __webpack_require__.f.require = (chunkId, promises) => {
      if (!installedChunks[chunkId]) {
        (chunk => {
          var moreModules = chunk.modules;
          var chunkIds = chunk.ids;
          var runtime = chunk.runtime;
          for (var moduleId in moreModules) {
            if (__webpack_require__.o(moreModules, moduleId)) {
              __webpack_require__.m[moduleId] = moreModules[moduleId];
            }
          }
          if (runtime) {
            runtime(__webpack_require__);
          }
          for (var i = 0; i < chunkIds.length; i++) {
            installedChunks[chunkIds[i]] = 1;
          }
          __webpack_require__.O();
        })(require(`./${__webpack_require__.u(chunkId)}`));
      }
    };
  })();
  startup = __webpack_require__.x;
  __webpack_require__.x = () => {
    __webpack_require__.e(736);
    __webpack_require__.e(885);
    return startup();
  };
  var __webpack_exports__ = __webpack_require__.x();
  module.exports = __webpack_exports__;
})();