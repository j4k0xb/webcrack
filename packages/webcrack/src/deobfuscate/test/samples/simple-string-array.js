const arr = ['log', 'Hello, World!'];
console[arr[0]](arr[1]);

// ignore mutable array
const arr2 = ['log', 'Hello, World!'];
arr2[0] = 'warn';
console[arr2[0]](arr2[1]);

const arr3 = ["requ", "m", "0x2649a392", "ire", "8", "v"];
const vm = eval(arr3[0] + arr3[3] + "(\"" + arr3[5] + "" + arr3[1] + "\")");
const v8 = eval(arr3[0] + arr3[3] + "(\"" + arr3[5] + "" + arr3[4] + "\")");

// ignore unreferenced array
const arr4 = ['log', 'Hello, World!'];