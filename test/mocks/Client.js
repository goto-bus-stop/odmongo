import MockCursor from './Cursor.js'

export default class MockClient {
  constructor (collections) {
    this.collections = collections
  }

  db () {
    return {
      collection: (name) => ({
        find: () => new MockCursor(this.collections[name])
      })
    }
  }

  static connect (data) {
    return new MockClient(data)
  }
}
