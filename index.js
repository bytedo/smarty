/**
 * nodeJS 模板引擎
 * @authors yutent (yutent@doui.cc)
 * @date    2015-12-28 13:57:12
 *
 */
'use strict'

require('es.shim')

const Tool = require('./lib/tool')
const path = require('path')
const fs = require('iofs')

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
    this.__CACHE__ = Object.create(null) // 渲染缓存
  }

  config(key, val) {
    key += ''
    if (!key || val === undefined) {
      return
    }
    this.opt[key] = val
    this.tool.opt[key] = val
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
   * @param  {Boolean} noParse 不解析直接读取
   * @return {Promise} 返回一个Promise对象
   */
  render(tpl = '', noParse = false) {
    var key = null
    var cache
    if (!this.opt.path) {
      throw new Error('Smarty engine must define path option')
    }
    if (!tpl) {
      return Promise.reject('argument[tpl] can not be empty')
    }

    if (!this.__REG__.test(tpl)) {
      tpl += this.opt.ext
    }
    tpl = path.resolve(this.opt.path, tpl)

    key = hash(tpl)

    if (this.__CACHE__[key]) {
      return Promise.resolve(fs.cat(path.resolve('./cache/', key)))
    }

    cache = this.tool.__readFile__(tpl, noParse)

    if (noParse) {
      this.__CACHE__[key] = true
      fs.echo(cache, path.resolve('./cache/', key))
      return Promise.resolve(cache)
    }

    try {
      cache = this.tool.parse(cache, this.__DATA__)
      if (this.opt.cache) {
        this.__CACHE__[key] = true
        fs.echo(cache, path.resolve('./cache/', key))
      }
      return Promise.resolve(cache)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

module.exports = Smarty
