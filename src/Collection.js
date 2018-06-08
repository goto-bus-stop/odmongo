class Collection {
  constructor (connection, name) {
    this.connection = connection
    this.name = name
    this.collection = connection.client.collection(name)
  }

  find (query) {
    return this.collection.find(query).toArray()
  }

  insert (document) {
    return this.collection.insertOne(document)
  }

  update (query, update) {
    return this.collection.updateOne(query, update)
  }
}

module.exports = Collection
