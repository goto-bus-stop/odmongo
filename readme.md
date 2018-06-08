# odmongo

A barebones MongoDB ODM.

```js
const joi = require('joi')
const pify = require('pify')
const { Connection, Model } = require('odmongo')
const { MongoClient } = require('mongodb')

const schema = joi.object({
  username: joi.string().required()
})

const connection = new Connection({
  client: MongoClient
})

class User extends Model {
  validate () {
    return pify(joi.validate)(this.fields, schema)
  }
}
User.collection = 'users'

connection.define({ User })

const user = new connection.models.User({
  username: 'Me'
})

connection.connect('mongodb://localhost:27017/my_db').then(() => {
  return user.save().then(() => {
    console.log('saved')
  }).catch((err) => {
    console.error('Could not save the new user:', err.message)
  })
})
```

## API

### `conn = new Connection({ client })`

Initialise a new connection.
`client` is a client factory with a `connect()` method. One such factory is the
MongoClient class in the official mongodb driver package:

```js
const conn = new Connection({
  client: require('mongodb').MongoClient
})
```

#### `await conn.connect(url)`

Connect to the DB server. Any arguments are passed to the client factory's
`.connect()` method.

Returns a Promise that resolves once the connection is up.

#### `conn.define(models)`

Define models for this connection. This makes models available on the
`conn.models` property, configured to use this connection.

`models` is an object with model names as keys, and model classes as values.

```js
class User extends Model {}

conn.define({ User })

conn.models.User.find({ username: 'example' })

// conn.models.User is a subclass of User, so this holds:
assert.ok(new conn.models.User() instanceof User)
// But this does not:
assert.notOk(new User() instanceof conn.models.User)
```

#### `conn.models.ModelName`

Get a model that was registered using `conn.define()`.

### `class extends Model {}`

Create a new Model class.

#### `Model.connection = connection`

Configure the connection instances of this Model will use. If you use
`conn.define()`, it does this for you.

Subclasses default to using their superclass's connection, so to make all models
use a global Connection instance, you can do:

```js
Model.connection = myGlobalConnection
```

To make a single Model class use a different connection, do:

```js
ThatOtherModel.connection = someOtherConnection
```

#### `Model.collection = 'name'`

Set the name of the database collection where this Model's instances are found
and stored.

#### `await Model.find(query)`

Execute a query `query` and return an array of models matching the criteria.

#### `await Model.findById(id)`

Find a single model by its ID.

#### `model.fields`

An object containing the fields and values of a model instance. This is the way
to access and modify fields.

```js
const user = await User.findById(someId)
console.log(user.fields.username)
user.fields.visits += 1
await user.save()
```

#### `await model.save()`

Save a model. If the model is new, it is inserted into the database. Else, the
existing document is updated.

#### `async validate() {}`

A validation function for models. You can use this to implement a schema similar
to the ones offered by libraries like Mongoose.

`validate()` is called before any model is saved.

Use any validation mechanism you like, `joi` is a good one:

```js
const { promisify } = require('util')
const joi = require('joi')
const validate = promisify(joi.validate)

const schema = joi.object({
  username: joi.string()
    .min(3).max(32)
    .required()
})

class User extends Model {
  async validate () {
    return validate(this.fields, schema, { allowUnknown: true })
  }
}
```
