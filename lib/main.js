/**
 * nodeJS 模板引擎(依赖doJS框架)
 * @authors yutent (yutent@doui.cc)
 * @date    2015-12-28 13:57:12
 *
 */
"use strict";

require('dojs-extend')
const Tool = require('./tool'),
    fs = require('fs'),
    path = require('path'),
    md5 = require('./md5');

class Smarty {

    constructor(conf){
        this.conf = {}
        if(!Object.empty(conf))
            this.conf = conf

        this.conf.cache = this.conf.hasOwnProperty('cache') ? this.conf.cache : true

        this.tool = new Tool(conf)
        this.data = {} //预定义的变量储存
        this.cache = {} //模块缓存
    }

    /**
     * 定义变量
     * @param {Str} key  变量名
     * @param {any} val 值
     */
    assign(key, val){
        key += ''
        if(!key)
            return this

        this.data[key] = val
        return this
    }


    /**
     * [render 模板渲染]
     * @param  {String} tpl  模板路径
     * @param  {String} uuid 唯一标识
     * @return {Promise} 返回一个Promise对象
     */
    render(tpl = '', uuid = ''){

        return new Promise((yes, no) => {

            if(!tpl)
                return no('argument[tpl] can not be empty')

            if(!/\.tpl$/.test(tpl))
                tpl += '.tpl'

            let cacheId = md5(tpl + uuid);

            if(this.conf.cache && this.cache[cacheId])
                return yes(this.cache[cacheId])

            if(!fs.existsSync(tpl))
                return no('Can not find template "' + tpl + '"')

            this.tool.config('path', path.parse(tpl).dir + '/')
            this.cache[cacheId] = fs.readFileSync(tpl) + ''

            try{
                this.cache[cacheId] = this.tool.parse(this.cache[cacheId], this.data)
                yes(this.cache[cacheId])
            }catch(err){
                no(err)
            }

        })
        
    }

}





module.exports = Smarty

