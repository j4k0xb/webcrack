const arr = ['log', 'Hello, World!'];
console[arr[0]](arr[1]);

// ignore mutable array
const arr2 = ['log', 'Hello, World!'];
arr2[0] = 'warn';
console[arr2[0]](arr2[1]);