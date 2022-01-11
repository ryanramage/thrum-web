// https://github.com/mafintosh/cyclist/blob/master/index.js

const twoify = function (n) {
  if (n && !(n & (n - 1))) return n
  let p = 1
  while (p < n) p <<= 1
  return p
}

const Cyclist = function (size) {
  if (!(this instanceof Cyclist)) return new Cyclist(size)
  size = twoify(size)
  this.mask = size - 1
  this.size = size
  this.values = new Array(size)
}

Cyclist.prototype.put = function (index, val) {
  let pos = index & this.mask
  this.values[pos] = val
  return pos
}

Cyclist.prototype.get = function (index) {
  return this.values[index & this.mask]
}

Cyclist.prototype.del = function (index) {
  let pos = index & this.mask
  let val = this.values[pos]
  this.values[pos] = undefined
  return val
}

export { Cyclist }
