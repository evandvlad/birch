/**
 * Autor: Evstigneev Andrey
 * Date: 14.12.2015
 * Time: 1:25
 */

'use strict';

var assert = require('assert');

module.exports = {

    run : function(Birch){

        describe('examples', function(){

            it('ex 1', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= value}}</div>')({
                    value : 'test'
                }), '<div>test</div>');
            });

            it('ex 2', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= data.value }}</div>')({
                    data : {
                        value : 'test'
                    }
                }), '<div>test</div>');
            });

            it('ex 3', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= data[0] }}</div>')({
                    data : ['test']
                }), '<div>test</div>');
            });

            it('ex 4', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= data.0 }}</div>')({
                    data : ['test']
                }), '<div>test</div>');
            });

            it('ex 5', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= f() }}</div>')({
                    f : function(){
                        return 'test';
                    }
                }), '<div>test</div>');
            });

            it('ex 6', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= f(data.a, data.b, data.c, data.d) }}</div>')({
                    f : function(a, b, c, d){
                        return a + b + c + d;
                    },
                    data : {
                        a : 't',
                        b : 'e',
                        c : 's',
                        d : 't'
                    }
                }), '<div>test</div>');
            });

            it('ex 7', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= f()().value }}</div>')({
                    f : function(){
                        return function(){
                            return {value : 'test'};
                        };
                    }
                }), '<div>test</div>');
            });

            it('ex 8', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{= value}}')({
                    value : '&'
                }), '&');
            });

            it('ex 9', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{~ value}}')({
                    value : '&'
                }), '&amp;');
            });

            it('ex 10', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= value}}</div>')(), '<div></div>');
            });

            it('ex 11', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= value}}</div>')({
                    value : null
                }), '<div></div>');
            });

            it('ex 12', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{? f() }}ok{{/}}')({
                    f : function(){
                        return true;
                    }
                }), 'ok');
            });

            it('ex 13', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{? value }}{{!?}}error{{/}}')({
                    value : 0
                }), 'error');
            });

            it('ex 14', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{? value }}{{!?}}error{{/}}')({
                    value : 1
                }), '');
            });

            it('ex 15', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{^ items -> item, i }}{{= i }}.{{= item }} {{/}}', {trim : false})({
                    items : ['item-1', 'item-2']
                }), '0.item-1 1.item-2 ');
            });

            it('ex 16', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{^ items -> item }}{{= item }} {{/}}', {trim : false})({
                    items : ['item-1', 'item-2']
                }), 'item-1 item-2 ');
            });

            it('ex 17', function(){
                var birch = new Birch();

                assert.equal(birch.compile('{{= item }}{{^ items -> item }}{{= item }} {{/}}{{= item }}', {trim : false})({
                    items : ['item-1', 'item-2']
                }), 'item-1 item-2 ');
            });

            it('ex 18', function(){
                var birch = new Birch();

                var tpl = '' +
                    '{{? data }}' +
                        '{{? data.value }}' +
                            '{{= data.value }}' +
                        '{{!?}}' +
                            'no value' +
                        '{{/}}' +
                    '{{!?}}' +
                        'no data' +
                    '{{/}}',
                    cmpl = birch.compile(tpl);

                assert.equal(cmpl().trim(), 'no data');
                assert.equal(cmpl({data : {}}).trim(), 'no value');
                assert.equal(cmpl({data : {value : 'value'}}).trim(), 'value');
            });

            it('ex 19', function(){
                var birch = new Birch({trim : true});

                var tpl = '' +
                        '{{^ items -> values, i }}' +
                        '{{^ values -> value, j }}' +
                        '{{= i }}.{{= j }}. {{= value }}; ' +
                        '{{/}}' +
                        '{{/}}',
                    cmpl = birch.compile(tpl);

                assert.equal(cmpl({
                    items : [
                        ['a', 'b', 'c'],
                        ['X', 'Y'],
                        [8,2,123],
                        []
                    ]
                }), '0.0.a;0.1.b;0.2.c;1.0.X;1.1.Y;2.0.8;2.1.2;2.2.123;');
            });

            it('ex 20', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= f(g(h())) }}</div>')({
                    f : function(value){
                        return value;
                    },
                    g : function(value){
                        return value;
                    },
                    h : function(){
                        return 'test';
                    }
                }), '<div>test</div>');
            });

            it('ex 21', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= `test }}</div>')(), '<div>test</div>');
            });

            it('ex 22', function(){
                var birch = new Birch();

                assert.equal(birch.compile('<div>{{= f(`test) }}</div>')({
                    f : function(value){
                        return value;
                    }
                }), '<div>test</div>');
            });

            it('ex 23', function(){
                var birch = new Birch({
                    env : {
                        value : 'test'
                    }
                });

                assert.equal(birch.compile('<div>{{= @value }}</div>')(), '<div>test</div>');
            });

            it('ex 24', function(){
                var birch = new Birch({
                    env : {
                        f : function(){
                            return 'test';
                        }
                    }
                });

                assert.equal(birch.compile('<div>{{= @f() }}</div>')(), '<div>test</div>');
            });

            it('ex 25', function(){
                var birch = new Birch({
                    env : {
                        f : {
                            a :function(a, b){
                                return a + b;
                            },
                            b : function(v){
                                return v + 'e';
                            }
                        }
                    }
                });

                assert.equal(birch.compile('<div>{{= @f.a ( @f.b ( v ), `st ) }}</div>')({
                    v : 't'
                }), '<div>test</div>');
            });
        });
    }
};
