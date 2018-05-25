/**
 * nodeJS 模板引擎(依赖doJS框架)
 * @authors yutent (yutent@doui.cc)
 * @date    2015-12-28 13:57:12
 *
 */
'use strict'

require('es.shim')
const Tool = require('./lib/tool')
const md5 = require('./lib/md5')

class Smarty {
  constructor(opt) {
    this.opt = { cache: true }
    if (opt) {
      Object.assign(this.opt, opt)
    }

    this.tool = new Tool(this.opt)
    this.data = {} // 预定义的变量储存
    this.cache = {} // 模块缓存
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

    this.data[key] = val
    return this
  }

  /**
   * [render 模板渲染]
   * @param  {String} tpl  模板路径
   * @param  {String} uuid 唯一标识
   * @return {Promise} 返回一个Promise对象
   */
  render(tpl = '', uuid = '') {
    if (!this.tool.opt.path) {
      console.log(this.tool)
      throw new Error('Smarty engine must define path option')
    }
    if (!tpl) {
      return Promise.reject('argument[tpl] can not be empty')
    }

    if (!/\.tpl$/.test(tpl)) {
      tpl += '.tpl'
    }

    let cacheId = md5(tpl + uuid)

    if (this.opt.cache && this.cache[cacheId]) {
      return Promise.resolve(this.cache[cacheId])
    }

    this.cache[cacheId] = this.tool.__tpl__(tpl)

    try {
      this.cache[cacheId] = this.tool.parse(this.cache[cacheId], this.data)
      return Promise.resolve(this.cache[cacheId])
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

module.exports = Smarty
