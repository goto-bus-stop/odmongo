const path = require('path')
const pirates = require('pirates')
const asyncToGen = require('async-to-gen')
const buble = require('buble')

function transformAsync (code) {
  return asyncToGen(code).toString()
}

function transformBuble (code) {
  return buble.transform(code, {
    transforms: { generator: false }
  }).code
}

function shouldCompile (filename) {
  return filename.startsWith(__dirname) ||
    filename.startsWith(path.join(__dirname, '../src'))
}

pirates.addHook(
  (code) => transformBuble(transformAsync(code)),
  {
    exts: ['.js'],
    matcher: shouldCompile
  }
)
