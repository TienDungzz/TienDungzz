export const checkerDefinitions = [
  { name: 'docs', file: 'check-docs.mjs', handler: 'checkDocumentation', sections: ['documentation'] },
  { name: 'structure', file: 'check-structure.mjs', handler: 'checkStructure', sections: ['structure'] },
  { name: 'assets', file: 'check-assets.mjs', handler: 'checkAssets', sections: ['assets'] },
  { name: 'css', file: 'check-css.mjs', handler: 'checkCss', sections: ['css'] },
  { name: 'quality', file: 'check-quality.mjs', handler: 'checkQuality', sections: ['quality', 'code'] }
];
