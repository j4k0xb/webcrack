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
      n.o(e, t) || Object.defineProperty(e, t, { enumerable: !0, get: i });
    }),
    (n.r = function (e) {
      'undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 });
    }),
    (n.t = function (e, t) {
      if ((1 & t && (e = n(e)), 8 & t)) return e;
      if (4 & t && 'object' == typeof e && e && e.__esModule) return e;
      var i = Object.create(null);
      if (
        (n.r(i),
        Object.defineProperty(i, 'default', { enumerable: !0, value: e }),
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
    n((n.s = 0));
})([
  function (e, t, i) {
    const a = i(1);
    const b = i(2);
    const c = i(3);
    const bDefault = i.n(b);
    const cDefault = i.n(c);
    const dDefault = i.n(b).a;
    const eDefault = i.n(c)();
    console.log(a.counter);
    console.log(bDefault().VERSION);
    console.log(cDefault.a.VERSION);
  },
  function (e, t, i) {
    e = require.hmd(e);
    i.r(t);
    i.d(t, 'counter', function () {
      return f;
    });
    class f {}
    let counter = 1;
    f = 2;
  },
  function(e, t, i) {
    const x = {};
    i.r(x);
    i.d(x, 'default', function () {
      return y;
    });
    let y = 1;
  },
  function(e, t, i) {
    e.exports = {
      VERSION: 1
    }
  },
  function (e, t, i) {
    i.r(t);
    i.d(t, 'default', function () {
      return f;
    });
    class f {}
  },
]);
