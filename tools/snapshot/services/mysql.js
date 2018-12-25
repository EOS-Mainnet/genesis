const Sequelize = require('sequelize')

module.exports = (db, user, pass, host, port) => {
  return new Sequelize(
    db,
    user,
    pass,
    {
      host: host,
      port: port,
      dialect: "mysql",
      logging:false,
      define: {
        charset: 'utf8',
        dialectOptions: {
          collate: 'utf8_general_ci'
        }
      }
    }
  )
}
