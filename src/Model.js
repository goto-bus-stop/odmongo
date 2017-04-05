const snakeCase = require('snake-case')
const defaultConnection = require('./defaultConnection')

class Model {
  constructor () {
    this.fields = {}
    this.isNew = true
  }

  /**
   * Get the connection used by the Model.
   */
  get connection () {
    return this.constructor.getConnection()
  }

  /**
   * Get the MongoDB collection used by the Model.
   */
  get collection () {
    return this.connection.collection(this.constructor.getCollection())
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

    this.connection
  }

  /**
   * Get the document as a raw JSON object.
   */
  toJSON () {
    return this.fields
  }

  /**
   * Get the connection used by this Model.
   */
  static getConnection () {
    return defaultConnection
  }

  /**
   * Get the name of the MongoDB collection used by this Model.
   */
  static getCollection () {
    return this.collection || snakeCase(this.name)
  }

  /**
   * Find an instance of this Model in the database by its ID.
   *
   * @param {ObjectId|string} id
   * @return {Model}
   */
  static findById (id) {
    return this.getCollection().find({ _id: id })
      .then((docs) => this.hydrate(docs[0]))
  }

  /**
   * Find an instance of this Model.
   *
   * @param {object} props
   */
  static find (props) {
    return this.getCollection().find(props)
      .then((docs) => docs.map(this.hydrate, this))
  }

  static hydrate (props) {
    const model = new this(props)
    model.isNew = false
    return model
  }
}

module.exports = Model
