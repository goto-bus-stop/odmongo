module.exports = class MockCursor {
  constructor (results) {
    this.results = results
  }

  hasNext (cb) {
    cb(null, this.results.length > 0)
  }

  next (cb) {
    cb(null, this.results.shift() || null)
  }

  toArray (cb) {
    cb(null, this.results.slice())
  }
}
