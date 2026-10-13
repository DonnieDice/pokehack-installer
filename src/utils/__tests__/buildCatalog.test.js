const { buildCatalog } = require('../buildCatalog');

test('legacy estimates are omitted and reviewed source records replace legacy ids', () => {
  const legacy = [{ id: 'example', rating: 8.1, hours: '30', difficulty: 'Expert', completed: true, tags: ['Completed', 'New Region'] }];
  expect(buildCatalog(legacy, [])[0]).toEqual({ id: 'example', tags: ['New Region'], sourceType: 'unreviewed' });
  const source = {
    id: 'example', title: 'Example', platform: 'GB', verificationDate: '2026-10-13',
    projectUrl: 'https://creator.example/project', sourceUrl: 'https://creator.example/project',
    description: 'A project description supported by its creator source.',
  };
  const result = buildCatalog(legacy, [source]);
  expect(result).toHaveLength(1);
  expect(result[0].verifiedAt).toBe(source.verificationDate);
  expect(result[0].rating).toBeUndefined();
  expect(result[0].completed).toBeUndefined();
  expect(result[0].tags).toEqual([]);
});

test('unsafe ids and unknown platforms fail rather than generating asset paths', () => {
  expect(() => buildCatalog([], [{ id: '../cover', platform: 'GB' }])).toThrow();
  expect(() => buildCatalog([], [{ id: 'cover', platform: 'PC' }])).toThrow();
});

test('creator records need evidence and duplicate reviewed ids fail', () => {
  expect(() => buildCatalog([], [{ id: 'example', platform: 'GB' }])).toThrow('Missing source evidence');
  const source = {
    id: 'example', title: 'Example', platform: 'GB', verificationDate: '2026-10-13',
    projectUrl: 'https://creator.example/project', sourceUrl: 'https://creator.example/project',
    description: 'A source-supported project.',
  };
  expect(() => buildCatalog([], [source, source])).toThrow('Duplicate source record');
});
