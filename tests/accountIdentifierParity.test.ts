import { describe, expect, it } from 'vitest'
import { isValidAccountIdentifier, normalizeAccountIdentifier } from '../src/lib/accountIdentifier'
import { isValidAccountIdentifier as gatewayValid, normalizeAccountIdentifier as gatewayNormalize } from '../supabase/functions/account-gateway/identifier'

const longestEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`
const cases: Array<[string, boolean]> = [
  ['abc', true], [' PLAYER.Name-2 ', true], ['a'.repeat(32), true],
  ['player@example.com', true], [' Player+Lessons@EXAMPLE.COM ', true],
  ["first.last+practice@example-domain.co.uk", true],
  [`${'a'.repeat(64)}@example.com`, true], [longestEmail, true],
  ['', false], ['ab', false], ['_player', false], ['a'.repeat(33), false],
  ['player name', false], ['player@localhost', false], ['player@@example.com', false],
  ['.player@example.com', false], ['player.@example.com', false], ['play..er@example.com', false],
  ['player@-example.com', false], ['player@example-.com', false], ['player@example..com', false],
  ['player@example.com.', false], ['player@ex_ample.com', false],
  [`player@${'a'.repeat(64)}.com`, false], [`${'a'.repeat(65)}@example.com`, false],
  [`${longestEmail}d`, false], ['"player"@example.com', false],
  ['игрок@example.com', false], ['player@éxample.com', false],
  ['play\ner@example.com', false], ['player\u0000@example.com', false],
  ['player@accounts.guitar-practice-hub.invalid', false],
  [' PLAYER@ACCOUNTS.GUITAR-PRACTICE-HUB.INVALID ', false],
]

describe('AccountIdentifier-v1 client/gateway parity', () => {
  it.each(cases)('agrees on %j => %s', (input, expected) => {
    expect(isValidAccountIdentifier(input)).toBe(expected)
    expect(gatewayValid(input)).toBe(expected)
    expect(normalizeAccountIdentifier(input)).toBe(gatewayNormalize(input))
  })

  it('reserves the configured domain and the default domain without blocking unrelated public emails', () => {
    for (const validate of [isValidAccountIdentifier, gatewayValid]) {
      expect(validate('player@private-auth.example', ' PRIVATE-AUTH.EXAMPLE ')).toBe(false)
      expect(validate('player@accounts.guitar-practice-hub.invalid', 'private-auth.example')).toBe(false)
      expect(validate('player@public.example', 'private-auth.example')).toBe(true)
    }
  })

  it.each([null, undefined, 42, {}, ['player@example.com']])('normalizes non-text input %j safely', (input) => {
    expect(normalizeAccountIdentifier(input)).toBe('')
    expect(gatewayNormalize(input)).toBe('')
  })
})
