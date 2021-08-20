import test from 'tape'
import { Builder } from '../src/Query.js'

test('QueryBuilder constructor', (t) => {
  t.ok(new Builder())
  t.deepEqual(new Builder().toJSON(), {})
  t.deepEqual(new Builder({ field: 'value' }).toJSON(), { field: 'value' })
  t.end()
})

test('QueryBuilder comparison operators', (t) => {
  t.deepEqual(new Builder().eq('field', 'value').toJSON(), { field: { $eq: 'value' } })
  t.deepEqual(new Builder().neq('field', 'value').toJSON(), { field: { $neq: 'value' } })
  t.deepEqual(new Builder().gt('field', 0).toJSON(), { field: { $gt: 0 } })
  t.deepEqual(new Builder().gte('field', 0).toJSON(), { field: { $gte: 0 } })
  t.deepEqual(new Builder().lt('field', 0).toJSON(), { field: { $lt: 0 } })
  t.deepEqual(new Builder().lte('field', 0).toJSON(), { field: { $lte: 0 } })
  t.end()
})

test('QueryBuilder combinators', (t) => {
  t.deepEqual(new Builder().and([
    { field: { $gt: 0 } },
    { field: { $lt: 10 } }
  ]).toJSON(), {
    $and: [
      { field: { $gt: 0 } },
      { field: { $lt: 10 } }
    ]
  })
  t.deepEqual(new Builder().and([
    new Builder().gt('field', 0),
    new Builder().lt('field', 10)
  ]).toJSON(), {
    $and: [
      { field: { $gt: 0 } },
      { field: { $lt: 10 } }
    ]
  })
  t.end()
})

// TODO
test('QueryBuilder stacked comparison operators', { skip: true }, (t) => {
  t.deepEqual(
    new Builder()
      .gt('field', 0)
      .lt('field', 10)
      .toJSON(),
    { field: { $gt: 0, $lt: 10 } })
  t.deepEqual(
    new Builder({ field: 'value' })
      .gt('field', 0)
      .lt('field', 10)
      .toJSON(),
    { field: { $eq: 'value', $gt: 0, $lt: 10 } })
  t.end()
})

test('QueryBuilder sorting options', (t) => {
  t.throws(() => new Builder().sort('field'))
  t.throws(() => new Builder().sort(null))

  t.deepEqual(
    new Builder()
      .sort({ field: 1 })
      .getOptions(),
    { sort: { field: 1 } })
  t.deepEqual(
    new Builder()
      .sort({ field: 1 })
      .sort({ secondField: -1 })
      .sort({ field: 0 })
      .getOptions(),
    { sort: { field: 0, secondField: -1 } })
  t.end()
})

test('QueryBuilder pagination options', (t) => {
  t.throws(() => new Builder().skip('not a number'))
  t.throws(() => new Builder().limit('not a number'))
  t.throws(() => new Builder().skip(-1))
  t.throws(() => new Builder().limit(-1))

  t.deepEqual(
    new Builder()
      .skip(1)
      .getOptions(),
    { skip: 1 })
  t.deepEqual(
    new Builder()
      .limit(10)
      .getOptions(),
    { limit: 10 })
  t.deepEqual(
    new Builder()
      .skip(100)
      .limit(10)
      .getOptions(),
    { skip: 100, limit: 10 })
  t.end()
})
