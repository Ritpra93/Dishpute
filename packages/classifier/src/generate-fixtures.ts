import { createMockClassifier } from './index';
import { FIXTURE_DISPUTES } from '@counter/types';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const classifier = createMockClassifier();

classifier.classifyMany(FIXTURE_DISPUTES).then((results) => {
  const outDir = join(__dirname, '../__fixtures__');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'classifications.json'), JSON.stringify(results, null, 2));
  console.log(`Generated __fixtures__/classifications.json (${results.length} entries)`);
});
