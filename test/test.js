/**
 * Autor: Evstigneev Andrey
 * Date: 27.08.2014
 * Time: 22:27
 */

var assert = require("assert"),
    birch = require('../birch.js');

describe('birch', function(){


    it('typeof result', function(){
        assert.equal(typeof birch.compile(''), 'function');
    });

    it('print simple var', function(){
        assert.equal(birch.compile('<div>{{= test }}</div>')({
            test : 'my test'
        }), '<div>my test</div>');
    });

    it('print complex var', function(){
        assert.equal(birch.compile('<div>{{= test.t.e }}</div>')({
            test : {t : {e : 'my test'}}
        }), '<div>my test</div>');
    });

    it('print complex var with array prop', function(){
        assert.equal(birch.compile('<div>{{= test.t.0 }}</div>')({
            test : {t : ['my test']}
        }), '<div>my test</div>');
    });

    it('print complex var with square brackets', function(){
        assert.equal(birch.compile('<div>{{= test[t][0] }}</div>')({
            test : {t : ['my test']}
        }), '<div>my test</div>');
    });

    it('print empty string if var is incorrect', function(){
        assert.equal(birch.compile('<div>{{= test[t][0] }}</div>')({
            test : 'incorrect'
        }), '<div></div>');
    });

    it('print empty string if var is undefined', function(){
        assert.equal(birch.compile('<div>{{= test }}</div>')({}), '<div></div>');
    });

    it('print empty string if var is null', function(){
        assert.equal(birch.compile('<div>{{= test }}</div>')({
            test : null
        }), '<div></div>');
    });

    it('print some eq vars', function(){
        assert.equal(birch.compile('<div>{{= test.t }} {{= test.t }} {{= test.t }}</div>')({
            test : {t : 't'}
        }), '<div>t t t</div>');
    });

    it('print with exotic property name', function(){
        assert.equal(birch.compile('<div>{{= test[property - ###] }}</div>')({
            'test' : {"property - ###" : 'test'}
        }), '<div>test</div>');
    });

    it('print value with curly brackets', function(){
        assert.equal(birch.compile('<div>{{= test }} {{= test }}</div>')({
            'test' : "{{}}"
        }), '<div>{{}} {{}}</div>');
    });

    it('print method call', function(){
        assert.equal(birch.compile('<div>{{= test() }} {{= test() }}</div>')({
            'test' : function(){
                return 'ok';
            }
        }), '<div>ok ok</div>');
    });

    it('print method call in chain', function(){
        assert.equal(birch.compile('<div>{{= test()().inner()[0] }} {{= m[0]().data }}</div>')({
            'test' : function(){
                return function(){
                    return {
                        inner : function(){
                            return ['ok'];
                        }
                    };
                };
            },
            m : [function(){return {data : 'ok'}}]
        }), '<div>ok ok</div>');
    });

    it('safe print', function(){
        assert.equal(birch.compile('string {{~ v }}')({
            v : '& another <i>"string"\'</i>'
        }), 'string &amp; another &lt;i&gt;&quot;string&quot;&#39;&lt;&#x2F;i&gt;');
    });

    it('if true prop', function(){
        assert.equal(birch.compile('{{? test }}true{{/?}}')({
            test : true
        }), 'true');
    });

    it('if true method', function(){
        assert.equal(birch.compile('{{? test.a() }}true{{/?}}')({
            test : {
                a : function(){
                    return true;
                }
            }
        }), 'true');
    });

    it('if value to true', function(){
        assert.equal(birch.compile('{{? test.a() }}true{{/?}}')({
            test : {
                a : function(){
                    return 'some string';
                }
            }
        }), 'true');
    });

    it('if false', function(){
        assert.equal(birch.compile('{{? test }}true{{/?}}')({
            test : null
        }), '');
    });

    it('if / else true', function(){
        assert.equal(birch.compile('{{? test }}true{{!}}false{{/?}}')({
            test : 1
        }), 'true');
    });

    it('if / else false', function(){
        assert.equal(birch.compile('{{? test }}true{{!}}false{{/?}}')({
            test : null
        }), 'false');
    });

    it('if nested', function(){
        var tmpl = '{{? a }}{{? b}}b{{/? }}{{/?}}';

        assert.equal(birch.compile(tmpl)({
            a : 1,
            b : 1
        }), 'b');

        assert.equal(birch.compile(tmpl)({
            a : 0,
            b : 1
        }), '');

        assert.equal(birch.compile(tmpl)({
            a : 1,
            b : 0
        }), '');

        assert.equal(birch.compile(tmpl)({
            a : 0,
            b : 0
        }), '');
    });

    it('if / else  nested', function(){
        var tmpl = '{{? a }}{{? b}}b{{!}}c{{/? }}{{/?}}';

        assert.equal(birch.compile(tmpl)({
            a : 1,
            b : 1
        }), 'b');

        assert.equal(birch.compile(tmpl)({
            a : 0,
            b : 1
        }), '');

        assert.equal(birch.compile(tmpl)({
            a : 1,
            b : 0
        }), 'c');

        assert.equal(birch.compile(tmpl)({
            a : 0,
            b : 0
        }), '');
    });

    it('if & immediately else', function(){
        var tmpl = '{{? test }}{{!}}else{{/?}}';

        assert.equal(birch.compile(tmpl)({
            test : true
        }), '');

        assert.equal(birch.compile(tmpl)({
            test : false
        }), 'else');
    });

    it('else & immediately end', function(){
        var tmpl = '{{? test }}if{{!}}{{/?}}';

        assert.equal(birch.compile(tmpl)({
            test : true
        }), 'if');

        assert.equal(birch.compile(tmpl)({
            test : false
        }), '');
    });
});