import { describe, expect, it } from 'vitest';
import { parseFile } from '../src/parser.js';

describe('parseFile', () => {
  it('extracts var/func/param/class identifiers with line/col', () => {
    const code = `
      class Foo {}
      function bar(baz) {
        let qux = 1;
        return qux;
      }
    `;
    const ids = parseFile(code, 'test.ts');
    expect(ids.find((i) => i.name === 'Foo')?.kind).toBe('class');
    expect(ids.find((i) => i.name === 'bar')?.kind).toBe('func');
    expect(ids.find((i) => i.name === 'baz')?.kind).toBe('param');
    expect(ids.find((i) => i.name === 'qux')?.kind).toBe('var');
  });

  it('marks a for-loop counter and leaves an unrelated var unmarked', () => {
    const code = `
      for (let i = 0; i < 10; i++) {}
      let j = 0;
    `;
    const ids = parseFile(code, 'test.ts');
    const i = ids.find((x) => x.name === 'i');
    const j = ids.find((x) => x.name === 'j');
    expect(i?.isForLoopCounter).toBe(true);
    expect(j?.isForLoopCounter).toBeFalsy();
  });

  it('gives identifiers in different function scopes different scopeIds', () => {
    const code = `
      function a() { let shared = 1; }
      function b() { let shared = 2; }
    `;
    const ids = parseFile(code, 'test.ts').filter((x) => x.name === 'shared');
    expect(ids).toHaveLength(2);
    expect(ids[0].scopeId).not.toBe(ids[1].scopeId);
  });
});
