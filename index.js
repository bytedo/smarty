/**
 * nodeJS 模板引擎
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/18 13:36:47
 */

require('es.shim')

const Tool = require('./lib/tool')
const path = require('path')
const fs = require('iofs')

function hash(str) {
  return Buffer.from(str).toString('hex')
}

var cacheDir = path.resolve(__dirname, './cache/')

class Smarty {
  constructor(opt) {
    this.opt = { ext: '.htm' }
    if (opt) {
      Object.assign(this.opt, opt)
    }

    this.__REG__ = new RegExp(this.opt.ext + '$')
    this.tool = new Tool(this.opt)

    this.reset()
    this.__CACHE__ = Object.create(null) // 渲染缓存
    // 消除缓存目录
    if (fs.isdir(cacheDir)) {
      fs.rm(cacheDir)
    }
  }

  reset() {
    this.__DATA__ = Object.create(null) // 预定义的变量储存
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
    var key, ckey, cache, needWrite

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
    ckey = path.join(cacheDir, key)

    if (this.__CACHE__[key]) {
      cache = fs.cat(ckey)
    } else {
      cache = fs.cat(filePath)
      this.__CACHE__[key] = true
      needWrite = true
    }

    // 无需解析时, 直接输出
    if (noParse) {
      if (needWrite) {
        fs.echo(cache, ckey)
      }
      return Promise.resolve(cache)
    } else {
      if (needWrite) {
        cache = this.tool.parse(cache)
        fs.echo(cache, ckey)
      }
    }

    try {
      var body = this.tool.exec(cache, this.__DATA__)
      this.reset()
      return Promise.resolve(body)
    } catch (err) {
      return Promise.reject(err)
    }
  }
}

module.exports = Smarty
