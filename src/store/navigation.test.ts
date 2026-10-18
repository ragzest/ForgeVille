import { describe, expect, it } from 'vitest';
import { createNavigationStore } from './navigation.ts';

describe('navigation store', () => {
  it('starts walking with nothing selected', () => {
    expect(createNavigationStore().getState()).toMatchObject({ view: 'walk', selectedZone: null, travel: null });
  });

  it('travelTo selects the zone, numbers each request, and returns to walking', () => {
    const store = createNavigationStore();
    store.getState().setView('overview');
    store.getState().travelTo('board');
    expect(store.getState()).toMatchObject({ view: 'walk', selectedZone: 'board', travel: { zone: 'board', seq: 1 } });
    store.getState().travelTo('board');
    expect(store.getState().travel).toEqual({ zone: 'board', seq: 2 });
  });

  it('selectZone highlights without travelling', () => {
    const store = createNavigationStore();
    store.getState().setView('2d');
    store.getState().selectZone('qa');
    expect(store.getState()).toMatchObject({ view: '2d', selectedZone: 'qa', travel: null });
  });
});
