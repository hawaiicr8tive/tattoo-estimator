/**
 * Resolves the `@/...` path alias for the compiled output in `.test-build`.
 *
 * `tsc` rewrites types but leaves import specifiers alone, so the emitted
 * JavaScript still asks for `@/lib/permissions`. Tests load this first to point
 * those requests at the compiled tree.
 */
const path = require('path')
const Module = require('module')

const BUILD = path.join(__dirname, '..', '.test-build')
const original = Module._resolveFilename

Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) {
    return original.call(this, path.join(BUILD, request.slice(2)), ...rest)
  }
  return original.call(this, request, ...rest)
}
