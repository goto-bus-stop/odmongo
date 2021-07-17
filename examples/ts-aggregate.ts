import { Connection, Model } from '../'

// Define models
type PlaylistProps = {
  _id: string,
  media: string[],
}
type PlaylistItemProps = {
  _id: string,
  media: string,
  artist: string,
  title: string,
}
type MediaProps = {
  _id: string,
  url: string,
}
class Playlist extends Model<PlaylistProps> {}
class PlaylistItem extends Model<PlaylistItemProps> {}
class Media extends Model<MediaProps> {}

type Models = {
  Playlist: typeof Playlist,
  PlaylistItem: typeof PlaylistItem,
  Media: typeof Media,
}

async function main () {
  // Connection setup
  const connection = new Connection<Models>()
  connection.define({ Playlist, PlaylistItem, Media })

  // Last stage is $facet, so it returns exactly 1 result
  const [result] = await Playlist.aggregate()
    .match({ _id: 'a-playlist-id' })
    .limit(1)
    // find all items in the playlist
    .lookup({
      from: PlaylistItem,
      localField: 'media',
      foreignField: '_id',
      as: 'items'
    })
    // .project({ _id: 0, items: 1 })
    // stream just the items one by one
    .unwind('items')
    .replaceRoot('items')
    // search for something
    .match({
      $or: [
        { artist: 'test' },
        { title: 'test' },
      ]
    })
    // get the total number of matches, and a paginated list of items
    .facet({
      count: (input) => input.count('filtered'),
      items: (input) => input
        .skip(50)
        .limit(50)
        // look up the Media entry each item refers to
        .lookup({
          from: Media,
          localField: 'media',
          foreignField: '_id',
          as: 'media'
        })
        .unwind('media')
    })

  const resultCount: number = result.count[0].filtered

  for (const item of result.items) {
    const assertType: {
      _id: string,
      artist: string,
      title: string,
      media: { _id: string, url: string },
    } = item
  }
}
