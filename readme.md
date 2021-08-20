# odmongo

A barebones MongoDB ODM designed for use with modern ES syntax.

It provides a very small wrapper that you can extend in various places to build
yourself a nice DB library.

## Usage

In short:

```js
import joi from 'joi'
import { Connection, Model } from 'odmongo'

// Set up a connection instance
const connection = new Connection()

// Create some Model classes
class User extends Model {
  validate () {
    return joi.validate(this.fields, User.schema)
  }
}
User.schema = joi.object({
  username: joi.string().required()
})
User.collection = 'users'

// Register models on the connection instance
connection.define({ User })

// Connect!
await connection.connect('mongodb://localhost:27017/my_db')

// Query existing documents
for await (const user of connection.models.User.find()) {
  console.log(user.fields.username)
}

// Create new documents
const user = new connection.models.User({
  username: 'Me'
})
try {
  await user.save()
  console.log('saved')
} catch (err) {
  console.error('Could not save the new user:', err.message)
}
```

## API

See the documentation in [API.md](./API.md).

## License

[Apache-2.0](./LICENSE.md)
