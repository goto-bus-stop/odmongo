## Connection

### `conn = new Connection({ client })`

Initialise a new connection.

`client` is an optional MongoClient instance from the `mongodb` package.

```js
const conn = new Connection()
```

### `await conn.connect(url)`

Connect to the DB server. Any arguments are passed to the client factory's
`.connect()` method.

Returns a Promise that resolves once the connection is up.

<a id="connection-define"></a>
### `conn.define(models)`

Define models for this connection. This makes models available on the
[`conn.models`](#connection-models) property, configured to use this connection.

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

<a id="connection-models"></a>
### `conn.models.ModelName`

Get a model that was registered using [`conn.define()`](#connection-define).

## Model

### `class MyModel extends Model {}`

Create a new Model class. To customise its behaviour, override these properties and methods:

- [`Model.connection`](#model-set-connection)
- [`Model.collection`](#model-set-collection)
- [`Model.validate`](#model-validate)

<a id="model-set-connection"></a>
### `Model.connection = connection`

Configure the connection instances of this Model will use. If you use
[`conn.define()`](#connection-define), it does this for you.

Subclasses default to using their superclass's connection, so to make all models
use a global Connection instance, you can do:

```js
import { Model } from 'odmongo'
Model.connection = myGlobalConnection
```

To make a single Model class use a different connection, do:

```js
ThatOtherModel.connection = someOtherConnection
```

### `Model.collection = 'name'`

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

### `Model.QueryBuilder = CustomBuilder`

Use a different query builder. Query builder instances are returned from
[`Model.find()`](#model-find).

### `await Model.find(query)`

Execute a query `query` and return an array of models matching the criteria.

<a id="model-find">
### `Model.find(query)`

Create a [QueryBuilder](#query-builder) instance. If `query` is given, it is
used as the initial query.

### `await Model.findById(id)`

Find a single model by its ID.

<a id="model-fields"></a>
### `model.fields`

An object containing the fields and values of a model instance. This is the way
to access and modify fields.

```js
const user = await User.findById(someId)
console.log(user.fields.username)
user.fields.visits += 1
await user.save()
```

<a id="model-save"></a>
### `await model.save()`

Save a model. If the model is new, it is inserted into the database. Else, the
existing document is updated.

<a id="model-validate"></a>
### `async validate() {}`

A validation function for models. You can use this to implement a schema similar
to the ones offered by libraries like Mongoose.

`validate()` is called before any model is saved.

The return value of this function is ignored. Throw an error to fail the
validation.

You can update `this.fields` in this function to apply default values or to
normalise data.

Use any validation mechanism you like, [`joi`](https://github.com/hapijs/joi)
is a good one:

```js
import joi from 'joi'

const schema = joi.object({
  username: joi.string()
    .min(3).max(32)
    .required()
})

class User extends Model {
  async validate () {
    await joi.validate(this.fields, schema, { allowUnknown: true })
  }
}
```

<a id="query-builder"></a>
## QueryBuilder

### `query.where(restrictions)`

Add restrictions to the query. See the [MongoDB documentation](https://docs.mongodb.com/manual/reference/operator/query/)
for available operators.

> It's better to use the specific methods documented below, because they will
> throw errors early if types are wrong. This exists as a fallback in case
> something you need is not implemented in `odmongo`.

```js
query.where({ email: { $regex: '.*@gmail\\.com' } })
```

### `query.eq('fieldName', value)`
### `query.neq('fieldName', value)`
### `query.gt('fieldName', value)`
### `query.gte('fieldName', value)`
### `query.lt('fieldName', value)`
### `query.lte('fieldName', value)`

Add a field restriction to the query.

- `eq` - Field must be equal to `value`.
- `neq` - Field must not be equal to `value`.
- `gt` - Field must be greater than `value`.
- `gte` - Field must be greater than or equal to `value`.
- `lt` - Field must be less than `value`.
- `lte` - Field must be less than or equal to `value`.

<a id="querybuilder-execute"></a>
### `query.execute(options)`

Execute the query. Returns a Promise-like object that resolves with an array
containing all matching records. The return value is also an Async Iterable, so
you can use `for await` syntax:

```js
const array = await User.find().execute()

for await (const item of User.find().execute()) { }
```

> Using [`await query`](#query-await) or [`for await`](#query-for-await) on a
QueryBuilder object directly implicitly calls `.execute()`, so most of the time
you do not have to do it manually.

<a id="queryiterator-unwrap"></a>
### `query.execute(options).unwrap()`

Return the [MongoDB Cursor](https://mongodb.github.io/node-mongodb-native/3.1/api/Cursor.html)
returned by this Query. This can be useful if you need functionality that is not
implemented in `odmongo`.

> When using `.unwrap()`, do **not** first `await` the result of the
> `.execute()` call. Call it directly on the result of `.execute()`.

<a id="query-await"></a>
### `await query`

Execute the query. Returns an array of all matching records.

```js
const users = await User.find()
```

<a id="query-for-await"></a>
### `for await (const model of query)`

Execute the query and iterate over the result.

```js
for await (const user of User.find()) {
  console.log(user.fields.username)
}
```

## AggregateBuilder

<a id="aggregatebuilder-push"></a>
### `aggregate.push(stage)`

Add an [aggregation stage](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/).

> It's better to use the specific methods documented below, because they will
> throw errors early if types are wrong. This exists as a fallback in case
> something you need is not implemented in `odmongo`.

```js
aggregate.push({
  $group: {
    _id: null,
    total: { $sum: '$views' }
  }
})
```

<a id="aggregateiterator-unwrap"></a>
### `aggregate.execute(options).unwrap()`

Return the [MongoDB AggregationCursor](https://mongodb.github.io/node-mongodb-native/3.1/api/AggregationCursor.html)
returned by this Aggregate. This can be useful if you need functionality that is
not implemented in `odmongo`.

> When using `.unwrap()`, do **not** first `await` the result of the
> `.execute()` call. Call it directly on the result of `.execute()`.

<a id="aggregate-await"></a>
### `await aggregate`

Execute the aggregation. This collects all results into an array.

```js
const results = await User.aggregate(/* pipeline */)
```

<a id="aggregate-for-await"></a>
### `for await (const result of aggregate)`

Execute the aggregation and iterate over the result.

```js
for await (const user of User.aggregate()) {
  console.log(user.username)
}
```

