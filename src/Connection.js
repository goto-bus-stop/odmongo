const pify = require('pify')
const Collection = require('./Collection')

const kConnect = Symbol('client connect function')

class Connection {
  constructor ({ client }) {
    this.collections = Object.create(null)
    this.models = Object.create(null)
    this[kConnect] = client.connect
  }

  collection (name) {
    if (!this.collections[name]) {
      this.collections[name] = new Collection(this, name)
    }

    return this.collections[name]
  }

  async connect () {
    this.client = await pify(this[kConnect])(...arguments)
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
