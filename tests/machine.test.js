var Machine = require('../lib/machine');
var assert = require('assert');
var utils = require('./utils');

var fnString = utils.fnString;

describe('Machine#evaluate', function () {

  it('should evaluate but not run the top-level function', function () {
    var machine = new Machine();
    machine.evaluate('1;\n2;');
    assert.deepEqual(machine.runner.state, {
      value: null,
      done: false
    });
  });

});

describe('Machine#step', function () {

  it('should do a single step', function () {
    var machine = new Machine();
    machine.evaluate('1;\n2;');
    machine.step();
    assert.deepEqual(machine.runner.state, {
      value: {
        start: {
          line: 1,
          column: 0
        },
        end: {
          line: 1,
          column: 2
        }
      },
      done: false
    });
  });

  it('should do multiple steps', function () {
    var machine = new Machine();
    machine.evaluate('1;\n2;\n3;');
    machine.step();
    assert.deepEqual(machine.runner.state, {
      value: {
        start: {
          line: 1,
          column: 0
        },
        end: {
          line: 1,
          column: 2
        }
      },
      done: false
    });
    machine.step();
    assert.deepEqual(machine.runner.state, {
      value: {
        start: {
          line: 2,
          column: 0
        },
        end: {
          line: 2,
          column: 2
        }
      },
      done: false
    });
  });

  it('should step to completion', function () {
    var machine = new Machine();
    machine.evaluate('1;\n2;\n3;');
    var i = 0;
    var done = false;
    while (!done) {
      var done = machine.step().done;
      i++;
    }
    assert.equal(i, 4);
  });

  it('should step through functions in sandbox', function (done) {
    var machine = new Machine({
      foo: function () {
        done();
      }
    });
    machine.evaluate('foo()');
    machine.step();
    machine.step();
  });

  it('should handle call stack', function (done) {
    var source = fnString(function () {
      function foo() {
        bar(0);
      }
      foo();
      bar(1);
    });

    var i = 0;
    var machine = new Machine({
      bar: function (arg) {
        assert.equal(arg, i);
        if (i === 1) {
          done();
        }
        i++;
      }
    });

    machine.evaluate(source);
    // function foo()
    machine.step();
    // foo()
    machine.step();
    // call foo
    machine.step();
    // bar(0)
    machine.step();
    // call bar 0
    machine.step();
    // end
    machine.step();

    assert(machine.runner.state.done);
  });

});

