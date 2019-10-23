import { expectError, expectType } from 'tsd'
import * as joi from '@hapi/joi'
import { Connection, Model } from '.'

async function main () {
  type Models = { User: typeof User };

  // Set up a connection instance
  const connection = new Connection<Models>()

  // Create some Model classes
  type UserProps = { username: string }
  class User extends Model<UserProps> {
    static schema = joi.object({
      username: joi.string().required()
    })

    async validate () {
      await User.schema.validateAsync(this.fields)
    }
  }
  User.collection = 'users'

  // Register models on the connection instance
  connection.define({ User })

  const ConnectedUser = connection.models.User

  // Connect!
  await connection.connect('mongodb://localhost:27017/my_db')

  // Query existing documents
  for await (const user of ConnectedUser.find()) {
    console.log(user.fields.username)
    expectType<UserProps>(user.fields)
    expectError(user.fields.whatever)
  }

  // aggregate().count() sets the result type
  const [countResult] = await ConnectedUser.aggregate()
    .count('total')
  expectType<{ total: number }>(countResult.fields)
  const someString = Math.random().toString()
  // unknown field name
  const [unknownCountResult] = await ConnectedUser.aggregate().count(someString)
  expectType<{ [n: string]: number }>(unknownCountResult.fields)

  // Query builder typings
  await ConnectedUser.find()
    .eq('username', 'myname')

  expectError(await ConnectedUser.find()
    .eq('whatever', 'myname'))

  // TODO maybe this can be done in the future too
  await ConnectedUser.find().and([
    { username: 'myname' },
    { whatever: { $neq: 'myname' } }
  ])
  await ConnectedUser.find().or([
    { username: 'myname' },
    { whatever: { $neq: 'myname' } }
  ])

  // Create new documents
  const user = new ConnectedUser({
    username: 'Me'
  })
  try {
    await user.save()
    console.log('saved')
  } catch (err) {
    console.error('Could not save the new user:', err.message)
  }

  expectError(connection.models.User.hydrate({ whatever: 'lol' }))
  expectType<User>(connection.models.User.hydrate({ username: 'lol' }))
}
