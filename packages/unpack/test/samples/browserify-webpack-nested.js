(function () {
  function r(e, n, t) {
    function o(i, f) {
      if (!n[i]) {
        if (!e[i]) {
          var c = 'function' == typeof require && require;
          if (!f && c) return c(i, !0);
          if (u) return u(i, !0);
          var a = new Error("Cannot find module '" + i + "'");
          throw ((a.code = 'MODULE_NOT_FOUND'), a);
        }
        var p = (n[i] = { exports: {} });
        e[i][0].call(
          p.exports,
          function (r) {
            var n = e[i][1][r];
            return o(n || r);
          },
          p,
          p.exports,
          r,
          e,
          n,
          t
        );
      }
      return n[i].exports;
    }
    for (
      var u = 'function' == typeof require && require, i = 0;
      i < t.length;
      i++
    )
      o(t[i]);
    return o;
  }
  return r;
})()(
  {
    1: [
      function (require, module, exports) {
        module.exports = 1;
        !(function (e) {
          var a = {};
          function n(t) {
            if (a[t]) return a[t].exports;
            var r = (a[t] = { i: t, l: !1, exports: {} });
            return e[t].call(r.exports, r, r.exports, n), (r.l = !0), r.exports;
          }
          (n.m = e),
            (n.c = a),
            (n.d = function (e, t, i) {
              n.o(e, t) ||
                Object.defineProperty(e, t, { enumerable: !0, get: i });
            }),
            (n.r = function (e) {
              'undefined' != typeof Symbol &&
                Symbol.toStringTag &&
                Object.defineProperty(e, Symbol.toStringTag, {
                  value: 'Module',
                }),
                Object.defineProperty(e, '__esModule', { value: !0 });
            }),
            (n.t = function (e, t) {
              if ((1 & t && (e = n(e)), 8 & t)) return e;
              if (4 & t && 'object' == typeof e && e && e.__esModule) return e;
              var i = Object.create(null);
              if (
                (n.r(i),
                Object.defineProperty(i, 'default', {
                  enumerable: !0,
                  value: e,
                }),
                2 & t && 'string' != typeof e)
              )
                for (var a in e)
                  n.d(
                    i,
                    a,
                    function (t) {
                      return e[t];
                    }.bind(null, a)
                  );
              return i;
            }),
            (n.n = function (e) {
              var t =
                e && e.__esModule
                  ? function () {
                      return e.default;
                    }
                  : function () {
                      return e;
                    };
              return n.d(t, 'a', t), t;
            }),
            (n.o = function (e, t) {
              return Object.prototype.hasOwnProperty.call(e, t);
            }),
            (n.p = ''),
            n((n.s = 2));
        })([
          ,
          function (e, t, i) {
            const a = i(3);
          },
          function (e, t, i) {
            const a = i(1);
            const module = 1;
            e.exports.color = '#FBC02D';
            {
              const module = 2;
              console.log(module);
              console.log(e);
            }
            t.a = 3;
          },
          function (e, t, i) {
            e.exports = 4;
          },
        ]);
      },
      {},
    ],
    2: [
      function (require, module, exports) {
        const vscode = require('vscode');
        const lib = require('./lib');
        console.log(lib);
      },
      { './lib': 1, vscode: undefined },
    ],
  },
  {},
  [2]
);
