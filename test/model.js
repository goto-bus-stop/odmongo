const test = require('tape')
const Connection = require('../src/Connection.js')
const Model = require('../src/Model.js')
const MockClient = require('./mocks/Client.js')
const MockCursor = require('./mocks/Cursor.js')

const fakeClient = {
  connect () {}
}

test('Model.connection', (t) => {
  t.plan(5)

  class TestModel extends Model {}
  t.throws(() => { TestModel.connection = 1234 }, 'cannot assign non-Connections')
  t.throws(() => { TestModel.connection }, 'cannot get the connection instance if it is not configured')

  TestModel.connection = new Connection({ clientFactory: fakeClient })
  t.ok(TestModel.connection instanceof Connection, 'uses the provided connection')

  class SubModel extends TestModel {}
  t.equal(SubModel.connection, TestModel.connection, 'connection is inherited')

  SubModel.connection = new Connection({ clientFactory: fakeClient })
  t.notEqual(SubModel.connection, TestModel.connection, 'setting connection on subclass does not affect superclass')
})

test('Model.collection', (t) => {
  t.plan(7)

  t.throws(() => { Model.collection = 'test_collection' }, 'cannot assign a collection to the Model base class')

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

test('Model.find', async (t) => {
  t.plan(4)

  const client = new MockClient({
    test_collection: [
      { _id: 1, name: 'hello' }
    ]
  })
  const connection = new Connection({ client })
  await connection.connect('mongodb://test/db')

  class TestModel extends Model {}
  TestModel.connection = connection
  TestModel.collection = 'test_collection'

  const result = await TestModel.find()
  t.ok(Array.isArray(result), 'returns an array')
  t.equal(result.length, 1, 'found results from test_collection')
  t.ok(result[0] instanceof TestModel, 'returns model instances')
  t.equal(result[0].fields._id, 1, 'contains document fields')
})
