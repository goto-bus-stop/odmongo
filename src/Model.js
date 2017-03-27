class Model {
  constructor () {}

  static findById (id) {
    return this.find({ _id: id })
  }

  static find (props) {
  }
}

module.exports = Model
