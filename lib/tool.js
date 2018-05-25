/**
 * 模板引擎预处理，对dojs框架有依赖
 * @authors yutent (yutent@doui.cc)
 * @date    2016-01-02 21:26:49
 *
 */

'use strict'

let fs = require('iofs')
let path = require('path')

class Tool {
  constructor(opt) {
    this.opt = {
      delimiter: ['<!--{', '}-->'], //模板界定符
      labels: {
        //支持的标签类型
        extends: 'extends ([^\\{\\}\\(\\)]*?)', //引入其他文件
        inc: 'include ([^\\{\\}\\(\\)]*?)', //引入其他文件
        each: 'each ([^\\{\\}\\(\\)]*?)', //each循环开始
        done: '/each', //each循环结束
        blockL: 'block ([^\\{\\}\\(\\)]*?)', //each循环开始
        blockR: '/block', //each循环结束
        if: 'if ([^\\{\\}\\/]*?)', //if开始
        elif: 'elseif ([^\\{\\}\\/]*?)', //elseif开始
        else: 'else', //else开始
        fi: '/if', //if结束
        var: 'var ([\\s\\S]*?)', //定义变量
        echo: '=([^\\{\\}]*?)', //普通变量
        comment: '#([\\s\\S]*?)#' //引入其他文件
      }
    }

    this.opt = this.opt.merge(opt)

    //过滤器
    this.filters = {
      html: function(str = '') {
        str += ''
        return str.tohtml()
      },
      truncate: function(str, len = '', truncation = '...') {
        str += ''
        //防止模板里参数加了引号导致异常
        len = len.replace(/['"]/g, '') - 0
        if (str.length <= len || len < 1) return str

        //去除参数里多余的引号
        truncation = truncation.replace(/^['"]/, '').replace(/['"]$/, '')

        return str.slice(0, len) + truncation
      },
      lower: function(str) {
        str += ''
        return str.toLowerCase()
      },
      upper: function(str) {
        str += ''
        return str.toUpperCase()
      },
      date: function(str, format = '') {
        //去除参数里多余的引号
        format = format.replace(/^['"]/, '').replace(/['"]$/, '')
        return gmdate(format, str)
      }
    }
  }

  __tpl__(name) {
    let file = path.resolve(this.opt.path, name)
    if (!fs.exists(file)) {
      throw new Error(`Can not find template "${file}"`)
    }

    return fs
      .cat(file)
      .toString()
      .replace(/[\r\n\t]+/g, ' ') //去掉所有的换行/制表
      .replace(/\\/g, '\\\\')
  }

  //生成正则
  __exp__(str) {
    return new RegExp(str, 'g')
  }

  //生成模板标签
  __label__(id) {
    let opt = this.opt
    let tag = opt.labels[id]
    return this.__exp__(opt.delimiter[0] + tag + opt.delimiter[1])
  }

  //设置 配置信息
  config(key, val) {
    key += ''
    if (!key || !val) {
      return
    }
    this.opt[key] = val
  }

  //解析普通字段
  matchNormal(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + '[=\\s]?')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m
      .replace(begin, '')
      .replace(end, '')
      .replace(/\|\|/g, '\t')

    let matches = m.split('|')
    let filter = matches.length == 1 ? '' : matches[1].trim()
    let txt = matches[0].replace(/\t/g, '||').trim()

    // 默认过滤HTML标签
    txt = txt.htmlspecialchars()

    if (filter) {
      let args = filter.split(':')
      filter = args.splice(0, 1, txt) + ''
      if (filter === 'date' && args.length > 2) {
        let tmp = args.splice(0, 1)
        tmp.push(args.join(':'))
        args = tmp
        tmp = null
      }

      if (this.filters.hasOwnProperty(filter)) {
        args = args.map((it, i) => {
          if (i === 0) {
            return it
          }
          return `'${it}'`
        })
        txt = `__filters__.${filter}(${args.join(', ')})`
      }
    }
    return `\` + (${txt}); tpl += \``
  }

  //解析each循环
  matchFor(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'each\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (empty(m) || !/\sin\s/.test(m)) {
      return new Error('Wrong each loop')
    }

    let each = 'for (let '
    let ms = m.split(' in ')
    let mi = ms[0].trim().split(' ')
    let mf = ms[1].trim() //要遍历的对象

    if (mi.length === 1) {
      each += `d_idx in ${mf}) { let ${mi[0]} = ${mf}[d_idx]; tpl += \``
    } else {
      each += `${mi[0]} in ${mf}) { let ${mi[1]} = ${mf}[${mi[0]}]; tpl += \``
    }

    return `\`; ${each}`
  }

  //解析条件语句
  matchIf(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'if\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (empty(m)) return `\`; tpl += \``

    return `\`; if (${m}){ tpl += \``
  }

  //解析条件语句
  matchElseIf(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'elseif\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (empty(m)) return `\`;} else { tpl += \``

    return `\`; } else if (${m}){ tpl += \``
  }

  //解析变量定义
  matchVar(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'var\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (!empty(m) || /=/.test(m)) m = 'let ' + m

    this.vars += ` ${m};`

    return `\`; tpl += \``
  }

  //解析include
  matchInclude(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'include\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m
      .replace(begin, '')
      .replace(end, '')
      .replace(/^['"]/, '')
      .replace(/['"]$/, '')
      .replace(/\.tpl$/, '') //去掉可能出现的自带的模板后缀

    m += '.tpl' //统一加上后缀

    let tpl = this.__tpl__(m)
    //递归解析include
    tpl = tpl.replace(this.__label__('inc'), m1 => {
      return this.matchInclude(m1)
    })

    return tpl
  }

  // 解析常规标签
  parseNormal(str) {
    return (
      str
        // 解析include
        .replace(this.__label__('inc'), m => {
          return this.matchInclude(m)
        })
        // 移除注释
        .replace(this.__label__('comment'), m => {
          return ''
        })
        // 解析each循环
        .replace(this.__label__('each'), m => {
          return this.matchFor(m)
        })
        // 解析循环结束标识
        .replace(this.__label__('done'), '` } tpl += `')
        // 解析 if/elseif 条件
        .replace(this.__label__('if'), m => {
          return this.matchIf(m)
        })
        .replace(this.__label__('elif'), m => {
          return this.matchElseIf(m)
        })
        // 解析else
        .replace(this.__label__('else'), '`; } else { tpl += `')
        // 解析if条件结束标识
        .replace(this.__label__('fi'), '`; } tpl += `')
        // 解析临时变量的定义
        .replace(this.__label__('var'), m => {
          return this.matchVar(m)
        })
        // 解析普通变量/字段
        .replace(this.__label__('echo'), m => {
          return this.matchNormal(m)
        })
    )
  }

  // 解析extends标签
  parseExtends(str) {
    let matches = str.match(/^<!--{extends ([^\\{\\}\\(\\)]*?)}-->/)
    if (!matches) {
      str = str
        .replace(this.__label__('blockL'), '')
        .replace(this.__label__('blockR'), '')
    } else {
      let blocks = {}
      // 去除所有的extends标签, 只允许有出现1次
      str = str.replace(this.__label__('extends'), '').trim()
      str.replace(
        /<!--{block ([^\\{\\}\\(\\)]*?)}-->([\s\S]*?)<!--{\/block}-->/g,
        (m, flag, val) => {
          flag = flag.trim()
          blocks[flag] = val.trim()
        }
      )
      str = matches[1]
        .replace(/^['"]/, '')
        .replace(/['"]$/, '')
        .replace(/\.tpl$/, '') //去掉可能出现的自带的模板后缀

      str += '.tpl' //统一加上后缀

      str = this.__tpl__(str).replace(this.__label__('blockL'), (m, flag) => {
        flag = flag.trim()
        return blocks[flag] || ''
      })
      blocks = undefined
    }
    return str
  }

  //解析模板
  parse(str, data) {
    this.vars = `"use strict"; let __filters__ = f; `
    for (let i in data) {
      let tmp = JSON.stringify(data[i]) || ''
      this.vars += `let ${i} = ${tmp}; `
    }
    str = str
      .trim()
      .replace(/[\r\n\t]+/g, ' ') // 去掉所有的换行/制表
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')

    str = this.parseExtends(str)
    str = this.parseNormal(str)

    str = `${this.vars} let tpl=\`${str}\`; return tpl;`

    return new Function('f', str)(this.filters)
  }
}

module.exports = Tool
