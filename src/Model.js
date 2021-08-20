import { ObjectId } from 'mongodb'
import Connection from './Connection.js'
import AggregateBuilder from './Aggregate.js'
import QueryBuilder from './Query.js'

const kConnection = Symbol('connection')
const kCollection = Symbol('collection')
const kMarker = Symbol.for('odmongo.model')

function has (object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}

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
      await this.collection.insertOne(this.fields)
    } else {
      await this.collection.update(
        { _id: this.fields._id },
        this.fields
      )
    }
  }

  /**
   * Get the document as a raw JSON object.
   *
   * @return {object}
   */
  toJSON () {
    return this.fields
  }

  /**
   * Get the MongoDB collection used by this Model.
   */
  static getCollection () {
    const name = this.collection
    return this.connection.collection(name)
  }

  /**
   * Find an instance of this Model in the database by its ID.
   *
   * @param {ObjectId|string} id
   * @return {Model}
   */
  static async findById (id) {
    if (typeof id === 'string') id = new ObjectId(id)

    const doc = await this.getCollection().findOne({ _id: id })
    if (!doc) {
      throw new Error('Not Found')
    }
    return this.hydrate(doc)
  }

  /**
   * Find an instance of this Model.
   *
   * @param {object} props
   */
  static find (props) {
    return new this.QueryBuilder(props)
      ._model(this)
  }

  static aggregate (stages = []) {
    return new this.AggregateBuilder(stages)
      ._model(this)
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
   * Get the collection name used by this model.
   */
  static get collection () {
    if (!has(this, kCollection)) {
      const name = this.name || 'Model'
      throw new Error(`odmongo: No collection was configured. Do \`${name}.collection = 'collection_name'\` before using any models.`)
    }
    return this[kCollection]
  }
}

Model.QueryBuilder = QueryBuilder
Model.AggregateBuilder = AggregateBuilder
Model[kMarker] = true

export default Model
