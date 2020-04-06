/**
 * nodeJS 模板引擎(依赖doJS框架)
 * @authors yutent (yutent@doui.cc)
 * @date    2015-12-28 13:57:12
 *
 */
'use strict'

require('es.shim')
const Tool = require('./lib/tool')

function hash(str) {
  return Buffer.from(str).toString('hex')
}

class Smarty {
  constructor(opt) {
    this.opt = { cache: true, ext: '.tpl' }
    if (opt) {
      Object.assign(this.opt, opt)
    }

    this.__REG__ = new RegExp(this.opt.ext + '$')
    this.tool = new Tool(this.opt)
    this.__DATA__ = Object.create(null) // 预定义的变量储存
    this.__CACHE__ = Object.create(null) // 模块缓存
  }

  config(key, val) {
    this.tool.config(key, val)
  }

  /**
   * 定义变量
   * @param {Str} key  变量名
   * @param {any} val 值
   */
  assign(key, val) {
    key += ''
    if (!key) {
      return this
    }

    this.__DATA__[key] = val
    return this
  }

  /**
   * [render 模板渲染]
   * @param  {String} tpl  模板路径
   * @param  {String} uuid 唯一标识
   * @param  {Boolean} noParse 不解析直接读取
   * @return {Promise} 返回一个Promise对象
   */
  render(tpl = '', uuid = '', noParse = false) {
    var key = null
    if (!this.tool.opt.path) {
      throw new Error('Smarty engine must define path option')
    }
    if (!tpl) {
      return Promise.reject('argument[tpl] can not be empty')
    }

    if (!this.__REG__.test(tpl)) {
      tpl += this.opt.ext
    }

    key = hash(tpl + uuid)

    if (this.opt.cache && this.__CACHE__[key]) {
      return Promise.resolve(this.__CACHE__[key])
    }

    this.__CACHE__[key] = this.tool.__tpl__(tpl, noParse)
    if (noParse) {
      return this.__CACHE__[key]
    }

    try {
      this.__CACHE__[key] = this.tool.parse(this.__CACHE__[key], this.__DATA__)
      return Promise.resolve(this.__CACHE__[key])
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

module.exports = Smarty
