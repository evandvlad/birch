/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 1:28
 */

'use strict';

var assert = require('assert');

module.exports = {

    run : function(birch){

        describe('birch', function(){

            describe('common', function(){

                it('empty instruction', function(){
                    assert.equal(birch.compile('<div>')({}), '<div>');
                });

                it('exception if token was not found', function(){
                    assert.throws(function(){
                        birch.compile('{{=!==}}')({});
                    });
                });

                it('exception if incorrect operation', function(){
                    assert.throws(function(){
                        birch.compile('{{@ a }}')({});
                    });
                });

                it('ignore empty scope', function(){
                    assert.equal(birch.compile('test')(), 'test');
                });

                it('not trim spaces in text', function(){
                    assert.equal(birch.compile('test {{= delim }} ok')({delim : '-'}), 'test - ok');
                });

                it('change tag pattern', function(){
                    assert.equal(birch.compile('<%= value %><%= value %>', {tag : /<%(.+?)%>/})({
                        value : 'test'
                    }), 'testtest');
                });

                it('don\'t trim', function(){
                    assert.equal(birch.compile('{{= value }} {{= value }} {{= value}}', {trim : false})({
                        value: 'test'
                    }), 'test test test');
                });
            });

            describe('env', function(){

                it('empty env prop', function(){
                    assert.equal(birch.compile('{{= @value }}')(), '');
                });

                it('env prop', function(){
                    assert.equal(birch.compile('{{= @value }}', {
                        env : {value : 'test'}
                    })(), 'test');
                });

                it('env nested prop', function(){
                    assert.equal(birch.compile('{{= @a.b[0] }}', {
                        env : {a : {b : ['test']}}
                    })(), 'test');
                });

                it('env method', function(){
                    assert.equal(birch.compile('{{= @f() }}', {
                        env : {
                            f : function(){
                                return 'test';
                            }
                        }
                    })(), 'test');
                });

                it('env method with arguments', function(){
                    assert.equal(birch.compile('{{= @f(`te, v) }}', {
                        env : {
                            f : function(a, b){
                                return a + b;
                            }
                        }
                    })({
                        v : 'st'
                    }), 'test');
                });

                it('env method with env arguments', function(){
                    assert.equal(birch.compile('{{= @f( @g (@v), v) }}', {
                        env : {
                            f : function(a, b){
                                return a + b;
                            },
                            g : function(a){
                                return a + 'e';
                            },
                            v : 't'
                        }
                    })({
                        v : 'st'
                    }), 'test');
                });

                it('check context', function(){
                    assert.equal(birch.compile('{{= @f() }}', {
                        env : {
                            f : function(){
                                return this.v;
                            },
                            v : 'test'
                        }
                    })(), 'test');
                });

                it('check nested context', function(){
                    assert.equal(birch.compile('{{= @f().a() }}', {
                        env : {
                            f : function(){
                                return {
                                    v : 'test',
                                    a : function(){
                                        return this.v;
                                    }
                                };
                            }
                        }
                    })(), 'test');
                });

            });

            describe('print', function(){

                it('empty instruction exception', function(){
                    assert.throws(function(){
                        birch.compile('{{=}}')({});
                    });
                });

                it('atom', function(){
                    assert.equal(birch.compile('{{= `test }}')(), 'test');
                });

                it('simple property', function(){
                    assert.equal(birch.compile('{{= value}}{{= value }}')({
                        value : 'test'
                    }), 'testtest');
                });

                it('empty string instead of undefined value', function(){
                    assert.equal(birch.compile('{{= value }}')({}), '');
                });

                it('empty string instead of null value', function(){
                    assert.equal(birch.compile('{{= value}}')({value : null}), '');
                });

                it('array item', function(){
                    assert.equal(birch.compile('{{= value[0] }}-{{= value[1]}}')({value : [1,2]}), '1-2');
                });

                it('array item with dot syntax', function(){
                    assert.equal(birch.compile('{{= value.0 }}-{{= value.1}}')({value : [1,2]}), '1-2');
                });

                it('object property', function(){
                    assert.equal(birch.compile('{{= value[a] }}-{{= value.b}}')({value : {a : 1, b : 2}}), '1-2');
                });

                it('calling method', function(){
                    assert.equal(birch.compile('{{= value() }}')({value : function(){
                        return 'test';
                    }}), 'test');
                });

                it('calling method with argument', function(){
                    assert.equal(birch.compile('{{= f (v) }}')({
                        f : function(v){
                            return v;
                        },
                        v : 'test'
                    }), 'test');
                });

                it('calling method with arguments', function(){
                    assert.equal(birch.compile('{{= f(v1, v2, v3) }}')({
                        f : function(v1, v2, v3){
                            return v1 + v2 + v3;
                        },
                        v1 : 'test',
                        v2 : ' - ',
                        v3 : 'ok'
                    }), 'test - ok');
                });

                it('calling method with atom arguments', function(){
                    assert.equal(birch.compile('{{= f(`test, `ok) }}')({
                        f : function(v1, v2){
                            return v1 + ' - ' + v2;
                        }
                    }), 'test - ok');
                });

                it('calling method with complex arguments', function(){
                    assert.equal(birch.compile('{{= f( d[0].a, d[1].b[0], d[2][0] ) }}')({
                        f : function(v1, v2, v3){
                            return v1 + v2 + v3;
                        },
                        d : [
                            {a : 'test'},
                            {b : [' - ']},
                            ['ok']
                        ]
                    }), 'test - ok');
                });

                it('check context', function(){
                    assert.equal(birch.compile('{{= f() }}')({
                        f : function(){
                            return this.v;
                        },
                        v : 'test'
                    }), 'test');
                });

                it('check nested context', function(){
                    assert.equal(birch.compile('{{= f().a() }}')({
                        f : function(){
                            return {
                                v : 'test',
                                a : function(){
                                    return this.v;
                                }
                            };
                        }
                    }), 'test');
                });

                it('print value with curly brackets', function(){
                    assert.equal(birch.compile('<div>{{= test }}{{= test }}</div>')({
                        test : "{{}}"
                    }), '<div>{{}}{{}}</div>');
                });

                it('long chain', function(){
                    assert.equal(birch.compile('{{= value.a[1]()().d().e[0] }}')({value : {
                        a : [1, function(){
                            return function(){
                                return {
                                    d : function(){
                                        return {
                                            e : ['test']
                                        };
                                    }
                                };
                            };
                        }
                        ]
                    }}), 'test');
                });

                it('nested calling', function(){
                    assert.equal(birch.compile('{{= f(g(), h())}}')({
                        f : function(a, b){
                            return a + b;
                        },
                        g : function(){
                            return 'te';
                        },
                        h : function(){
                            return 'st';
                        }
                    }), 'test');
                });

                it('nested calling chains', function(){
                    assert.equal(birch.compile('{{= f(g()(), h()())() }}')({
                        f : function(a, b){
                            return function(){
                                return a + b;
                            };
                        },
                        g : function(){
                            return function(){
                                return 'te';
                            };
                        },
                        h : function(){
                            return function(){
                                return 'st';
                            };
                        }
                    }), 'test');
                });

                it('deep nested calling', function(){
                    assert.equal(birch.compile('{{= f(g(h(`test)))}}')({
                        f : function(a){
                            return a;
                        },
                        g : function(v){
                            return '[' + v + ']';
                        },
                        h : function(v){
                            return v;
                        }
                    }), '[test]');
                });
            });

            describe('safe print', function(){

                it('empty instruction exception', function(){
                    assert.throws(function(){
                        birch.compile('{{~}}')({});
                    });
                });

                it('escape', function(){
                    assert.equal(birch.compile('{{~ value }}')({
                        value : '<>"\'/&'
                    }), '&lt;&gt;&quot;&#39;&#x2F;&amp;');
                });
            });

            describe('conditions', function(){

                it('simple if', function(){
                    var tmpl = '{{? test }}true{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        test : true
                    }), 'true');

                    assert.equal(birch.compile(tmpl)({
                        test : false
                    }), '');
                });

                it('to true values coercion', function(){
                    var tmpl = '{{? test }}true{{!?}}{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        test : 1
                    }), 'true');

                    assert.equal(birch.compile(tmpl)({
                        test : '0'
                    }), 'true');
                });

                it('simple else', function(){
                    var tmpl = '{{? test(v) }}{{!?}}false{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        test : function(a){return a;},
                        v : false
                    }), 'false');

                    assert.equal(birch.compile(tmpl)({
                        test : function(a){return a;},
                        v : true
                    }), '');
                });

                it('to false values coercion', function(){
                    var tmpl = '{{? test }}{{!?}}false{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        test : 0
                    }), 'false');

                    assert.equal(birch.compile(tmpl)({
                        test : NaN
                    }), 'false');

                    assert.equal(birch.compile(tmpl)(), 'false');
                });

                it('if/else', function(){
                    var tmpl = '{{? value.test() }}ok{{!?}}error{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        value : {test : function(){return true;}}
                    }), 'ok');

                    assert.equal(birch.compile(tmpl)({
                        value : {test : function(){return false;}}
                    }), 'error');
                });

                it('nested if', function(){
                    var tmpl = '' +
                        '{{? c1 }}' +
                        '{{? c2 }}v1 v2 ' +
                        '{{/}}' +
                        '{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : true
                    }), 'v1 v2 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : false
                    }), '');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : true
                    }), '');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : false
                    }), '');
                });

                it('nested if 2', function(){
                    var tmpl = '' +
                        '{{? c1 }}v1 ' +
                        '{{? c2 }}v2 ' +
                        '{{/}}' +
                        '{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : true
                    }), 'v1 v2 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : false
                    }), 'v1 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : true
                    }), '');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : false
                    }), '');
                });

                it('nested if/else', function(){
                    var tmpl = '' +
                        '{{? c1 }}v1 ' +
                        '{{? c2 }}v2 ' +
                        '{{!?}}!v2 ' +
                        '{{/}}' +
                        '{{!?}}!v1 ' +
                        '{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : true
                    }), 'v1 v2 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : true,
                        c2 : false
                    }), 'v1 !v2 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : true
                    }), '!v1 ');

                    assert.equal(birch.compile(tmpl)({
                        c1 : false,
                        c2 : false
                    }), '!v1 ');
                });
            });

            describe('iterations', function(){

                it('iteration count', function(){
                    var tmpl = '{{^ arr -> value, i }}a{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        arr : [1,2,3]
                    }), 'aaa');

                    assert.equal(birch.compile(tmpl)({
                        arr : []
                    }), '');
                });

                it('iteration count without index ident', function(){
                    var tmpl = '{{^ arr->value}}a{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        arr : [1,2,3]
                    }), 'aaa');

                    assert.equal(birch.compile(tmpl)({
                        arr : []
                    }), '');
                });

                it('iteration with value & index data', function(){
                    var tmpl = '{{^ arr->value, index }}{{= index }} - {{= value }}; {{/}}';

                    assert.equal(birch.compile(tmpl)({
                        arr : [1,2,3]
                    }), '0 - 1; 1 - 2; 2 - 3; ');
                });

                it('iteration only with value', function(){
                    var tmpl = '{{^ arr->value }}{{= index }} - {{= value }}; {{/}}';

                    assert.equal(birch.compile(tmpl)({
                        arr : [1,2,3]
                    }), ' - 1;  - 2;  - 3; ');
                });

                it('shadow data value', function(){
                    var tmpl = 'global-{{= value }}{{^ arr->value }};local-{{= value }}{{/}};global-{{= value}}';

                    assert.equal(birch.compile(tmpl)({
                        arr : [1,2,3],
                        value : 'global'
                    }), 'global-global;local-1;local-2;local-3;global-global');
                });

                it('nested iteration', function(){
                    var tmpl = '{{^ items -> itms }}{{^ itms -> value}}{{= value }}; {{/}}{{/}}';

                    assert.equal(birch.compile(tmpl)({
                        items : [
                            ['a', 'b'],
                            ['c'],
                            ['d', 'e', 'f', 'g'],
                            [],
                            ['h']
                        ]
                    }), 'a; b; c; d; e; f; g; h; ');
                });
            });
        });
    }
};
