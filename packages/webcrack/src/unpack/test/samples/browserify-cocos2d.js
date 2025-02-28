window.__require = (function t(e, n, i) {
  function r(a, o) {
    if (!n[a]) {
      if (!e[a]) {
        var l = a.split('/');
        l = l[l.length - 1];
        if (!e[l]) {
          var c = typeof __require == 'function' && __require;
          if (!o && c) {
            return c(l, true);
          }
          if (s) {
            return s(l, true);
          }
          throw new Error("Cannot find module '" + a + "'");
        }
      }
      var u = (n[a] = {
        exports: {},
      });
      e[a][0].call(
        u.exports,
        function (t) {
          return r(e[a][1][t] || t);
        },
        u,
        u.exports,
        t,
        e,
        n,
        i,
      );
    }
    return n[a].exports;
  }
  var s = typeof __require == 'function' && __require;
  for (var a = 0; a < i.length; a++) {
    r(i[a]);
  }
  return r;
})(
  {
    BattleHint: [function (t, e, n) {}, {}],
    GChangeCount: [function (t, e, n) {}, {}],
    'pako_deflate.min': [function (t, e, n) {}, {}],
  },
  {},
  ['BattleHint', 'GChangeCount'],
);
