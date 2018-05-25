/**
 *
 * @authors yutent (yutent@doui.cc)
 * @date    2017-01-17 15:50:51
 *
 */

'use strict'

const crypto = require('crypto')

module.exports = function(str = '') {
  return crypto
    .createHash('md5')
    .update(str + '', 'utf8')
    .digest('hex')
}
