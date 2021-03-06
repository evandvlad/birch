[![Build Status](https://travis-ci.org/evandvlad/birch.svg)](https://travis-ci.org/evandvlad/birch)
[![Codacy Badge](https://api.codacy.com/project/badge/grade/d48371e18f8d4ee89a31eecc6605e2c0)](https://www.codacy.com/app/evandvlad/birch)
[![Codacy Badge](https://api.codacy.com/project/badge/coverage/d48371e18f8d4ee89a31eecc6605e2c0)](https://www.codacy.com/app/evandvlad/birch)

Birch - шаблонизатор с предварительной компиляцией шаблонов. В нем не используется вызовы new Function или eval (eval less), 
поэтому он в первую очередь предназначен для сред где данные конструкции запрещены или нежелательны. Также не предоставляется 
явный доступ к глобальному объекту.
   
#### Возможности ####
* Вывод переменных 
* Вывод свойств объектов или элементов массива
* Вывод результатов вызова методов с поддержкой передачи аргументов
* Экранированный вывод
* Условные выражения if/else с поддержкой вложенности
* Циклы по массивам с поддержкой уровня вложенности
* Возможность замены шаблона парсера
* Возможность задания объекта среды

#### Синтаксис ####

    PRINT_TOKEN = "="
    SAFE_PRINT_TOKEN = "~"
    IF_TOKEN = "?"
    ELSE_TOKEN = "!?"
    EACH_TOKEN = "^"
    END_TOKEN = "/"

    LETTER = Char | "$" | "_"
    IDENT = LETTER{LETTER | Digit}
    ATOM = "`" IDENT
    QIDENT = IDENT{PROP | FCALL}
    ENV_QNAME = "@" QIDENT
    PROP = "[" IDENT "]" | "." IDENT
    FCALL = "(" [QNAME {"," QNAME]} ")"
    QNAME = QIDENT | ATOM | ENV_QNAME

    PRINT = PRINT_TOKEN QNAME
    SAFE_PRINT = SAFE_PRINT_TOKEN QNAME
    IF = IF_TOKEN QNAME
    ELSE = ELSE_TOKEN
    EACH = EACH_TOKEN QNAME "->" IDENT ["," IDENT]
    END = END_TOKEN
    
Если операции ожидается значение, то операция должна отделяться от значения не менее чем одним пробелом.

По умолчанию, в инструкциях используются ограничители '{{' и '}}'
Настройки передаются вторым параметом в метод compile. 

По умолчанию:

    tag -> /\{{2}(.+?)\}{2}/ (шаблон инструкций)
    trim -> false (исключать ли пробелы между текстом и инструкциями).
    env -> {} (объект среды)

#### Работа с переменными, свойствами и методами ####

Передаваемый в скомпилируемую функцию объект данных (по умолчанию - пустой объект), является для шаблонов глобальным 
объектом именно в нем происходит поиск свойств и методов.
 
    var birch = new Birch();

    birch.compile('<div>{{= value}}</div>')({
        value : 'test'
    }); // <div>test</div>
    
    birch.compile('<div>{{= data.value }}</div>')({
        data : {
            value : 'test'
        }
    }); // <div>test</div> 
    
При работе с массивами допускается использовать как точечную, так и скобочную нотацию для доступа к элементам.

    var birch = new Birch();

    birch.compile('<div>{{= data[0] }}</div>')({
        data : ['test']
    }); // <div>test</div> 
    
    birch.compile('<div>{{= data.0 }}</div>')({
        data : ['test']
    }); // <div>test</div>
    
Методы могут принимать произвольное количество аргументов, В качестве аргументов могут быть свойства объектов или элементы 
массивов, на любом уровне вложенности, поддерживаются вложенные вызовы. 

    var birch = new Birch();

    birch.compile('<div>{{= f() }}</div>')({
        f : function(){
            return 'test';
        }
    }); // <div>test</div>
    
    birch.compile('<div>{{= f(data.a, data.b, data.c, data.d) }}</div>')({
        f : function(a, b, c, d){
            return a + b + c + d;
        },
        data : {
            a : 't',
            b : 'e',
            c : 's',
            d : 't'
        }
    }); // <div>test</div>
    
    birch.compile('<div>{{= f(g(h())) }}</div>')({
        f : function(value){
            return value;
        },
        g : function(value){
            return value;
        },
        h : function(){
            return 'test';
        }
    }); // <div>test</div>
    
Если метод возвращает функцию, она может быть вызвана и возвращенное ею значение обработано.
    
    var birch = new Birch();

    birch.compile('<div>{{= f()().value }}</div>')({
        f : function(){
            return function(){
                return {value : 'test'};
            }
        }
    }); // <div>test</div>
    
В качестве параметров методов и выводимых результатов можно использовать атомы. Атом начинается со знака '`', имеет
те же ограничения в наименовании что и переменная и представляет собой строковое значение самого себя. 

    var birch = new Birch();

    birch.compile('<div>{{= `test }}</div>')(); // <div>test</div>
    
    birch.compile('<div>{{= f(`test) }}</div>')({
        f : function(value){
            return value;
        }
    }); // <div>test</div>
    
Есть возможность задания объекта среды. Объект среды задается в качестве параметра env настроек компиляции. Вызов методов и
получение свойств от объекта среды должно начинаться с символа '@'.

    var birch = new Birch({
        env : {
            value : 'test',
            f : function(){
                return 'test';
            }
        }
    });

    birch.compile('<div>{{= @value }}</div>')(); // <div>test</div>
    
    birch.compile('<div>{{= @f() }}</div>')(); // <div>test</div>
    
Поддерживаются и сложные комбинации.
    
    var birch = new Birch({
        env : {
            f : {
                a : function(a, b){
                    return a + b;
                },
                b : function(v){
                    return v + 'e';
                }
            }
        }
    });

    birch.compile('<div>{{= @f.a ( @f.b ( v ), `st ) }}</div>')({
        v : 't'
    }); // <div>test</div>
    
#### Вывод данных ####

Реализовано два типа вывода данных, простой, определяющийся токеном '=' 

    {{= value }}
    
    var birch = new Birch();

    birch.compile('{{= value}}')({
        value : '&'
    }); // &
    
и экранированный, определяющийся токеном '~'

    {{~ value }}
    
    var birch = new Birch();

    birch.compile('{{~ value}}')({
        value : '&'
    }); // &amp;
    
Если значение null или undefined, возвращается пустая строка

    var birch = new Birch();

    birch.compile('<div>{{= value}}</div>')(); // <div></div>
    
    birch.compile('<div>{{= value}}</div>')({
        value : null
    }); // <div></div>
    
#### Условные выражения ####

Обязательными для условных выражений являются операции if ('?') и end ('/'), else ('!?') является опциональным. 
Инструкции end и else являются пустыми, инструкция if ожидает значение или результат вызова метода. Тип значения
будет приводиться к значению boolean. 

    var birch = new Birch();

    birch.compile('{{? f() }}ok{{/}}')({
        f : function(){
            return true;
        }
    }); // ok
    
Тело цикла if может быть пустым, т.е. инструкции if и else могут следовать друг за другом. 
    
    var birch = new Birch();

    birch.compile('{{? value }}{{!?}}error{{/}}')({
        value : 0
    }); // error
    
    birch.compile('{{? value }}{{!?}}error{{/}}')({
        value : 1
    }); // ''
    
Условные выражения могут быть вложены друг в друга.

    {{? data }}
        {{? data.value }}
            {{= data.value }}
        {{!?}}
            no value
        {{/}}
    {{!?}}
        no data
    {{/}}
 
#### Циклы ####

Тело цикла ограничивается инструкциями each - '^' и end - '/'.
 
    var birch = new Birch();

    birch.compile('{{^ items -> item, i }}{{= i }}.{{= item }} {{/}}')({
        items : ['item-1', 'item-2']
    }); // 0.item-1 1.item-2
    
В инструции each необходимо задать элемент подлежащий итерации и через разделить '->' значение текущей итерации и индекс, 
значение является обязательным, индекс - нет. 

    var birch = new Birch();

    birch.compile('{{^ items -> item }}{{= item }} {{/}}')({
        items : ['item-1', 'item-2']
    }); // item-1 item-2
    
Внутри блока, на каждом шаге итерации создается новый scope путем расширения текущего объекта данных.

    var birch = new Birch();

    birch.compile('{{= item }}{{^ items -> item }}{{= item }} {{/}}{{= item }}')({
        items : ['item-1', 'item-2']
    }); // item-1 item-2
    
Циклы могут быть вложены друг в друга.

    {{^ items -> values, i }}
        {{^ values -> value, j }}
            {{= i }}.{{= j }}. {{= value }};
        {{/}}
    {{/}}
