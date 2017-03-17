# 模板引擎
> 因为我原先是个PHPer，也一直喜欢smarty那个模板引擎，所以在nodeJS上，我也喜欢能有一款类似于smarty的的模板引擎，可惜我所知的几个引擎中，并没有smarty的理念，故自己开发了一款。
然而nodeJS并不是php，完全的模拟smarty又会失去nodeJS的味道，所以，我并不打算做nodeJS版的smarty，只是吸收了smarty的一些优秀的理念， 再结合nodeJS，开发了一套简单易用的模板引擎。
> **注：** 
1. `由于时间的原因，这款模板引擎并未完成设计中所有的功能(还差extends标签和插件功能未完成)`
2. `只支持.tpl后缀的模板文件， 在引用模板文件时该后缀可以省略不写。`



## API
> 模板引擎总共就2个对外的方法，简单到令人发指的地步。

### 1.assign(key, val)
- key `<String>`
- val `<String>` | `<Number>` | `<Object>` | `<Boolean>`

> 该方法用于声明一个变量，用于模板中访问和调用。
`key` 即为要声明的变量名称，须为字符串类型;
`val` 即为该变量的值，可以是常见的数据类型，不支持`Function`，`Class`等

```javascript

let view = new (require('dojs-template'))()

view.assign('foo', 'bar')
view.assign('man', {name: 'foo', age: 18})
view.assign('data', [{title: 'balbla', date: 'xxxx-xx'}, {title: 'balbla blabla..', date: 'yyyy-mm'}])
view.assign('readable', true)
view.assign('page', 20)
view.assign('phoneReg', /^1[34578]\d{9}$/)

```


### 2.render(tpl[, uuid])
- tpl `<String>`
- uuid `<String>` 可选

> 该方法用于渲染一个模板，返回值为一个 Promise对象;
> `tpl` 即为要渲染的模板的绝对路径，默认是`.tpl`后缀， 该后缀可以省略。
> `uuid` 是一个唯一标识，用于开启模板缓存，但又想页面渲染的时候，可以根据不同的情况渲染不同的内容。 

**注：** 该功能目前并未进行优化。


```javascript

let view = new (require('dojs-template'))()

view.assign('foo', 'bar')
view.render('/views/index.tpl')
    .then(html => {
        // todo... 
        // eg. response.end(html)
    }).catch(err => {
        // debug...
    })

```


## 引擎的配置
> 引擎在实例化的时候，支持作一些配置，目前只支持2个配置项：
- cache `<Boolean>`
该值，顾名思义，就是设置模板的缓存，默认是开启缓存的，意味着，在模板本身没有发生改变，或服务发生重启之前，引擎不会重新渲染，而都是从缓存中读取。
- delimiter `<Array>`
该值是用来设置模板的界定符，值为一个数组，默认值`['<!--{', '}-->']`，切勿设置为太常规的，如`['<', '>']`, `['{', '}']`，否则会解析出错。

```javascript
//关闭缓存功能
let view = new (require('dojs-template'))({cache: false})

//设置界定符为 '{{', '}}'，一般情况下，不建议修改这个
let view = new (require('dojs-template'))({delimiter: ['{{', '}}']})

```

这里提供了一份sublime的快捷键配置，可以快速插入该模板标签：
```javascript
{ "keys": ["ctrl+shift+["], "command": "insert_snippet", "args": {"contents": "<!--{${0}}-->"}, "context":
    [
        { "key": "setting.auto_match_enabled", "operator": "equal", "operand": true },
        { "key": "selection_empty", "operator": "equal", "operand": true, "match_all": true },
        { "key": "following_text", "operator": "regex_contains", "operand": "^(?:\t||\\)|]|\\}|>|$)", "match_all": true }
    ]
},
{ "keys": ["ctrl+shift+["], "command": "insert_snippet", "args": {"contents": "<!--{${0:$SELECTION}}-->"}, "context":
    [
        { "key": "setting.auto_match_enabled", "operator": "equal", "operand": true },
        { "key": "selection_empty", "operator": "equal", "operand": false, "match_all": true }
    ]
}

```


---

## 模板标签示例

### 1. include标签
> 该标签用于在模板中加载另外的模板文件，一般多用于，将公共模板单独拆分引用，以便于 修改一处，即可实现所有用到该公共模板的页面同时修改。
被引入的模板中，同样可以使用include标签，可以无限级引用。 不过一般为了可维护性， 不要太深层， 否则后期找起来，都痛苦。

> **注：** 
> `该标签不需要闭合`

