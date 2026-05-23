import { describe, it, expect } from 'vitest';
import { CapabilitySet, AccessMode } from '../index.js';

describe('error handling', () => {
  it('throws on a non-existent path', () => {
    const caps = new CapabilitySet();
    expect(() => caps.allowPath('/nonexistent/path/xyz', AccessMode.Read)).toThrow();
  });

  it('throws when a file path is passed to allowPath', () => {
    const caps = new CapabilitySet();
    expect(() => caps.allowPath('/etc/hosts', AccessMode.Read)).toThrow();
  });
});
