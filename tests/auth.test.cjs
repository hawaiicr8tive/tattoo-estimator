/**
 * Exercises the real auth/permission modules, compiled to `.test-build` by
 * `npm test`. Focused on the places where a mistake is an actual access-control
 * hole — permission resolution, cookie forgery, session invalidation — rather
 * than on UI plumbing.
 *
 * Run with `npm test`.
 */
require('./alias.cjs')

const assert = require('assert')
const path = require('path')

const BUILD = path.join(__dirname, '..', '.test-build', 'lib')

// Set explicitly so the suite doesn't depend on the developer's local .env.
process.env.ADMIN_PASSWORD = 'owner-secret-pw'
delete process.env.SESSION_SECRET
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

const perms = require(path.join(BUILD, 'permissions.js'))
const store = require(path.join(BUILD, 'users-store.js'))
const auth = require(path.join(BUILD, 'admin-auth.js'))

let passed = 0
let failed = 0
async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  ok   ${name}`)
  } catch (e) {
    failed++
    console.log(`  FAIL ${name}\n       ${e.message}`)
  }
}

// A stand-in for NextRequest's cookie accessor.
function reqWith(token) {
  return { cookies: { get: name => (name === auth.ADMIN_COOKIE && token ? { value: token } : undefined) } }
}

;(async () => {
  console.log('\npermissions')

  await test('guest cannot reach research, controls, or spend money', () => {
    const p = perms.resolvePermissions({ role: 'guest' })
    for (const denied of ['page:research', 'page:controls', 'images:generate', 'images:bulk', 'library:curate', 'users:manage']) {
      assert.ok(!p.has(denied), `guest unexpectedly has ${denied}`)
    }
    assert.ok(p.has('page:dashboard') && p.has('page:trends') && p.has('page:library'))
  })

  await test('member can generate but not bulk or manage users', () => {
    const p = perms.resolvePermissions({ role: 'member' })
    assert.ok(p.has('images:generate'))
    assert.ok(p.has('library:curate'))
    assert.ok(!p.has('images:bulk'))
    assert.ok(!p.has('users:manage'))
  })

  await test('admin holds every permission in the catalog', () => {
    const p = perms.resolvePermissions({ role: 'admin' })
    for (const permission of perms.PERMISSIONS) assert.ok(p.has(permission), `admin missing ${permission}`)
  })

  await test('grant adds a permission the role lacks', () => {
    const p = perms.resolvePermissions({ role: 'guest', grant: ['images:bulk'] })
    assert.ok(p.has('images:bulk'))
  })

  await test('revoke beats grant for the same permission', () => {
    const p = perms.resolvePermissions({ role: 'admin', grant: ['images:bulk'], revoke: ['images:bulk'] })
    assert.ok(!p.has('images:bulk'), 'revoke must win so an explicit denial cannot be undone')
  })

  await test('revoke strips a role default', () => {
    const p = perms.resolvePermissions({ role: 'admin', revoke: ['users:manage'] })
    assert.ok(!p.has('users:manage'))
  })

  await test('unknown permission strings are ignored, not trusted', () => {
    const p = perms.resolvePermissions({ role: 'guest', grant: ['page:secret-backdoor'] })
    assert.ok(!p.has('page:secret-backdoor'))
    assert.strictEqual(p.size, perms.ROLE_DEFAULTS.guest.length)
  })

  await test('firstAllowedPage skips pages the user lacks', () => {
    assert.strictEqual(perms.firstAllowedPage(new Set(['page:controls'])), '/controls')
    assert.strictEqual(perms.firstAllowedPage(new Set(['page:trends', 'page:library'])), '/data')
    assert.strictEqual(perms.firstAllowedPage(new Set()), null)
  })

  await test('permissionForPath maps every nav page and rejects others', () => {
    assert.strictEqual(perms.permissionForPath('/'), 'page:dashboard')
    assert.strictEqual(perms.permissionForPath('/controls'), 'page:controls')
    assert.strictEqual(perms.permissionForPath('/controls/'), 'page:controls')
    assert.strictEqual(perms.permissionForPath('/nope'), null)
  })

  await test('every permission has display metadata', () => {
    for (const permission of perms.PERMISSIONS) {
      assert.ok(perms.PERMISSION_META[permission], `no metadata for ${permission}`)
    }
  })

  console.log('\npassword hashing')

  await test('correct password verifies, wrong one does not', async () => {
    const hash = await store.hashPassword('correct horse battery')
    assert.ok(await store.verifyPassword('correct horse battery', hash))
    assert.ok(!(await store.verifyPassword('wrong', hash)))
  })

  await test('same password hashes differently each time (per-user salt)', async () => {
    const a = await store.hashPassword('same-password')
    const b = await store.hashPassword('same-password')
    assert.notStrictEqual(a, b)
    assert.ok(await store.verifyPassword('same-password', a))
    assert.ok(await store.verifyPassword('same-password', b))
  })

  await test('verify rejects absent or malformed stored hashes', async () => {
    assert.ok(!(await store.verifyPassword('x', undefined)))
    assert.ok(!(await store.verifyPassword('x', '')))
    assert.ok(!(await store.verifyPassword('x', 'garbage')))
    assert.ok(!(await store.verifyPassword('x', 'md5$aa$bb')))
  })

  await test('a user with no password cannot be logged into', async () => {
    assert.ok(!(await store.verifyPassword('', undefined)))
    assert.ok(!(await store.verifyPassword('anything', undefined)))
  })

  console.log('\nsession cookie')

  // Round-trip through the real cookie writer by capturing what it sets.
  function encode(payload) {
    let captured
    auth.setSessionCookie({ cookies: { set: (name, value) => { captured = value } } }, payload)
    return captured
  }

  await test('owner cookie round-trips to the owner session', async () => {
    const user = await auth.resolveSession(encode(auth.ownerSessionPayload()))
    assert.ok(user, 'owner session did not resolve')
    assert.strictEqual(user.id, auth.OWNER_ID)
    assert.strictEqual(user.role, 'admin')
    assert.ok(user.isOwner)
  })

  await test('tampering with the payload invalidates the cookie', async () => {
    const token = encode(auth.ownerSessionPayload())
    const [body, sig] = token.split('.')
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString())
    decoded.uid = 'some-other-user-id'
    const forgedBody = Buffer.from(JSON.stringify(decoded)).toString('base64url')
    assert.strictEqual(await auth.resolveSession(`${forgedBody}.${sig}`), null)
  })

  await test('a cookie signed with a different secret is rejected', async () => {
    const token = encode(auth.ownerSessionPayload())
    process.env.ADMIN_PASSWORD = 'a-totally-different-password'
    const result = await auth.resolveSession(token)
    process.env.ADMIN_PASSWORD = 'owner-secret-pw'
    assert.strictEqual(result, null, 'cookie survived a password rotation')
  })

  await test('the owner cookie payload contains nothing password-derived', async () => {
    const crypto = require('crypto')
    const body = encode(auth.ownerSessionPayload()).split('.')[0]
    const decoded = Buffer.from(body, 'base64url').toString()
    const password = process.env.ADMIN_PASSWORD

    assert.ok(!decoded.includes(password), 'cookie contains the password verbatim')
    // A digest of the raw password would be an offline brute-force target for
    // anyone who steals a cookie, so no prefix of one should appear either.
    for (const encoding of ['hex', 'base64', 'base64url']) {
      const digest = crypto.createHash('sha256').update(password).digest(encoding)
      assert.ok(
        !decoded.includes(digest.slice(0, 8)),
        `cookie contains a ${encoding} digest of the password`,
      )
    }
  })

  await test('garbage, empty, and missing cookies resolve to null', async () => {
    for (const bad of [undefined, null, '', 'x', 'a.b', '....', 'null.null']) {
      assert.strictEqual(await auth.resolveSession(bad), null, `accepted ${JSON.stringify(bad)}`)
    }
  })

  await test('an unsigned payload with no signature is rejected', async () => {
    const body = Buffer.from(JSON.stringify({ uid: auth.OWNER_ID, st: 'x' })).toString('base64url')
    assert.strictEqual(await auth.resolveSession(body), null)
  })

  await test('legacy pre-multi-user cookie still authenticates the owner', async () => {
    const crypto = require('crypto')
    const legacy = crypto.createHmac('sha256', 'owner-secret-pw').update('admin-session').digest('hex')
    const user = await auth.resolveSession(legacy)
    assert.ok(user && user.isOwner, 'legacy owner cookie stopped working')
  })

  await test('a legacy-shaped cookie with the wrong digest is rejected', async () => {
    const crypto = require('crypto')
    const bogus = crypto.createHmac('sha256', 'not-the-password').update('admin-session').digest('hex')
    assert.strictEqual(await auth.resolveSession(bogus), null)
  })

  console.log('\nauthenticate')

  await test('owner signs in with password only', async () => {
    const result = await auth.authenticate(undefined, 'owner-secret-pw')
    assert.ok(result && result.user.isOwner)
  })

  await test('owner signs in with any email (fresh install has no users)', async () => {
    const result = await auth.authenticate('whoever@example.com', 'owner-secret-pw')
    assert.ok(result && result.user.isOwner)
  })

  await test('wrong password is rejected', async () => {
    assert.strictEqual(await auth.authenticate(undefined, 'nope'), null)
    assert.strictEqual(await auth.authenticate('a@b.com', 'nope'), null)
  })

  await test('empty password never authenticates', async () => {
    assert.strictEqual(await auth.authenticate(undefined, ''), null)
  })

  console.log('\nrequirePermission')

  await test('no cookie yields 401', async () => {
    const result = await auth.requirePermission(reqWith(undefined), 'page:dashboard')
    assert.ok('error' in result)
    assert.strictEqual(result.error.status, 401)
  })

  await test('owner passes every permission gate', async () => {
    const token = encode(auth.ownerSessionPayload())
    for (const permission of perms.PERMISSIONS) {
      const result = await auth.requirePermission(reqWith(token), permission)
      assert.ok(!('error' in result), `owner blocked from ${permission}`)
    }
  })

  await test('forged cookie yields 401 rather than access', async () => {
    const result = await auth.requirePermission(reqWith('forged.deadbeef'), 'users:manage')
    assert.ok('error' in result)
    assert.strictEqual(result.error.status, 401)
  })

  console.log('\nstored (non-owner) users')

  // admin-auth resolves findUserById off the module object at call time, so
  // swapping it here stands in for the Supabase-backed store.
  const realFindUserById = store.findUserById
  async function withStoredUser(user, fn) {
    store.findUserById = async id => (user && user.id === id ? user : null)
    try {
      return await fn()
    } finally {
      store.findUserById = realFindUserById
    }
  }

  async function makeUser(overrides = {}) {
    return {
      id: 'user-1',
      email: 'artist@studio.com',
      name: 'Artist',
      role: 'guest',
      grant: [],
      revoke: [],
      passwordHash: await store.hashPassword('artist-pw-123'),
      disabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }
  }

  await test('a stored guest resolves with only guest permissions', async () => {
    const user = await makeUser()
    await withStoredUser(user, async () => {
      const session = await auth.resolveSession(encode(auth.userSessionPayload(user)))
      assert.ok(session, 'stored user session did not resolve')
      assert.strictEqual(session.id, 'user-1')
      assert.strictEqual(session.role, 'guest')
      assert.ok(!session.isOwner)
      assert.ok(session.permissions.has('page:dashboard'))
      assert.ok(!session.permissions.has('images:generate'))
    })
  })

  await test('a disabled user cannot resolve a session', async () => {
    const user = await makeUser({ disabled: true })
    await withStoredUser(user, async () => {
      assert.strictEqual(await auth.resolveSession(encode(auth.userSessionPayload(user))), null)
    })
  })

  await test('a deleted user cannot resolve a session', async () => {
    const user = await makeUser()
    const token = encode(auth.userSessionPayload(user))
    await withStoredUser(null, async () => {
      assert.strictEqual(await auth.resolveSession(token), null)
    })
  })

  await test('changing the password invalidates existing sessions', async () => {
    const user = await makeUser()
    const token = encode(auth.userSessionPayload(user))
    const rotated = { ...user, passwordHash: await store.hashPassword('brand-new-pw') }
    await withStoredUser(rotated, async () => {
      assert.strictEqual(await auth.resolveSession(token), null, 'old cookie survived a password change')
    })
  })

  await test('a role change takes effect on the next request', async () => {
    const user = await makeUser()
    const token = encode(auth.userSessionPayload(user))
    await withStoredUser({ ...user, role: 'admin' }, async () => {
      const session = await auth.resolveSession(token)
      assert.ok(session.permissions.has('users:manage'), 'promotion did not take effect')
    })
  })

  await test('a guest is 403ed from paid actions but not from allowed pages', async () => {
    const user = await makeUser()
    const token = encode(auth.userSessionPayload(user))
    await withStoredUser(user, async () => {
      for (const denied of ['images:generate', 'images:bulk', 'users:manage', 'page:controls']) {
        const result = await auth.requirePermission(reqWith(token), denied)
        assert.ok('error' in result, `guest was allowed ${denied}`)
        assert.strictEqual(result.error.status, 403, `${denied} should be 403, not ${result.error?.status}`)
      }
      const allowed = await auth.requirePermission(reqWith(token), 'page:library')
      assert.ok(!('error' in allowed), 'guest blocked from an allowed page')
    })
  })

  await test('a per-user grant lets one guest into bulk without changing the role', async () => {
    const user = await makeUser({ grant: ['images:bulk'] })
    const token = encode(auth.userSessionPayload(user))
    await withStoredUser(user, async () => {
      const result = await auth.requirePermission(reqWith(token), 'images:bulk')
      assert.ok(!('error' in result), 'explicit grant was not honoured')
      const still = await auth.requirePermission(reqWith(token), 'images:generate')
      assert.ok('error' in still, 'grant leaked into an unrelated permission')
    })
  })

  await test('a stored user cannot forge their way to another user id', async () => {
    const user = await makeUser()
    const token = encode(auth.userSessionPayload(user))
    const [body, sig] = token.split('.')
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString())
    decoded.uid = auth.OWNER_ID
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString('base64url')}.${sig}`
    await withStoredUser(user, async () => {
      assert.strictEqual(await auth.resolveSession(forged), null, 'uid swap to owner succeeded')
    })
  })

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed ? 1 : 0)
})()
