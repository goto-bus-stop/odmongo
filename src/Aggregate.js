const { promisify } = require('util')

const kStages = Symbol('stages')
const kModel = Symbol('model')
const kCursor = Symbol('cursor')
const kNext = Symbol('get next result')

function toJSON () {
  return obj.toJSON ? obj.toJSON() : obj
}

module.exports = class AggregateBuilder {
  constructor (stages = []) {
    this[kStages] = stages
    this[kModel] = null
  }

  _model (model) {
    this[kModel] = model
    return this
  }

  push (stage) {
    this[kStages].push(stage)
    return this
  }

  count (fieldName) {
    return this.push({ $count: fieldName })
  }

  group (fields = {}) {
    if (!fields._id) throw new Error('odmongo.aggregate.group: must have an _id key')
    return this.push({ $group: fields })
  }

  limit (n) {
    if (typeof n !== 'number' || n < 0) throw new Error('odmongo.aggregate.limit: must be a positive integer')
    return this.push({ $limit: n })
  }

  match (query) {
    if (typeof query !== 'object') throw new Error('odmongo.aggregate.match: must be a query object')
    return this.push({ $match: toJSON(query) })
  }

  project (projection) {
    if (typeof projection !== 'object') throw new Error('odmongo.aggregate.project: must be an object')
    return this.push({ $project: projection })
  }

  skip (n) {
    if (typeof n !== 'number' || n < 0) throw new Error('odmongo.aggregate.skip: must be a positive integer')
    return this.push({ $skip: n })
  }

  sort (fields) {
    if (typeof fields !== 'object') throw new Error('odmongo.aggregate.sort: must be an object')
    return this.push({ $sort: fields })
  }

  unwind (spec) {
    if (typeof spec !== 'string' && typeof spec !== 'object') throw new Error('odmongo.aggregate.unwind: must be a string or an object')
    return this.push({ $unwind: spec })
  }

  toJSON () {
    return this[kStages]
  }

  execute (options = {}) {
    const pipeline = this.toJSON()
    const cursor = this[kModel].getCollection()
      .aggregate(pipeline, options)

    return new AggregateIterator(cursor)
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

class AggregateIterator {
  constructor (cursor) {
    this[kCursor] = cursor
    this[kNext] = promisify(cursor.next.bind(cursor))
  }

  // Async iteration
  async next () {
    const value = await this[kNext]()
    return { value, done: value === null }
  }
  [Symbol.asyncIterator] () {
    return this
  }

  // this is a promise i promise!!
  then (success, fail) {
    const cursor = this[kCursor]
    const toArray = promisify(cursor.toArray.bind(cursor))
    return toArray().then(success, fail)
  }
  catch (fail) {
    return this.then(null, fail)
  }
}
