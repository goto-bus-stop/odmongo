import { promisify } from 'util'
import { Builder as QueryBuilder } from './Query.js'

const kStages = Symbol('stages')
const kModel = Symbol('model')
const kCursor = Symbol('cursor')
const kNext = Symbol('get next result')
const kModelMarker = Symbol.for('odmongo.model')

const kAsyncIterator = Symbol.asyncIterator

function toJSON (obj) {
  return obj.toJSON ? obj.toJSON() : obj
}

function toCollectionName (obj) {
  if (typeof obj === 'string') {
    return obj
  }
  if (typeof obj === 'function' && obj[kModelMarker]) {
    return obj.collection
  }
  return null
}

class AggregateBuilder {
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

  addFields (spec) {
    if (typeof spec !== 'object') throw new TypeError('odmongo.aggregate.addFields: must be an object')
    return this.push({ $addFields: spec })
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
    if (typeof query === 'function') {
      query = query(new QueryBuilder())
    }
    if (typeof query !== 'object') throw new TypeError('odmongo.aggregate.match: must be a query object')
    return this.push({ $match: toJSON(query) })
  }

  project (projection) {
    if (typeof projection !== 'object') throw new TypeError('odmongo.aggregate.project: must be an object')
    return this.push({ $project: projection })
  }

  skip (n) {
    if (typeof n !== 'number' || n < 0) throw new Error('odmongo.aggregate.skip: must be a positive integer')
    return this.push({ $skip: n })
  }

  sort (fields) {
    if (typeof fields !== 'object') throw new TypeError('odmongo.aggregate.sort: must be an object')
    return this.push({ $sort: fields })
  }

  unwind (spec) {
    if (typeof spec !== 'string' && typeof spec !== 'object') throw new TypeError('odmongo.aggregate.unwind: must be a string or an object')
    return this.push({ $unwind: spec })
  }

  lookup (spec) {
    if (typeof spec !== 'object') throw new TypeError('odmongo.aggregate.lookup: must be an object')
    const from = toCollectionName(spec.from)

    if (spec.localField) {
      const { localField, foreignField, as } = spec
      return this.push({
        $lookup: { from, localField, foreignField, as }
      })
    } else {
      return this.push({
        $lookup: {
          from,
          let: spec.let,
          pipeline: spec.pipeline instanceof AggregateBuilder ? spec.pipeline.toJSON() : spec.pipeline,
          as: spec.as
        }
      })
    }
  }

  facet (spec) {
    if (typeof spec !== 'object') throw new TypeError('odmongo.aggregate.facet: must be an object')

    const facets = {}
    for (const [outputName, pipeline] of Object.entries(spec)) {
      // this is mostly for typescript, so that we can inject the 'base' type, which is technically a lie!
      if (typeof pipeline === 'function') {
        const newPipeline = pipeline(new AggregateBuilder()._model(this[kModel]))
        if (!(newPipeline instanceof AggregateBuilder)) {
          throw new TypeError('odmongo.aggregate.facet: must return an AggregateBuilder from function facet `' + outputName + '`')
        }
        facets[outputName] = newPipeline.toJSON()
      } else if (pipeline instanceof AggregateBuilder) {
        facets[outputName] = pipeline.toJSON()
      } else if (Array.isArray(pipeline)) {
        facets[outputName] = pipeline
      } else {
        throw new TypeError('odmongo.aggregate.facet: the `' + outputName + '` pipeline must be an array or an AggregateBuilder, got ' + typeof pipeline)
      }
    }

    return this.push({ $facet: facets })
  }

  unionWith (spec) {
    if (spec == null) throw new TypeError('odmongo.aggregate.unionWith: must be a string or an object')

    // pipeline.unionWith(OtherModel.aggregate())
    if (spec instanceof AggregateBuilder) {
      if (spec[kModel] == null) throw new TypeError('odmongo.aggregate.unionWith: when passing an AggregateBuilder, it must have an associated model')

      return this.push({
        $unionWith: {
          coll: spec[kModel].collection,
          pipeline: spec.toJSON()
        }
      })
    }

    // pipeline.unionWith(OtherModel)
    if (spec[kModelMarker]) {
      spec = spec.collection
    }

    // pipeline.unionWith('other_models')
    if (typeof spec === 'string') {
      return this.push({ $unionWith: spec })
    }

    if (typeof spec === 'object') {
      const coll = toCollectionName(spec.coll)
      if (!coll) throw new TypeError('odmongo.aggregate.unionWith: collection name must be a string')
      const $unionWith = { coll }

      // TODO handle function pipeline
      if (spec.pipeline instanceof AggregateBuilder) {
        $unionWith.pipeline = spec.pipeline.toJSON()
      } else if (Array.isArray(spec.pipeline)) {
        $unionWith.pipeline = spec.pipeline
      } else {
        throw new TypeError('odmongo.aggregate.unionWith: pipeline must be an array or a builder')
      }

      return this.push({ $unionWith })
    }

    throw new TypeError('odmongo.aggregate.unionWith: must be a string or an object')
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
  [kAsyncIterator] () {
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

  unwrap () {
    return this[kCursor]
  }

  // Async iteration
  async next () {
    const value = await this[kNext]()
    return { value, done: value === null }
  }

  [kAsyncIterator] () {
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

export default AggregateBuilder
