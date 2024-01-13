// https://github.com/webpack/webpack/tree/e518d0da94639476354f028cdf032de4be6813a0/examples/commonjs
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!**********************!*\
  !*** ./increment.js ***!
  \**********************/
/*! default exports */
/*! export increment [provided] [no usage info] [missing usage info prevents renaming] */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements: __webpack_require__, __webpack_exports__ */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

  const add = (__webpack_require__(/*! ./math */ 2).add);
  exports.increment = function(val) {
      return add(val, 1);
  };
  
  
  /***/ }),
  /* 2 */
  /*!*****************!*\
    !*** ./math.js ***!
    \*****************/
  /*! default exports */
  /*! export add [provided] [no usage info] [missing usage info prevents renaming] */
  /*! other exports [not provided] [no usage info] */
  /*! runtime requirements: __webpack_exports__ */
  /***/ ((__unused_webpack_module, exports) => {
  
  exports.add = function() {
      var sum = 0, i = 0, args = arguments, l = args.length;
      while (i < l) {
          sum += args[i++];
      }
      return sum;
  };
  
  /***/ })
  /******/ 	]);
  /************************************************************************/
  /******/ 	// The module cache
  /******/ 	var __webpack_module_cache__ = {};
  /******/ 	
  /******/ 	// The require function
  /******/ 	function __webpack_require__(moduleId) {
  /******/ 		// Check if module is in cache
  /******/ 		var cachedModule = __webpack_module_cache__[moduleId];
  /******/ 		if (cachedModule !== undefined) {
  /******/ 			return cachedModule.exports;
  /******/ 		}
  /******/ 		// Create a new module (and put it into the cache)
  /******/ 		var module = __webpack_module_cache__[moduleId] = {
  /******/ 			// no module.id needed
  /******/ 			// no module.loaded needed
  /******/ 			exports: {}
  /******/ 		};
  /******/ 	
  /******/ 		// Execute the module function
  /******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  /******/ 	
  /******/ 		// Return the exports of the module
  /******/ 		return module.exports;
  /******/ 	}
  /******/ 	
  /************************************************************************/
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
  (() => {
  /*!********************!*\
    !*** ./example.js ***!
    \********************/
  /*! unknown exports (runtime-defined) */
  /*! runtime requirements: __webpack_require__ */
  const inc = (__webpack_require__(/*! ./increment */ 1).increment);
  const a = 1;
  inc(a); // 2
  
  })();
  
  /******/ })()
  ;