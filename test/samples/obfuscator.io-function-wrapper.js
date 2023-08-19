(function (c, d) {
  var e = c();
  function i(c, d) {
      return b(c - 0xfe, d);
  }
  function h(c, d) {
      return b(d - 0x18, c);
  }
  while (!![]) {
      try {
          var f = -parseInt(h(0x1f2, 0x1ee)) / 0x1 * (-parseInt(h(0x1e3, 0x1e7)) / 0x2) + parseInt(h(0x1e7, 0x1e8)) / 0x3 * (parseInt(h(0x1ee, 0x1eb)) / 0x4) + parseInt(i(0x2d2, 0x2d5)) / 0x5 + parseInt(h(0x1ea, 0x1ea)) / 0x6 + parseInt(h(0x1e9, 0x1e6)) / 0x7 + -parseInt(h(0x1ee, 0x1ed)) / 0x8 + -parseInt(h(0x1ed, 0x1e9)) / 0x9;
          if (f === d)
              break;
          else
              e['push'](e['shift']());
      } catch (g) {
          e['push'](e['shift']());
      }
  }
}(a, 0xc71df));
function a() {
  var l = [
      '26lXZnwX',
      '7665TFaIau',
      '41173479smVmSq',
      '8671866UKJeoQ',
      '2248AbRzil',
      '4815390FpneTs',
      '8173520gTrJtD',
      '93523fumJGz',
      'log',
      'Hello\x20World!',
      '9464042oOXGKH'
  ];
  a = function () {
      return l;
  };
  return a();
}
function b(c, d) {
  var e = a();
  return b = function (f, g) {
      f = f - 0x1cc;
      var h = e[f];
      return h;
  }, b(c, d);
}
function hi() {
  console[j(0x175, 0x170)](j(0x176, 0x179));
  function k(c, d) {
      return b(d - -0x33, c);
  }
  console[j(0x175, 0x17a)](0x1e);
  function j(c, d) {
      return b(c - -0x57, d);
  }
  console[j(0x175, 0x172)](undefined);
  function notAWrapper(c, d) {
      return j(0x175, 0x172);
  }
  console[j(0x175, 0x172)](notAWrapper(foo(), bar()));
}
hi();