const { parse } = require('url')
const { MongoClient } = require('mongodb')

const kClientFactory = Symbol('client factory')

class Connection {
  constructor ({ client, clientFactory } = {}) {
    this.collections = Object.create(null)
    this.models = Object.create(null)
    this.client = client
    this[kClientFactory] = clientFactory || MongoClient
  }

  collection (name) {
    if (!this.collections[name]) {
      this.collections[name] = this.db.collection(name)
    }

    return this.collections[name]
  }

  async connect (url, opts) {
    if (!this.client) {
      this.client = await this[kClientFactory].connect(url, opts)
    }
    const { pathname } = parse(url)
    this.db = this.client.db(pathname.replace(/^\//, ''))
  }

  define(classes) {
    const models = {}
    for (const name of Object.keys(classes)) {
      const BaseModel = classes[name]
      this.models[name] = makeConnectedModel(BaseModel, name, this)
    }
  }
}

module.exports = Connection

// Create a subclass of the model with the correct name.
function makeConnectedModel (BaseModel, name, connection) {
  const vm = require('vm')

  const Connected = vm.runInNewContext(`
    class ${name} extends Model {}
    ${name}
  `, { Model })

  Connected.connection = connection;
  return Connected
}
