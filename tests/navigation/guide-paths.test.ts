import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_HOW_IT_WORKS_GUIDE,
  HOW_IT_WORKS_GUIDES,
  getHowItWorksHref,
  parseHowItWorksGuide,
} from '@/lib/how-it-works/guides';
import {
  DEFAULT_CREATE_FLOW,
  CREATE_FLOW_IDS,
  getCreateFlowHref,
  getCreateWorkspaceState,
  parseCreateFlow,
} from '@/lib/navigation/create-flow';

test('parseHowItWorksGuide accepts known guide IDs and rejects unknown values', () => {
  assert.equal(parseHowItWorksGuide('csv-lists'), 'csv-lists');
  assert.equal(parseHowItWorksGuide(['batch-atoms', 'csv-atoms']), 'batch-atoms');
  assert.equal(parseHowItWorksGuide('not-a-guide'), DEFAULT_HOW_IT_WORKS_GUIDE);
  assert.equal(parseHowItWorksGuide(undefined), DEFAULT_HOW_IT_WORKS_GUIDE);
});

test('parseCreateFlow accepts known flow IDs and falls back to single atom', () => {
  for (const flow of CREATE_FLOW_IDS) {
    assert.equal(parseCreateFlow(flow), flow);
    assert.equal(getCreateFlowHref(flow), `/create?flow=${flow}`);
  }

  assert.equal(parseCreateFlow('unknown'), DEFAULT_CREATE_FLOW);
  assert.equal(parseCreateFlow(undefined), DEFAULT_CREATE_FLOW);
});

test('every How It Works guide has a shareable URL and valid Create destination', () => {
  assert.equal(HOW_IT_WORKS_GUIDES.length, 6);

  for (const guide of HOW_IT_WORKS_GUIDES) {
    assert.equal(getHowItWorksHref(guide.id), `/how-it-works?guide=${guide.id}#walkthrough`);
    assert.equal(parseCreateFlow(guide.createFlow), guide.createFlow);
    assert.ok(guide.steps.length >= 6);
    assert.ok(guide.prerequisites.length > 0);
    assert.ok(guide.outcomes.length > 0);
  }
});

test('single and batch list guides open the shared manual lists flow', () => {
  const singleList = HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'single-list');
  const batchLists = HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'batch-lists');

  assert.equal(singleList?.createFlow, 'manual-lists');
  assert.equal(batchLists?.createFlow, 'manual-lists');
});

test('only CSV guides carry the bulk-data recommendation', () => {
  const recommended = HOW_IT_WORKS_GUIDES.filter((guide) => guide.badge).map((guide) => guide.id);

  assert.deepEqual(recommended, ['csv-atoms', 'csv-lists']);
  assert.equal(HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'csv-atoms')?.badge, 'Best for bulk data');
  assert.equal(HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'csv-lists')?.badge, 'Best for bulk data');
});

test('the CSV-list guide explains that rows resolve existing atoms', () => {
  const csvLists = HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'csv-lists');
  const preparationStep = csvLists?.steps.find((step) => step.action === 'list-csv-template');

  assert.match(preparationStep?.emphasis ?? '', /exact name and exact description/i);
  assert.match(preparationStep?.emphasis ?? '', /description identifies the correct one/i);
  assert.match(preparationStep?.description ?? '', /actual atoms you want to add/i);
});

test('both CSV guides expose their template downloads in Step 02', () => {
  const csvAtoms = HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'csv-atoms');
  const csvLists = HOW_IT_WORKS_GUIDES.find((guide) => guide.id === 'csv-lists');

  assert.equal(csvAtoms?.steps[1]?.action, 'atom-csv-templates');
  assert.equal(csvLists?.steps[1]?.action, 'list-csv-template');
});

test('each Create flow maps to the intended workspace section and mode', () => {
  assert.deepEqual(getCreateWorkspaceState('single-atom'), {
    section: 'atoms', atomMode: 'single_atom', listMode: 'manual_lists',
  });
  assert.equal(getCreateWorkspaceState('batch-atoms').atomMode, 'batch_atoms');
  assert.equal(getCreateWorkspaceState('csv-atoms').atomMode, 'csv_atoms');
  assert.equal(getCreateWorkspaceState('manual-lists').listMode, 'manual_lists');
  assert.equal(getCreateWorkspaceState('csv-lists').listMode, 'csv_lists');
  assert.equal(getCreateWorkspaceState('csv-lists').section, 'lists');
});
