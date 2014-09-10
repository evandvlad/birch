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

#### Производительность ####
[http://jsperf.com/template-engines-performance-compiling-rendering/3](http://jsperf.com/template-engines-performance-compiling-rendering/3)

#### Синктаксис ####

    PRINT_TOKEN = "="
    SAFE_PRINT_TOKEN = "~"
    IF_TOKEN = "?"
    ELSE_TOKEN = "!?"
    EACH_TOKEN = "^"
    END_TOKEN = "/"

    IDENT = Char{Char | Digit | "_"}
    ATOM = "`" IDENT
    PROP = "[" IDENT "]" | "." IDENT
    FCALL = "(" [QNAME {"," QNAME] ")"
    QNAME = IDENT{PROP | FCALL} | ATOM

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
    trim -> true (исключать ли пробелы между текстом и инструкциями).

#### Работа с переменными, свойствами и методами ####

Передаваемый в скомпилируемую функцию объект данных (по умолчанию - пустой объект), является для шаблонов глобальный 
объектом именно в нем происходит поиск свойств и методов.
 
    birch.compile('<div>{{= value}}</div>')({
        value : 'test'
    }); // <div>test</div>
    
    birch.compile('<div>{{= data.value }}</div>')({
        data : {
            value : 'test'
        }
    }); // <div>test</div> 
    
При работе с массивами допускается использовать как точечную, так и скобочную нотацию для доступа к элементам.

    birch.compile('<div>{{= data[0] }}</div>')({
        data : ['test']
    }); // <div>test</div> 
    
    birch.compile('<div>{{= data.0 }}</div>')({
        data : ['test']
    }); // <div>test</div>
    
Методы могут принимать произвольное количество аргументов, В качестве аргументов могут быть свойства объектов или элементы 
массивов, на любом уровне вложенности, поддерживаются вложенные вызовы. 

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
    
    birch.compile('<div>{{= f()().value }}</div>')({
        f : function(){
            return function(){
                return {value : 'test'};
            }
        }
    }); // <div>test</div>
    
В качестве параметров методов и выводимых результатов можно использовать атомы. Атом начинается со знака '`', имеет
те же ограничения в наименовании что и переменная и представляется собой строковое значение самого себя. 

    birch.compile('<div>{{= `test }}</div>')(); // <div>test</div>
    
    birch.compile('<div>{{= f(`test) }}</div>')({
        f : function(value){
            return value;
        }
    }); // <div>test</div>
    
#### Вывод данных ####

Реализовано два типа вывода данных, простой, определяющийся токеном '=' 

    {{= value }}
    
    birch.compile('{{= value}}')({
        value : '&'
    }); // &
    
и экранированный, определяющийся токеном '~'

    {{~ value }}
    
    birch.compile('{{~ value}}')({
        value : '&'
    }); // &amp;
    
Если значение null или undefined, возвращается пустая строка

    birch.compile('<div>{{= value}}</div>')(); // <div></div>
    
    birch.compile('<div>{{= value}}</div>')({
        value : null
    }); // <div></div>
    
#### Условные выражения ####

Обязательными для условных выражений являются операции if ('?') и end ('/'), else ('!?') является опциональным. 
Инструкции end и else являются пустыми, инструкция if ожидает значение или результат вызова метода. Тип значения
будет приводиться к значению boolean. 

    birch.compile('{{? f() }}ok{{/}}')({
        f : function(){
            return true;
        }
    }); // ok
    
Тело цикла if может быть пустым, т.е. инструкции if и else могут следовать друг за другом. 
    
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
 
    birch.compile('{{^ items -> item, i }}{{= i }}.{{= item }} {{/}}', {trim : false})({
        items : ['item-1', 'item-2']
    }); // 0.item-1 1.item-2
    
В инструции each необходимо задать элемент подлежащий итерации и через разделить '->' значение текущей итерации и индекс, 
значение является обязательным, индекс - нет. 

    birch.compile('{{^ items -> item }}{{= item }} {{/}}', {trim : false})({
        items : ['item-1', 'item-2']
    }); // item-1 item-2
    
Внутри блока, на каждом шаге итерации создается новый scope путем расширения текущего объекта данных.

    birch.compile('{{= item }}{{^ items -> item }}{{= item }} {{/}}{{= item }}', {trim : false})({
        items : ['item-1', 'item-2']
    }); // item-1 item-2
    
Циклы могут быть вложены друг в друга.

    {{^ items -> values, i }}
        {{^ values -> value, j }}
            {{= i }}.{{= j }}. {{= value }};
        {{/^}}
    {{/^}}