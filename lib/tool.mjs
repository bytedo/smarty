/**
 * 模板引擎预处理
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/18 13:46:19
 */

import path from 'path'
import fs from 'iofs'

export default class Tool {
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

    Object.assign(this.opt, opt)

    this.__REG__ = new RegExp(this.opt.ext + '$')

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
        if (isFinite(str)) {
          str = +str
        }
        return new Date(str).format(format)
      }
    }
  }

  __readFile__(file) {
    if (!fs.exists(file)) {
      throw new Error(`Can not find template "${file}"`)
    }

    return this.__fixed__(fs.cat(file).toString())
  }

  __fixed__(str) {
    return str
      .trim()
      .replace(/[\r\n\t]+/g, ' ') // 去掉所有的换行/制表
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
  }

  //生成正则
  __exp__(str) {
    return new RegExp(str, 'g')
  }

  //生成模板标签
  __label__(id) {
    var opt = this.opt
    var tag = opt.labels[id]
    return this.__exp__(opt.delimiter[0] + tag + opt.delimiter[1])
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
    if (!m || !/\sin\s/.test(m)) {
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
    if (!m) {
      return `\`; tpl += \``
    }

    return `\`; if (${m}){ tpl += \``
  }

  //解析条件语句
  matchElseIf(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'elseif\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (!m) {
      return `\`;} else { tpl += \``
    }

    return `\`; } else if (${m}){ tpl += \``
  }

  //解析变量定义
  matchVar(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'var\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')

    m = m.replace(begin, '').replace(end, '')

    m = m.trim()
    if (m && /=/.test(m)) {
      m = 'let ' + m
    }

    this.vars += ` ${m};`

    return `\`; tpl += \``
  }

  //解析include
  matchInclude(m) {
    let begin = this.__exp__('^' + this.opt.delimiter[0] + 'include\\s+')
    let end = this.__exp__(this.opt.delimiter[1] + '$')
    var tpl = ''

    m = m
      .replace(begin, '')
      .replace(end, '')
      .replace(/^['"]/, '')
      .replace(/['"]$/, '')
      .replace(this.__REG__, '') //去掉可能出现的自带的模板后缀

    m += this.opt.ext //统一加上后缀

    tpl = this.__readFile__(path.resolve(this.opt.path, m))
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
    let matches = str.match(/^<!--{extends ([^\\{\\}\\(\\)]*?)\s*?}-->/)
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
        .replace(this.__REG__, '') //去掉可能出现的自带的模板后缀

      str += this.opt.ext //统一加上后缀

      str = this.__readFile__(path.resolve(this.opt.path, str)).replace(
        this.__label__('blockL'),
        (m, flag) => {
          flag = flag.trim()
          return blocks[flag] || ''
        }
      )
    }
    return str
  }

  //解析模板
  parse(buf) {
    var str = this.__fixed__(buf.toString())
    str = this.parseExtends(str)
    str = this.parseNormal(str)
    return str
  }

  exec(str, data) {
    var vars = `"use strict"; let __filters__ = f; `
    var body = ''
    for (let i in data) {
      let tmp = JSON.stringify(data[i]) || ''
      vars += `let ${i} = ${tmp}; `
    }

    body = `${vars} let tpl=\`${str}\`; return tpl;`

    return new Function('f', body)(this.filters)
  }
}