describe('Machine#run', function () {

  it('should run to completion', function () {
    var machine = new Machine();
    machine
      .evaluate('1;\n2;\n3;')
      .run();
  });

  it('should nested function calls', function (done) {
    var source = fnString(function () {
      function foo0() {
        report('foo0');
      }

      function foo1() {
        report('foo1');
        foo2();
        foo0();
      }
      function foo2() {
        report('foo2');
        foo3()
      }
      function foo3() {
        report('foo3');
      }
      foo1();
      report('done');
    });

    var i = 0;
    var machine = new Machine({
      report: function (arg) {
        var expected;
        switch (i) {
          case 0:
            expected = 'foo1';
            break;
          case 1:
            expected = 'foo2';
            break;
          case 2:
            expected = 'foo3';
            break;
          case 3:
            expected = 'foo0';
            break;
          case 4:
            expected = 'done';
            break;
        }
        assert.equal(arg, expected);
        i++;
        if (i > 4) {
          done();
        }
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should nested function delcerations and calls', function (done) {
    var source = fnString(function () {
      function foo1() {
        function foo2() {
          function foo3() {
            report(3);
          }
          report(2);
          foo3();
        }
        report(1);
        foo2();
      }
      foo1();
      report('done');
    });

    var i = 0;
    var machine = new Machine({
      report: function (arg) {
        var expected;
        switch (i) {
          case 0:
            expected = 1;
            break;
          case 1:
            expected = 2;
            break;
          case 2:
            expected = 3;
            break;
          case 3:
            expected = 'done';
            break;
        }
        assert.equal(arg, expected);
        i++;
        if (i > 3) {
          done();
        }
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should run recursive fib', function (done) {
    var source = fnString(function () {
      function fib(n) {
        if (n == 0 || n == 1) {
          return n;
        } else {
          var res1 = fib(n - 1);
          var res2 = fib(n - 2);
          return res1 + res2;
        }
      }
      var res = fib(1);
      report(res);
      res = fib(10);
      report(res);
    });

    var i = 0;
    var machine = new Machine({
      report: function (arg) {
        if (i == 0) {
          assert.equal(arg, 1);
          i++;
        } else {
          assert.equal(arg, 55);
          done();
        }
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should run handle calls in expressions', function (done) {
    var source = fnString(function () {
      function foo() {
        return 1;
      }
      report(foo());
    });

    var machine = new Machine({
      report: function (arg) {
        assert.equal(arg, 1);
        done();
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should run handle multiple calls in expressions', function (done) {
    var source = fnString(function () {
      function foo() {
        return 1;
      }
      function bar() {
        return 2;
      }
      report(foo() - bar());
    });

    var machine = new Machine({
      report: function (arg) {
          assert.equal(arg, -1);
          done();
        }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should run handle multiple calls in expressions', function (done) {
    var source = fnString(function () {
      function foo(x) {
        return 6 / x;
      }
      function bar() {
        return 2;
      }
      report(foo(bar()));
    });

    var machine = new Machine({
      report: function (arg) {
          assert.equal(arg, 3);
          done();
        }
    });

    machine
      .evaluate(source)
      .run();
  });


  it('should run handle multiple calls in expressions', function (done) {
    var source = fnString(function () {
      function foo(x) {
        return 6 / x;
      }
      function bar() {
        return 2;
      }
      report(foo(bar() * bar()) - foo(bar()));
    });

    var machine = new Machine({
      report: function (arg) {
          assert.equal(arg, -1.5);
          done();
        }
    });

    machine
      .evaluate(source)
      .run();
  });


  it('should handle first order functions', function (done) {
    var source = fnString(function () {
      function fn1() {
        return function () {
          return 1;
        };
      }
      report(fn1()());
    });

    var machine = new Machine({
      report: function (arg) {
          assert.equal(arg, 1);
          done();
        }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should handle first order functions', function (done) {
    var source = fnString(function () {
      function f(fn) {
        return function () {
          return fn();
        };
      }
      report(
        f(function () {
          return 42;
        })()
      );
    });

    var machine = new Machine({
      report: function (arg) {
          assert.equal(arg, 42);
          done();
        }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should respect context', function (done) {
    var source = fnString(function () {
      var foo = {
        p: 1,
        f: function () { return this.p; }
      };
      report(foo.f());
    });

    var machine = new Machine({
      report: function (arg) {
        assert.equal(arg, 1);
        done();
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should respect context in thunks', function (done) {
    var source = fnString(function () {
      var foo = {
        p: 1,
        f: function () { return report(this === foo); }
      };
      foo.f();
    });

    var machine = new Machine({
      report: function (arg) {
        assert(arg);
        done();
      }
    });

    machine
      .evaluate(source)
      .run();
  });

  it('should handle iterators', function (done) {
    var source = fnString(function () {
      [1, 2, 3].forEach(function (n, i) {
        report(n, i);
      });
    });

    var i = 0;
    var machine = new Machine({
      report: function (arg, index) {
        assert.equal(index, i);
        switch (i) {
          case 0:
            assert.equal(arg, 1);
            break;
          case 1:
            assert.equal(arg, 2);
            break;
          case 2:
            assert.equal(arg, 3);
            done();
            break;
        }
        i++;
      }
    });

    machine
      .evaluate(source)
      .run();
  });
});

describe('Machine#getCallStack', function () {
  it('should handle return the correct call stack', function () {
    var source = fnString(function () {
      function fn1() {
        fn2();
      }
      function fn2() {
        var x = 1;
      }
      fn1();
    });

    var machine = new Machine();

    machine.evaluate(source);

    var globalScope = {
      type: 'stackFrame',
      name: 'Global Scope',
      scope: [ { name: 'fn1', locs: [ { start: {line:1, column:9},
                                        end: {line: 1, column: 12}}]},
               { name: 'fn2', locs:  [ { start: {line:4, column:9},
                                        end: {line: 4, column: 12}}]} ]
    };

    // fn1
    machine.step();
    assert.deepEqual(machine.getCallStack(), [globalScope]);

    // fn2
    machine.step();
    assert.deepEqual(machine.getCallStack(), [globalScope]);

    // fn3()
    machine.step();
    assert.deepEqual(machine.getCallStack(), [globalScope]);

    // call fn3
    machine.step();
    // TODO take care of undefined.
    assert.deepEqual(machine.getCallStack(), [globalScope, undefined]);

    var fn1Scope = {
      type: 'stackFrame',
      name: 'fn1',
      scope: []
    };
    // fn2();
    machine.step();
    assert.deepEqual(machine.getCallStack(), [globalScope, fn1Scope]);

    // call fn2
    machine.step();
    // TODO take care of undefined.
    assert.deepEqual(machine.getCallStack(), [
      globalScope, fn1Scope, undefined
    ]);

    var fn2Scope = {
      type: 'stackFrame',
      name: 'fn2',
      scope: [
        {name: 'x', locs: [{
          start: {
            line: 5,
            column: 4
          },
          end: {
            line: 5,
            column: 5
          }
        }]}
      ]
    };
    // call fn2
    machine.step();
    // TODO take care of undefined.
    assert.deepEqual(machine.getCallStack(), [
      globalScope, fn1Scope, fn2Scope
    ]);
  });
});
