const test = require('tape')
const Query = require('../src/Query.js')

test('QueryBuilder constructor', (t) => {
  t.ok(new Query.Builder())
  t.deepEqual(new Query.Builder().toJSON(), {})
  t.deepEqual(new Query.Builder({ field: 'value' }).toJSON(), { field: 'value' })
  t.end()
})

test('QueryBuilder comparison operators', (t) => {
  t.deepEqual(new Query.Builder().eq('field', 'value').toJSON(), { field: { $eq: 'value' } })
  t.deepEqual(new Query.Builder().neq('field', 'value').toJSON(), { field: { $neq: 'value' } })
  t.deepEqual(new Query.Builder().gt('field', 0).toJSON(), { field: { $gt: 0 } })
  t.deepEqual(new Query.Builder().gte('field', 0).toJSON(), { field: { $gte: 0 } })
  t.deepEqual(new Query.Builder().lt('field', 0).toJSON(), { field: { $lt: 0 } })
  t.deepEqual(new Query.Builder().lte('field', 0).toJSON(), { field: { $lte: 0 } })
  t.end()
})

test('QueryBuilder combinators', (t) => {
  t.deepEqual(new Query.Builder().and([
    { field: { $gt: 0 } },
    { field: { $lt: 10 } }
  ]).toJSON(), {
    $and: [
      { field: { $gt: 0 } },
      { field: { $lt: 10 } }
    ]
  })
  t.deepEqual(new Query.Builder().and([
    new Query.Builder().gt('field', 0),
    new Query.Builder().lt('field', 10)
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
    new Query.Builder()
      .gt('field', 0)
      .lt('field', 10)
      .toJSON(),
    { field: { $gt: 0, $lt: 10 } })
  t.deepEqual(
    new Query.Builder({ field: 'value' })
      .gt('field', 0)
      .lt('field', 10)
      .toJSON(),
    { field: { $eq: 'value', $gt: 0, $lt: 10 } })
  t.end()
})
