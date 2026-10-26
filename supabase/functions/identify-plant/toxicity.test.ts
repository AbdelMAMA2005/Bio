import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessToxicity, preserveToxicWarning } from './toxicity.ts';

const sure = { toxicityConfidence: 0.97, toxicityReason: 'Saponines connues, toxiques pour chats et chiens.' };

test('une évaluation sûre sur une identification sûre est retenue', () => {
  assert.equal(assessToxicity({ ...sure, toxicity: 'toxic' }, 0.95), 'red');
  assert.equal(assessToxicity({ ...sure, toxicity: 'non_toxic' }, 0.95), 'green');
});

test('le moindre doute donne « incertaine »', () => {
  assert.equal(assessToxicity({ ...sure, toxicity: 'non_toxic' }, 0.6), 'orange');
  assert.equal(assessToxicity({ ...sure, toxicity: 'non_toxic', toxicityConfidence: 0.9 }, 0.95), 'orange');
  assert.equal(assessToxicity({ ...sure, toxicity: 'non_toxic', toxicityReason: ' ' }, 0.95), 'orange');
  assert.equal(assessToxicity({ ...sure, toxicity: 'uncertain' }, 0.95), 'orange');
});

test('une réponse absente ou invalide donne « incertaine »', () => {
  assert.equal(assessToxicity(null, 0.95), 'orange');
  assert.equal(assessToxicity({ ...sure, toxicity: 'toxic', toxicityConfidence: 2 }, 0.95), 'orange');
  assert.equal(assessToxicity({ ...sure, toxicity: 'toxic' }, Number.NaN), 'orange');
});

test('un avertissement « toxique » existant n est jamais effacé', () => {
  assert.equal(preserveToxicWarning('red', 'green'), 'red');
  assert.equal(preserveToxicWarning('orange', 'green'), 'green');
  assert.equal(preserveToxicWarning(undefined, 'orange'), 'orange');
});
