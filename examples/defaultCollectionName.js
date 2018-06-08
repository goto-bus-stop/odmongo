/**
 * This example shows how to provide a default collection name,
 * so you don't have to do `User.collection = 'user'` for every
 * model you define.
 *
 * We do this by extending the odmongo `Model` class, with a
 * default static collection property. Then we extend _that_
 * class, instead of the odmongo `Model` class, to create our
 * models.
 */

const BaseModel = require('../').Model

class Model extends BaseModel {
  // Still allow overriding the collection name.
  static set collection (name) { this._collection = name }
  static get collection () {
    if (this._collection) return this._collection

    // `this.name` is the name of the class.
    return this.name
      // UserActivity → userActivity
      .replace(/^[A-Z]/, (letter) => letter.toLowerCase())
      // userActivity → user_activity
      .replace(/([a-z0-9])([A-Z])/g, (_, a, b) => `${a}_${b.toLowerCase()}`)
  }
}

// Now these get default `.collection` values:
class User extends Model {}
class UserActivity extends Model {}
class Special extends Model {}
Special.collection = 'special_items'

// Now these have default values:
console.log({
  User: User.collection,
  UserActivity: UserActivity.collection,
  Special: Special.collection
})