```html
<!-- 
include标签，后接模板文件的路径(相对路径)，
模板名称可以不用引号括起来(推荐不写)，模板文件后缀也可以不写，如下面的例子
-->

<!--{include header}-->

<body>
    <!--{include 'nav.tpl'}-->
    <div class="main wrap">
        <!-- your code here -->
    </div>
    <!--{include friends.tpl}-->
</body>

<!--{include 'footer'}-->

```



### 2. each标签
> 该标签用于在模板中遍历数组或json对象。
> 使用语法为 `each item in obj`, 或 `each i item in obj`, 只有一个参数时，item即为遍历到的条目，有2个参数时，第1个是遍历的索引，第2个为该索引对应的条目值。具体可看下面的范例。
> **注：** `该标签必须闭合`

```javascript
view.assign('list', [{title: '标题1', date: '2017-01-01'}, {title: '标题2', date: '2017-01-02'}])
view.assign('article', {title: '标题1', date: '2017-01-01', content: '这是文章内容。。。blabla'})
view.assign('menu', [
    {
        name: '一级菜单1',
        sub: [
            {name: '子菜单1'},
            {name: '子菜单2'},
            {name: '子菜单3'},
            {name: '子菜单4'}
        ]
    },
    {
        name: '一级菜单2',
        sub: [
            {name: '子菜单21'},
            {name: '子菜单22'},
            {name: '子菜单23'},
            {name: '子菜单24'}
        ]
    }
])
```


```html
<body>
    <!-- 
    each标签支持多维数组， 但要注意变量不要重复使用，以免出现非预想的结果
    -->
    <div class="menu">
        <!--{each it in menu}-->
        <ul>
            <li class="name"><!--{=it.name}--></li>
            <li class="sub-name-box">
                <ul>
                    <!--{each sub in it.sub}-->
                    <li class="sub-name"><!--{=sub.name}--></li>
                    <!--{/each}-->
                </ul>
            </li>
        </ul>
        <!--{/each}-->
    </div>


    <!-- 
    纯数组的遍历，i对应的即是 索引值了，从0开始,
    但是一般输出到页面上时，都是从1开始排，这时候，有2种方式
    1. 使用普通的运算表达式, i-0+1, 这里的先减0，是为了把字符串 i 转为数字类型(因为模板引擎解析模板的时候，把数字类型转成了字符串类型，所以这里要作个小处理)
    2. 使用自增的写法，即 ++i; 这种方法简洁一点，但是会改变i本身的值，所以后面要用到i的时候，要注意一下此时的值。
    -->
    <ul class="list">
        <!--{each i item in article}-->
        <li>
            <span class="idx"><!--{=++i}--></span>
            <h3><!--{=item.title}--></h3>
            <span><!--{=item.date}--></span></li>
        <!--{/each}-->
    </ul>

    
    <!-- 
    each遍历json对象时，2个参数对应的便是 key和value
    -->
    <ul class="article">
        <!--{each k v in article}-->
        <li><!--{=k}-->: <!--{=v}--></li>
        <!--{/each}-->
    </ul>

</body>

```



### 3. if/else/elseif标签
> 该标签用于在模板中进行条件判断。
> 语法为 `if condition` 或 `elseif condition`
> **注：** `该标签必须闭合`


```html
<body>
    <!-- 依然以上面的为例, 偶数行 添加类 red -->
    <ul class="list">
        <!--{each i item in article}-->
        <li <!--{if i%2 === 0}-->class="red" <!--{/if}-->>
            <span class="idx"><!--{=++i}--></span>
            <h3><!--{=item.title}--></h3>
            <span><!--{=item.date}--></span>
        </li>
        <!--{/each}-->
    </ul>

    <!-- 偶数行加类red，否则加green -->
    <ul class="list">
        <!--{each i item in article}-->
        <li class="<!--{if i%2 === 0}--> red <!--{else}--> green <!--{/if}-->">
            <span class="idx"><!--{=++i}--></span>
            <h3><!--{=item.title}--></h3>
            <span><!--{=item.date}--></span>
        </li>
        <!--{/each}-->
    </ul>

    <!-- 首行加bold, red， 剩下的 偶数行加类red，否则加green -->
    <ul class="list">
        <!--{each i item in article}-->
        <li class="<!--{if i == 0}--> bold red <!--{elseif i%2 === 0}--> red <!--{else}--> green <!--{/if}-->">
            <span class="idx"><!--{=++i}--></span>
            <h3><!--{=item.title}--></h3>
            <span><!--{=item.date}--></span>
        </li>
        <!--{/each}-->
    </ul>

</body>
```



