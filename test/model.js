const test = require('tape')
const Connection = require('../src/Connection')
const Model = require('../src/Model')

const fakeClient = {
  connect () {}
}

test('Model.connection', (t) => {
  t.plan(5)

  class TestModel extends Model {}
  t.throws(() => { TestModel.connection = 1234 }, 'cannot assign non-Connections')
  t.throws(() => { TestModel.connection }, 'cannot get the connection instance if it is not configured')

  TestModel.connection = new Connection({ client: fakeClient })
  t.ok(TestModel.connection instanceof Connection, 'uses the provided connection')

  class SubModel extends TestModel {}
  t.equal(SubModel.connection, TestModel.connection, 'connection is inherited')

  SubModel.connection = new Connection({ client: fakeClient })
  t.notEqual(SubModel.connection, TestModel.connection, 'setting connection on subclass does not affect superclass')
})

test('Model.collection', (t) => {
  t.plan(6)

  class TestModel extends Model {}
  t.throws(() => { TestModel.collection = 1234 }, 'cannot assign non-string values')
  t.throws(() => { TestModel.collection }, 'cannot get the collection name if it is not configured')

  TestModel.collection = 'test_collection'
  t.equal(TestModel.collection, 'test_collection', 'uses the provided collection name')

  class SubModel extends TestModel {}
  t.throws(() => { SubModel.collection }, 'collection name is not inherited')

  SubModel.collection = 'sub_collection'
  t.equal(SubModel.collection, 'sub_collection', 'uses the provided collection name')
  t.equal(TestModel.collection, 'test_collection', 'setting collection on subclass does not affect superclass')
})
