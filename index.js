var fs = require('fs');
var recast = require('recast');
var b = recast.types.builders;
var types = recast.types.namedTypes;

function transform(ast) {
  var program = ast.program;
  var i = 0;
  recast.types.traverse(program.body, function (n) {
    if (types.Statement.check(n) &&
        // Block statements are just groupings of other statements so we ignore
        !types.BlockStatement.check(n)) {
      var replacement = b.blockStatement([
        b.expressionStatement(
          b.yieldExpression(
            b.objectExpression([
              b.property(
                'init',
                b.literal('start'),
                b.objectExpression([
                  b.property(
                    'init',
                    b.literal('line'),
                    b.literal(n.loc.start.line)
                  ),
                  b.property(
                    'init',
                    b.literal('column'),
                    b.literal(n.loc.start.column)
                  )
                ])
              ),
              b.property(
                'init',
                b.literal('end'),
                b.objectExpression([
                  b.property(
                    'init',
                    b.literal('line'),
                    b.literal(n.loc.end.line)
                  ),
                  b.property(
                    'init',
                    b.literal('column'),
                    b.literal(n.loc.end.column)
                  )
                ])
              )
            ]),
            false
          )
        ),
        n
      ]);
      this.replace(replacement);
    }
  });

  ast.program = b.program([
    b.functionDeclaration(
      b.identifier('top'), [], b.blockStatement(program.body), true
    )
  ]);
  return ast;
}

module.exports = transform;
// console.log(recast.print(ast).code);
// eval(recast.print(ast).code);
// var gen = top();

// var x;
// while(x = gen.next(), console.log(x), !x.done);
