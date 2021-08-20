import { MongoClient } from 'mongodb'

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
    const { pathname } = new URL(url)
    this.db = this.client.db(pathname.replace(/^\//, ''))
  }

  define (classes) {
    for (const [name, BaseModel] of Object.entries(classes)) {
      this.models[name] = makeConnectedModel(BaseModel, name, this)
    }
  }
}

// Create a subclass of the model with the correct name.
function makeConnectedModel (BaseModel, name, connection) {
  const vm = require('vm')

  const Connected = vm.runInNewContext(`
    class ${name} extends Model {}
    ${name}
  `, { Model: BaseModel })

  Connected.connection = connection
  Connected.collection = BaseModel.collection
  return Connected
}

export default Connection
