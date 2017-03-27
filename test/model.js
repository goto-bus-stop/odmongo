const test = require('tape')
const Model = require('../src/Model')

test('uses the provided collection name', (t) => {
  t.plan(1)

  class TestModel extends Model {}
  TestModel.collection = 'test_collection'

  t.equal(TestModel.getCollection(), 'test_collection')
})

test('uses the model classname as the collection name', (t) => {
  t.plan(1)

  class TestModel extends Model {}

  t.equal(TestModel.getCollection(), 'test_model')
})
