function foo() {
  var k = {
      c: 0x2f2,
      d: '0x396',
      e: '0x397',
      f: '0x39a',
      g: '0x39d',
      h: 0x398,
      l: 0x394,
      m: '0x39b',
      n: '0x39f',
      o: 0x395,
      p: 0x395,
      q: 0x399,
      r: '0x399'
  };
  var c = i(k.d, k.e);
  var d = i(k.f, k.g);
  var e = i(k.h, k.l);
  var f = i(k.m, k.n);
  function i(c, d) {
      return b(c - k.c, d);
  }
  var g = i(k.o, k.p);
  var h = i(k.q, k.r);
}
function j(c, d) {
  var l = { c: 0x14b };
  return b(c - -l.c, d);
}
console[j(-'0xa6', -'0xa6')](foo());
function b(c, d) {
  var e = a();
  b = function (f, g) {
      f = f - 0xa3;
      var h = e[f];
      return h;
  };
  return b(c, d);
}
function a() {
  var m = [
      'string5',
      'string1',
      'log',
      'string3',
      'string6',
      'string2',
      'string4'
  ];
  a = function () {
      return m;
  };
  return a();
}