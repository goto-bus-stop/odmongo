const snakeCase = require('snake-case')
const Connection = require('./Connection')

const kConnection = Symbol('connection')
const kCollection = Symbol('collection')

class Model {
  constructor (fields = {}) {
    this.fields = fields
    this.isNew = true
  }

  /**
   * Get the connection used by the Model.
   */
  get connection () {
    return this.constructor.connection
  }

  /**
   * Get the MongoDB collection used by the Model.
   */
  get collection () {
    return this.constructor.getCollection()
  }

  /**
   * Validate the Model. Should be overridden by subclasses.
   *
   * @return {Promise}
   */
  validate () {
    return Promise.resolve()
  }

  /**
   * Save the Model in the database.
   *
   * @return {Promise}
   */
  async save () {
    await this.validate()

    if (this.isNew) {
      await this.collection.insert(this.toJSON())
    } else {
      await this.collection.update(
        { _id: this.fields._id },
        this.toJSON()
      )
    }
  }

  /**
   * Get the document as a raw JSON object.
   */
  toJSON () {
    return this.fields
  }

  /**
   * Get the MongoDB collection used by this Model.
   */
  static getCollection () {
    const name = this.collection || snakeCase(this.name)
    return this.connection.collection(name)
  }

  /**
   * Find an instance of this Model in the database by its ID.
   *
   * @param {ObjectId|string} id
   * @return {Model}
   */
  static async findById (id) {
    if (typeof id === 'string') id = { $id: id }

    const docs = await this.getCollection().find({ _id: id })
    if (docs.length === 0) {
      throw new Error('Not Found')
    }
    return this.hydrate(docs[0])
  }

  /**
   * Find an instance of this Model.
   *
   * @param {object} props
   */
  static find (props) {
    return this.getCollection().find(props)
      .then(this.hydrateAll.bind(this))
  }

  /**
   * Hydrate a JSON document to a model instance.
   *
   * @param {object} props
   */
  static hydrate (props) {
    const model = new this(props)
    model.isNew = false
    return model
  }

  /**
   * Hydrate a list of JSON documents to models.
   *
   * @param {Array.<object>} documents
   */
  static hydrateAll (documents) {
    return documents.map(this.hydrate, this)
  }

  /**
   * Configure the connection to be used by this model.
   *
   * @param {Connection} connection
   */
  static set connection (connection) {
    if (!(connection instanceof Connection)) {
      const name = this.name || 'Model'
      throw new Error(`odmongo: ${name}.connection must be an instance of Connection.`)
    }
    this[kConnection] = connection
  }

  /**
   * Get the connection used by this model.
   */
  static get connection () {
    if (!this[kConnection]) {
      const name = this.name || 'Model'
      throw new Error(`odmongo: No connection was configured. Do \`${name}.connection = connection\` before using any models.`)
    }
    return this[kConnection]
  }

  /**
   * Configure the collection to be used by this model.
   *
   * @param {string} name
   */
  static set collection (name) {
    if (this === Model) {
      throw new Error('odmongo: Cannot configure a collection on the base Model class. Instead extend this class, and configure a collection on the subclass.')
    }
    if (typeof name !== 'string') {
      const name = this.name || 'Model'
      throw new Error(`odmongo: ${name}.collection must be a string.`)
    }
    this[kCollection] = name
  }

  /**
   * Get the collection used by this model.
   */
  static get collection () {
    if (!this[kCollection]) {
      const name = this.name || 'Model'
      throw new Error(`odmongo: No connection was configured. Do \`${name}.connection = connection\` before using any models.`)
    }
    return this[kCollection]
  }
}

module.exports = Model