### 4. var标签
> 该标签用于在模板中声明一些变量，函数，用于对数据进一步的处理，理论上支持所有类型的声明定义，但不太建议在模板里定义太复杂的数据类型或方法，因为这不符合模板引擎"业务与模板分离"的理念。
> 语法为 `var key=val`

```javascript
view.assign('arr', [1,3,6])

```

```html
<body>
    <!--{var zhObj={1: '这是1', 3: '这是6', 6: '这是6'}}-->
    <!--{var cn=function(v){return obj[v]}}-->

    <!--{each i in arr}-->
        <p>i: <!--{=tt(i)}-->, zh: <!--{=cn(i)}--></p>
    <!--{/each}-->

</body>
```



### 5. =标签
> 该标签是最普通也是最常用的一个了，也就是用来输出一个变量的。这个标签的用法，上面也已经出现过太多了，这里就不多说什么了。
> 跟该有关的重点，请看下面的`过滤器`。
> 语法为 `=key`
> **注：**为了安全，该标签输出的文本内容，是被转义后的，转义的方式同PHP的htmlspecialchars函数




## 过滤器
> 过滤器，通俗的讲，其实也就是内置的一些方法，用来对输出的内容进行一些额外的处理。
> 语法为 `=key | filter:args`
> 过滤器名称与变量之间用 `|` 分隔，过滤器的参数用`:`分隔，类似于smarty。
> 引擎内置了5个常用的过滤器，后期会提供接口给开发人员自行增加.

### 1. html
> 该过滤器，用于将被转义后的文本，还原回html，具体何时用，看需求了。
> 该过滤器没有参数

```html
<body>
    <!--{var txt1='<span>这段文本没有使用过滤器</span>'}-->
    <!--{var txt2='<span>这段文本使用了html过滤器</span>'}-->
    
    <!-- 这里输出的结果是 &lt;span&gt;这段文本没有使用过滤器&lt;/span&gt; -->
    <!--{=txt1}-->

    <!-- 这里输出的结果将是一个正常的span节点-->
    <!--{=txt2 | html}-->

</body>
```


### 2. truncate
> 该过滤器用于截取字符串。
> 该过滤器可以2个参数， 截取长度(默认不截取)和拼接的字符(默认为`...`)

```html
<body>
    <!--{var txt='这一段很长很长很长的文本这一段很长很长很长的文本这一段很长很长很长的文本这一段很长很长很长的文本'}-->
    
    <!-- 这里输出的结果是 '这一段很长...' -->
    <!--{=txt | truncate:5}-->

    <!-- 这里输出的结果是 '这一段很长很长~~~' -->
    <!--{=txt | truncate:7:~~~}-->

</body>
```


### 3. lower
> 顾名思义，该过滤器用于把输出的文本，转换为小写

```html
<body>
    <!--{var txt='HELLO WORLD'}-->
    
    <!-- 这里输出的结果是 'hello world' -->
    <!--{=txt | lower}-->

</body>
```


### 4. upper
> 相应的，该过滤器用于将输出的文本转换为大写的



### 5. date
> 该过滤器用于对日期的格式化，支持对字符串，时间戳，日期对象
> 该过滤器，可以有一个参数，即定义转换的格式，语法与php的date函数一致(默认为 Y-m-d H:i:s)
> - Y 4位数年份
> - y 短格式的年份(不建议用了)
> - m 2位数份，01~12
> - n 月份(不会自动补0)，1-12
> - d 2位数日期， 01-31
> - j 日期(不会自动补0)，1-31
> - H 小时(24小时制，自动补0) 00-23
> - h 小时(12小时制，自动补0) 00-12
> - G 小时(24小时制, 不会自动补0) 0-23
> - g 小时(12小时制, 不会自动补0) 0-12
> - i 分钟(自动补0), 00-59
> - s 秒钟(自动补0), 00-59
> - W 当前是本年度第几周
> - w 当前是本月第几周
> - D 星期，英文缩写 Mon, Tues, Wed, Thur, Fri, Sat, Sun

```html
<body>
    <!--{var txt1='2017-01-12 23:33:33'}-->
    <!--{var txt2=1485167755953}-->
    
    <!-- 这里输出的结果是 2017/01/12 -->
    <!--{=txt1 | date:Y/m/d}-->


    <!-- 这里输出的结果是 2017-01-23 18:35:55 -->
    <!--{=txt2 | date}-->

    <!-- 这里输出的结果是 2017年01月23日 18点35分55秒 -->
    <!--{=txt2 | date:Y年m月d日 H点i分s秒}-->

</body>
```
