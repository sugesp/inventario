import { normalizePersonName, normalizePersonNameInput } from './person-name-normalizer';

describe('normalizePersonName', () => {
  it('formats names using title case and lowercase particles', () => {
    expect(normalizePersonName('joao da silva')).toBe('Joao da Silva');
    expect(normalizePersonName('MARIA DE SOUZA')).toBe('Maria de Souza');
    expect(normalizePersonName('ana   paula dos santos')).toBe('Ana Paula dos Santos');
  });

  it('removes extra spaces', () => {
    expect(normalizePersonName('  ana    maria  ')).toBe('Ana Maria');
  });

  it('formats names starting with mc', () => {
    expect(normalizePersonName('mcgregor')).toBe('McGregor');
  });

  it('capitalizes each apostrophe-separated part', () => {
    expect(normalizePersonName("d'angelo")).toBe("D'Angelo");
  });

  it('preserves a single trailing space while formatting input', () => {
    expect(normalizePersonNameInput('joao ')).toBe('Joao ');
    expect(normalizePersonNameInput('joao   ')).toBe('Joao ');
  });
});
