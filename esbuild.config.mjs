import * as esbuild from 'esbuild';

// Bundle the node with dependencies inlined
await esbuild.build({
  entryPoints: ['src/nodes/LaikaTest/LaikaTest.node.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/nodes/LaikaTest/LaikaTest.node.js',
  format: 'cjs',
  sourcemap: 'inline',
  // Externalize n8n packages (they're provided by n8n runtime)
  external: ['n8n-workflow', 'n8n-core'],
});

// Bundle credentials (usually no external deps, but bundle anyway)
await esbuild.build({
  entryPoints: ['src/credentials/LaikaTestApi.credentials.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/credentials/LaikaTestApi.credentials.js',
  format: 'cjs',
  sourcemap: 'inline',
  external: ['n8n-workflow', 'n8n-core'],
});

// Bundle index
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/index.js',
  format: 'cjs',
  sourcemap: 'inline',
  external: ['n8n-workflow', 'n8n-core'],
});

console.log('Build complete!');
