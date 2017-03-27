const pify = require('pify')
const { MongoClient } = require('mongodb')

const connect = pify(MongoClient.connect)

class Connection {
  constructor () {}

  async connect () {
    this.client = await connect(...arguments)
  }
}

module.exports = Connection
