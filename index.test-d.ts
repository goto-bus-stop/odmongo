import { expectError, expectType } from 'tsd'
import * as joi from '@hapi/joi'
import { Connection, Model } from '.'

type Models = { User: typeof User; Playlist: typeof Playlist }

// Set up a connection instance
const connection = new Connection<Models>()

// Create some Model classes
type UserProps = { username: string }
class User extends Model<UserProps> {
  static schema = joi.object({
    username: joi.string().required()
  })

  async validate() {
    expectType<UserProps>(this.fields)
    await User.schema.validateAsync(this.fields)
  }
}
User.collection = 'users'

type PlaylistProps = { name: string; owner: string }
class Playlist extends Model<PlaylistProps> {}
Playlist.collection = 'playlists'

// Register models on the connection instance
connection.define({ User, Playlist })

const ConnectedUser = connection.models.User
const ConnectedPlaylist = connection.models.Playlist

// Connect!
async function connect () {
  await connection.connect('mongodb://localhost:27017/my_db')
}

async function queries () {
  // Query existing documents
  for await (const user of ConnectedUser.find()) {
    console.log(user.fields.username)
    expectType<UserProps>(user.fields)
    expectError(user.fields.whatever)
  }

  // Query builder typings
  await ConnectedUser.find().eq('username', 'myname')

  expectError(await ConnectedUser.find().eq('whatever', 'myname'))

  // TODO maybe this can be done in the future too
  await ConnectedUser.find().and([
    { username: 'myname' },
    { whatever: { $neq: 'myname' } }
  ])
  await ConnectedUser.find().or([
    { username: 'myname' },
    { whatever: { $neq: 'myname' } }
  ])
}

async function creation () {
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

async function aggregation () {
  async function countStage () {
    // aggregate().count() sets the result type
    const [countResult] = await ConnectedUser.aggregate().count('total')
    expectType<{ total: number }>(countResult)

    // unknown field name
    const someString = Math.random().toString()
    const [unknownCountResult] = await ConnectedUser.aggregate().count(
      someString
    )
    expectType<{ [n: string]: number }>(unknownCountResult)
  }

  async function facetStage () {
    const query = ConnectedUser.find().eq('username', 'test')
    let [
      { count, filter, rawPipeline }
    ] = await ConnectedUser.aggregate().facet({
      count: input => input.count('total'),
      filter: input => input.match(query),
      rawPipeline: [{ $skip: 100 }]
    })
    expectType<{ total: number }>(count[0])
    expectType<UserProps[]>(filter)
    expectType<{ [key: string]: any }[]>(rawPipeline)
  }

  async function lookupStage () {
    {
      const result = await ConnectedUser.aggregate().lookup({
        from: ConnectedPlaylist,
        localField: 'username',
        foreignField: 'owner',
        as: 'playlists'
      })
      expectType<string>(result[0].username)
      expectType<PlaylistProps[]>(result[0].playlists)
      expectError(result[0].somethingElse)
    }

    // Errors if `localField` does not exist in the pipeline
    expectError(
      await ConnectedUser.aggregate().lookup({
        from: ConnectedPlaylist,
        localField: 'whatever',
        foreignField: 'owner',
        as: 'playlists'
      })
    )

    // Errors if `foreignField` is not supported by the `from` Model
    expectError(
      await ConnectedUser.aggregate().lookup({
        from: ConnectedPlaylist,
        localField: 'username',
        foreignField: 'not_a_playlist_field',
        as: 'playlists'
      })
    )

    {
      // Cannot do the `foreignField` checks if `from` is a string
      const result = await ConnectedUser.aggregate().lookup({
        from: 'playlists',
        localField: 'username',
        foreignField: 'not_a_playlist_field',
        as: 'playlists'
      })
      expectType<string>(result[0].username)
      expectType<{ [key: string]: unknown }[]>(result[0].playlists)
      expectError(result[0].somethingElse)
    }
  }
}

async function fancyAggregatePipeline () {
  type PlaylistProps = {
    _id: string
    media: string[]
  }
  type PlaylistItemProps = {
    _id: string
    media: string
    artist: string
    title: string
  }
  type MediaProps = {
    _id: string
  }
  class Playlist extends Model<PlaylistProps> {}
  class PlaylistItem extends Model<PlaylistItemProps> {}
  class Media extends Model<MediaProps> {}

  const result = await Playlist.aggregate()
    .match({ _id: 'a-playlist-id' })
    .limit(1)
    .lookup({
      from: PlaylistItem,
      localField: 'media',
      foreignField: '_id',
      as: 'items'
    })
    .project({ _id: 0, items: 1 })
    .unwind('items')
    .replaceRoot('items')
    .match({
      $or: [{ artist: 'test' }, { title: 'test' }]
    })
    .facet({
      count: input => input.count('filtered'),
      items: input =>
        input
          .skip(50)
          .limit(50)
          .lookup({
            from: Media,
            localField: 'media',
            foreignField: '_id',
            as: 'media'
          })
          .unwind('media')
    })

  expectType<number>(result[0].count[0].filtered)

  const firstItem: {
    _id: string
    artist: string
    title: string
    media: { _id: string }
  } = result[0].items[0]
}
