# odmongo

A barebones MongoDB ODM.

It provides a very small wrapper that you can extend in various places to build
yourself a nice DB library.

## Usage

```js
const joi = require('joi')
const { Connection, Model } = require('odmongo')
const { MongoClient } = require('mongodb')

// Set up a connection instance
const connection = new Connection({
  client: MongoClient
})

// Create some Model classes
const userSchema = joi.object({
  username: joi.string().required()
})
class User extends Model {
  validate () {
    return joi.validate(this.fields, userSchema)
  }
}
User.collection = 'users'

// Register models on the connection instance
connection.define({ User })

// Connect!
connection.connect('mongodb://localhost:27017/my_db').then(() => {
  const user = new connection.models.User({
    username: 'Me'
  })

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

<a id="connection-define"></a>
#### `conn.define(models)`

Define models for this connection. This makes models available on the
`conn.models` property, configured to use this connection.

If your app uses a single global connection instance, you may want to use
the [`Model.connection`](#model-set-connection) property directly instead.

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

Get a model that was registered using [`conn.define()`](#connection-define).

### `class extends Model {}`

Create a new Model class.

<a id="model-set-connection"></a>
#### `Model.connection = connection`

Configure the connection instances of this Model will use. If you use
[`conn.define()`](#connection-define), it does this for you.

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

```js
class User extends Model {}
User.collection = 'users'
```

You can also define this as a static getter property in your Model subclass:

```js
class User extends Model {
  static get collection () { return 'users' }
}
```

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
const joi = require('joi')

const schema = joi.object({
  username: joi.string()
    .min(3).max(32)
    .required()
})

class User extends Model {
  async validate () {
    return joi.validate(this.fields, schema, { allowUnknown: true })
  }
}
```
