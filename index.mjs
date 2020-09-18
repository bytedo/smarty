/**
 * nodeJS 模板引擎
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/18 13:36:47
 */

import 'es.shim'
import path from 'path'
import fs from 'iofs'

import Tool from './lib/tool.mjs'

function hash(str) {
  return Buffer.from(str).toString('hex')
}

export default class Smarty {
  constructor(opt) {
    this.opt = { cache: true, ext: '.htm' }
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
   * @param  {String} filePath  模板路径
   * @param  {Boolean} noParse 不解析直接读取
   * @return {Promise} 返回一个Promise对象
   */
  render(filePath = '', noParse = false) {
    var key = null
    var cache
    if (!this.opt.path) {
      throw new Error('Smarty engine must define path option')
    }
    if (!filePath) {
      return Promise.reject('argument[filePath] can not be empty')
    }

    if (!this.__REG__.test(filePath)) {
      filePath += this.opt.ext
    }
    filePath = path.resolve(this.opt.path, filePath)

    key = hash(filePath)

    if (this.__CACHE__[key]) {
      return Promise.resolve(fs.cat(path.resolve('./cache/', key)))
    }

    cache = this.tool.__readFile__(filePath, noParse)

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
