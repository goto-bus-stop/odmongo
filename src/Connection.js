// @ts-check
import { MongoClient } from 'mongodb'
import Model from './Model.js'

const kClientFactory = Symbol('client factory')

/**
 * @typedef {object} ConnectionOptions
 * @prop {MongoClient} [client]
 * @prop {{ connect(url: string, options: import('mongodb').MongoClientOptions): Promise<MongoClient> }} [clientFactory]
 */

/**
 * @typedef {Record<string, any>} ModelBag
 */

/**
 * @template {ModelBag} [TModels = Record<string, typeof Model>]
 */
class Connection {
  /**
   * @param {ConnectionOptions} options
   */
  constructor ({ client, clientFactory } = {}) {
    /** @type {Record<string, import('mongodb').Collection>} */
    this.collections = Object.create(null)
    /** @type {TModels} */
    this.models = Object.create(null)
    this.client = client
    this[kClientFactory] = clientFactory || MongoClient
  }

  /**
   * @param {string} name
   */
  collection (name) {
    if (!this.collections[name]) {
      this.collections[name] = this.db.collection(name)
    }

    return this.collections[name]
  }

  /**
   * @param {string} url
   * @param {import('mongodb').MongoClientOptions} options
   */
  async connect (url, options) {
    if (!this.client) {
      this.client = await this[kClientFactory].connect(url, options)
    }
    const { pathname } = new URL(url)
    this.db = this.client.db(pathname.replace(/^\//, ''))
  }

  /**
   * @param {Partial<TModels>} classes
   */
  define (classes) {
    for (const [name, BaseModel] of Object.entries(classes)) {
      this.models[/** @type {keyof classes} */ (name)] = makeConnectedModel(BaseModel, name, this)
    }
  }
}

/**
 * Create a subclass of the model with the correct name.
 *
 * @template {typeof Model} BaseModel
 * @param {BaseModel} BaseModel
 * @param {string} name
 * @param {Connection} connection
 */
function makeConnectedModel (BaseModel, name, connection) {
  const vm = require('vm')

  /** @type {BaseModel} */
  const Connected = vm.runInNewContext(`
    class ${name} extends Model {}
    ${name}
  `, { Model: BaseModel })

  Connected.connection = connection
  Connected.collection = BaseModel.collection
  return Connected
}

export default Connection
