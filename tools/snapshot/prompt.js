let prompt = require('prompt'),
    colors = require("colors/safe"),
    optimist = require('optimist'),
    fs = require('fs')

let period  = require('./utilities/periods')

prompt.override = optimist.argv

let schema = {

  properties: {

    //Unoad Config?
    load_config: {
      type: 'boolean',
      description: colors.magenta('Config file detected, load it?'),
      message: 'Must be boolean',
      default: true,
      ask: () => fs.existsSync('./config.js')
    },

    //Required Configuration
    period: {
      description: colors.magenta('Snapshot up to which Period?'),
      message: `Period must be in the past and closed (Default: ${period.last_closed()})`,
      required: true,
      type: 'number',
      conform: function (p) {
        if(p > period.last_closed())
          return period.last_closed()
        return true
      },
      default: period.last_closed(),
      ask: () => prompt.history('load_config')===false
    },

    //Options
    // include_b1: {
    //   type: 'boolean',
    //   description: colors.magenta('Include B1 Distribution in Snapshot?'),
    //   message: 'Must be boolean',
    //   default: true,
    //   ask: () => prompt.history('load_config')===false
    // },

    registration_fallback: {
      type: 'boolean',
      description: colors.magenta('Run experimental registration fallback? (will take days, not exagerating!)'),
      message: 'Must be boolean',
      default: false,
      ask: () => prompt.history('load_config')===false
    },

    //Meta
    cache_signatures: {
      type: 'boolean',
      description: colors.magenta('Cache Keys? (advanced)'),
      message: 'Must be true or false',
      default: false,
      ask: () => prompt.history('load_config')===false
    },

    //Meta
    author: {
      type: 'string',
      description: colors.magenta('Author name? (optional, suggest using EOS public key)'),
      message: 'Author must be only letters, spaces, or dashes',
      default: "Anonymous",
      ask: () => prompt.history('load_config')===false
    },

    //Meta
    overwrite_snapshot: {
      type: 'string',
      description: colors.magenta('Overwrite snapshot in project root? (optional)'),
      message: 'Must be true or false',
      default: false,
      ask: () => prompt.history('load_config')===false
    }
  }
};

module.exports = {
  schema: schema,
  start: () => prompt.start({noHandleSIGINT: true}),
  // start: () => prompt.start(),
  get: prompt.get
}
