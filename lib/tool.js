/**
 * 模板引擎预处理，对dojs框架有依赖
 * @authors yutent (yutent@doui.cc)
 * @date    2016-01-02 21:26:49
 *
 */

"use strict";

let fs = require('fs')

class Tool {

    constructor(conf){
        this.conf = {
            delimiter: ['<!--{', '}-->'], //模板界定符
            labels:{  //支持的标签类型
                inc: 'include([^\\{\\}\\(\\)]*?)', //引入其他文件 
                each: 'each([^\\{\\}\\(\\)]*?)', //each循环开始 
                done: '/each', //each循环结束 
                if: 'if([^\\{\\}\\/]*?)', //if开始 
                elif: 'elseif([^\\{\\}\\/]*?)', //elseif开始 
                else: 'else', //else开始 
                fi: '/if', //if结束 
                var: 'var([\\s\\S])*?', //定义变量 
                echo: '=([^\\{\\}]*?)', //普通变量 
            }
        }

        this.conf = this.conf.merge(conf)

        //过滤器
        this.filters = {
            html: function(str = ''){
                str += ''
                return str.tohtml()
            },
            truncate: function(str, len = '', truncation = '...'){
                str += ''
                //防止模板里参数加了引号导致异常
                len = len.replace(/['"]/g, '') - 0
                if(str.length <= len || len < 1)
                    return str

                //去除参数里多余的引号
                truncation = truncation.replace(/^['"]/, '').replace(/['"]$/, '')

                return str.slice(0, len) + truncation
            },
            lower: function(str){
                str += ''
                return str.toLowerCase()
            },
            upper: function(str){
                str += ''
                return str.toUpperCase()
            },
            date: function(str, format = ''){
                //去除参数里多余的引号
                format = format.replace(/^['"]/, '').replace(/['"]$/, '')
                return gmdate(format, str)
            }

        }

    }

    //设置 配置信息
    config(key, val){
        key += ''
        if(empty(key) || empty(val))
            return
        this.conf[key] = val
    }

    //生成正则
    exp(str){
        return new RegExp(str, 'g')
    }

    //生成模板标签
    label(id){
        let conf = this.conf
        let tag = conf.labels[id || 'inc']
        return this.exp(conf.delimiter[0] + tag + conf.delimiter[1])
    }

    //解析普通字段
    matchNormal(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + '[=\\s]?')
        let end = this.exp(this.conf.delimiter[1] + '$')

        m = m.replace(begin, '')
            .replace(end, '')
            .replace(/\|\|/g, "\t")

        let matches = m.split('|')
        let filter = matches.length == 1 ? '' : matches[1].trim()
        let txt = matches[0].replace(/\t/g, '||').trim()

        // 默认过滤HTML标签
        txt = txt.htmlspecialchars()

        if(filter){

            let args = filter.split(':')
            filter = args.splice(0, 1, txt) + ''
            if(filter === 'date' && args.length > 2){
                let tmp = args.splice(0, 1)
                tmp.push(args.join(':'))
                args = tmp
                tmp = null
            }
        
            if(this.filters.hasOwnProperty(filter)){
                args = args.map((it, i) => {
                    if(i === 0)
                        return it
                    return `'${it}'`
                })
                txt = `do_fn.${filter}(${args.join(', ')})`
            }
            
        }
        return `\` + (${txt}); tpl += \``
    }

    //解析each循环
    matchFor(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + 'each\\s+')
        let end = this.exp(this.conf.delimiter[1] + '$')

        m = m.replace(begin, '')
            .replace(end, '')

        m = m.trim()
        if(empty(m) || !/\sin\s/.test(m))
            return new Error('Wrong each loop')

        let each = 'for (let '
        let ms = m.split(' in ')
        let mi = ms[0].trim().split(' ')
        let mf = ms[1].trim() //要遍历的对象

        if(mi.length === 1){
            each += `d_idx in ${mf}) { let ${mi[0]} = ${mf}[d_idx]; tpl += \``;
        }else{
            each += `${mi[0]} in ${mf}) { let ${mi[1]} = ${mf}[${mi[0]}]; tpl += \``
        }

        return `\`; ${each}`
    }

    //解析条件语句
    matchIf(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + 'if\\s+')
        let end = this.exp(this.conf.delimiter[1] + '$')

        m = m.replace(begin, '')
            .replace(end, '')

        m = m.trim()
        if(empty(m))
            return `\`; tpl += \``

        return `\`; if (${m}){ tpl += \``
    }

    //解析条件语句
    matchElseIf(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + 'elseif\\s+')
        let end = this.exp(this.conf.delimiter[1] + '$')

        m = m.replace(begin, '')
            .replace(end, '')

        m = m.trim()
        if(empty(m))
            return `\`;} else { tpl += \``

        return `\`; } else if (${m}){ tpl += \``
    }

    //解析变量定义
    matchVar(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + 'var\\s+')
        let end = this.exp(this.conf.delimiter[1] + '$')



        m = m.replace(begin, '')
            .replace(end, '')
        
        m = m.trim()
        if(!empty(m) || /=/.test(m))
            m = 'let ' + m

        this.vars += ` ${m};`

        return `\`; tpl += \``
    }

    //解析include
    matchInclude(m){
        let begin = this.exp('^' + this.conf.delimiter[0] + 'include\\s+')
        let end = this.exp(this.conf.delimiter[1] + '$')

        m = m.replace(begin, '')
            .replace(end, '')
            .replace(/^['"]/, '').replace(/['"]$/, '')
            .replace(/\.tpl$/, '') //去掉可能出现的自带的模板后缀

        m += '.tpl' //统一加上后缀

        if(!fs.existsSync(this.conf.path + m))
            return new Error('Can not find template "' + m + '"')

        let tpl = fs.readFileSync(this.conf.path + m) + ''
        //递归解析include
        tpl = tpl.replace(/[\r\n\t]+/g, ' ') //去掉所有的换行/制表
                .replace(/\\/g, '\\\\')
                .replace(this.label(0), m1 => {
                    return this.matchInclude(m1)
                })

        return tpl
    }


    //解析模板
    parse(str, data){

        this.vars = `"use strict"; let do_fn = f; `
        for(let i in data){
            let tmp = JSON.stringify(data[i]) || ''
            this.vars += `let ${i} = ${tmp}; `
        }

        str = str.replace(/[\r\n\t]+/g, ' ') //去掉所有的换行/制表
                .replace(/\\/g, '\\\\')
                .replace(/`/g, '\\`')
                //解析include
                .replace(this.label('inc'), m => {
                    return this.matchInclude(m)
                })
                //解析each循环
                .replace(this.label('each'), m => {
                    return this.matchFor(m)
                })
                //解析循环结束标识
                .replace(this.label('done'), '\` } tpl += \`')
                //解析 if条件
                .replace(this.label('if'), m => {
                    return this.matchIf(m)
                })
                .replace(this.label('elif'), m => {
                    return this.matchElseIf(m)
                })
                // parse the else
                .replace(this.label('else'), '\`; } else { tpl += \`')
                //解析if条件结束标识
                .replace(this.label('fi'), '\`; } tpl += \`')
                //解析临时变量的定义
                .replace(this.label('var'), m => {
                    return this.matchVar(m)
                })
                //解析普通变量/字段
                .replace(this.label('echo'), m => {
                    return this.matchNormal(m)
                })

        str = `${this.vars} let tpl=\`${str}\`; return tpl;`

        return (new Function('f', str))(this.filters)
    }

}


module.exports = Tool