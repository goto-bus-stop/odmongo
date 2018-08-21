const { promisify } = require('util')

const kQuery = Symbol('query')
const kModel = Symbol('model')
const kCursor = Symbol('cursor')
const kNext = Symbol('get next result')
const kFields = Symbol('select fields')

const merge = Object.assign

function toJSON (obj) {
  return obj.toJSON ? obj.toJSON() : obj
}

function flatten (arr) {
  return arr.reduce((acc, item) => acc.concat(item), [])
}

module.exports = class QueryBuilder {
  constructor (query = {}) {
    this[kQuery] = query
  }

  _model (model) {
    this[kModel] = model
    return this
  }

  where (query) {
    merge(this[kQuery], query)
    return this
  }

  eq (field, val) {
    return this.where({ [field]: { $eq: val } })
  }
  neq (field, val) {
    return this.where({ [field]: { $neq: val } })
  }

  gt (field, val) {
    return this.where({ [field]: { $gt: val } })
  }
  gte (field, val) {
    return this.where({ [field]: { $gte: val } })
  }

  lt (field, val) {
    return this.where({ [field]: { $lt: val } })
  }
  lte (field, val) {
    return this.where({ [field]: { $lte: val } })
  }

  and (branches) {
    return this.where({ $and: branches.map(toJSON) })
  }

  or (branches) {
    return this.where({ $or: branches.map(toJSON) })
  }

  select (...fieldNames) {
    this[kFields] = flatten(fieldNames)
    return this
  }

  toJSON () {
    return this[kQuery]
  }

  execute (options = {}) {
    const query = this.toJSON()
    const cursor = this[kModel].getCollection()
      .find(query, options)

    return new QueryIterator(this[kModel], cursor)
  }

  // Async iteration
  // for await (var entry of aggregate)
  [Symbol.asyncIterator] () {
    return this.execute()
  }

  // Quack like a Promise
  then (success, fail) {
    return this.execute().then(success, fail)
  }
  catch (fail) {
    return this.execute().catch(fail)
  }
}

class QueryIterator {
  constructor (Model, cursor) {
    this[kModel] = Model
    this[kCursor] = cursor
    this[kNext] = promisify(cursor.next.bind(cursor))
  }

  unwrap () {
    return this[kCursor]
  }

  // Async iteration
  async next () {
    const value = await this[kNext]()
    return {
      value: value ? this[kModel].hydrate(value) : null,
      done: value === null
    }
  }
  [Symbol.asyncIterator] () {
    return this
  }

  // this is a promise i promise!!
  then (success, fail) {
    const cursor = this[kCursor]
    const toArray = promisify(cursor.toArray.bind(cursor))
    return toArray()
      .then((docs) => this[kModel].hydrateAll(docs))
      .then(success, fail)
  }
  catch (fail) {
    return this.then(null, fail)
  }
}
