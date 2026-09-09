const { applyCaseTransition, emitHospitalCapacity } = require('../src/services/bedLifecycle');

// Fake query executor that records every UPDATE it is asked to run.
function makeExec() {
  const updates = [];
  return {
    updates,
    query: jest.fn(async (text, params) => {
      const norm = text.replace(/\s+/g, ' ').trim();
      const m = norm.match(/SET (\w+) = (LEAST|GREATEST)\([^,]+, (\w+) ([+-]) 1\)/);
      if (m) updates.push(`${params[0]}:${m[1]}${m[4]}1`);
      if (/^SELECT \* FROM hospitals/i.test(norm)) return { rows: [{ id: params[0], name: 'H' }] };
      return { rows: [] };
    }),
  };
}

const run = async (change) => {
  const exec = makeExec();
  const touched = await applyCaseTransition(exec, change);
  return { effects: exec.updates.sort(), touched };
};

describe('applyCaseTransition', () => {
  test('reserves a general bed when a case is created with a hospital', async () => {
    const { effects } = await run({
      oldStatus: null, newStatus: 'in-transit',
      oldHospitalId: null, newHospitalId: 'H1',
      oldBedType: null, newBedType: 'general',
    });
    expect(effects).toEqual(['H1:reserved_general_beds+1']);
  });

  test('reserves an ICU bed for an ICU case', async () => {
    const { effects } = await run({
      oldStatus: null, newStatus: 'in-transit',
      oldHospitalId: null, newHospitalId: 'H1',
      oldBedType: null, newBedType: 'icu',
    });
    expect(effects).toEqual(['H1:reserved_icu_beds+1']);
  });

  test('does nothing when no hospital is assigned', async () => {
    const { effects } = await run({
      oldStatus: null, newStatus: 'in-transit',
      oldHospitalId: null, newHospitalId: null,
      oldBedType: null, newBedType: 'general',
    });
    expect(effects).toEqual([]);
  });

  test('converts a reservation to an occupied bed on arrival', async () => {
    const { effects } = await run({
      oldStatus: 'in-transit', newStatus: 'arrived',
      oldHospitalId: 'H1', newHospitalId: 'H1',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual(['H1:occupied_general_beds+1', 'H1:reserved_general_beds-1']);
  });

  test('frees the occupied bed when resolved after arrival', async () => {
    const { effects } = await run({
      oldStatus: 'arrived', newStatus: 'resolved',
      oldHospitalId: 'H1', newHospitalId: 'H1',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual(['H1:occupied_general_beds-1']);
  });

  test('releases the reservation when cancelled before arrival', async () => {
    for (const newStatus of ['resolved', 'cancelled']) {
      const { effects } = await run({
        oldStatus: 'in-transit', newStatus,
        oldHospitalId: 'H1', newHospitalId: 'H1',
        oldBedType: 'general', newBedType: 'general',
      });
      expect(effects).toEqual(['H1:reserved_general_beds-1']);
    }
  });

  test('moves the reservation between hospitals on reroute', async () => {
    const { effects, touched } = await run({
      oldStatus: 'in-transit', newStatus: 'in-transit',
      oldHospitalId: 'H1', newHospitalId: 'H2',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual(['H1:reserved_general_beds-1', 'H2:reserved_general_beds+1']);
    expect([...touched].sort()).toEqual(['H1', 'H2']);
  });

  test('moves the occupied bed between hospitals when an arrived case is rerouted', async () => {
    const { effects } = await run({
      oldStatus: 'arrived', newStatus: 'arrived',
      oldHospitalId: 'H1', newHospitalId: 'H2',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual(['H1:occupied_general_beds-1', 'H2:occupied_general_beds+1']);
  });

  test('moves the reservation between bed pools on a bed-type change', async () => {
    const { effects } = await run({
      oldStatus: 'in-transit', newStatus: 'in-transit',
      oldHospitalId: 'H1', newHospitalId: 'H1',
      oldBedType: 'general', newBedType: 'icu',
    });
    expect(effects).toEqual(['H1:reserved_general_beds-1', 'H1:reserved_icu_beds+1']);
  });

  test('is a no-op for a notes-only update with no status/hospital/bed change', async () => {
    for (const s of ['in-transit', 'arrived']) {
      const { effects } = await run({
        oldStatus: s, newStatus: s,
        oldHospitalId: 'H1', newHospitalId: 'H1',
        oldBedType: 'general', newBedType: 'general',
      });
      expect(effects).toEqual([]);
    }
  });

  test('is a no-op moving between two pre-arrival states (active -> in-transit)', async () => {
    const { effects } = await run({
      oldStatus: 'active', newStatus: 'in-transit',
      oldHospitalId: 'H1', newHospitalId: 'H1',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual([]);
  });

  test('occupies a bed when a hospital is only assigned at arrival', async () => {
    const { effects } = await run({
      oldStatus: 'in-transit', newStatus: 'arrived',
      oldHospitalId: null, newHospitalId: 'H2',
      oldBedType: 'general', newBedType: 'general',
    });
    expect(effects).toEqual(['H2:occupied_general_beds+1']);
  });
});

describe('emitHospitalCapacity', () => {
  test('emits one hospital_capacity_update per touched hospital', async () => {
    const exec = makeExec();
    const io = { emit: jest.fn() };
    await emitHospitalCapacity(exec, io, new Set(['H1', 'H2']));
    expect(io.emit).toHaveBeenCalledTimes(2);
    expect(io.emit).toHaveBeenCalledWith('hospital_capacity_update', { id: 'H1', name: 'H' });
  });

  test('does nothing for an empty set', async () => {
    const io = { emit: jest.fn() };
    await emitHospitalCapacity(makeExec(), io, new Set());
    expect(io.emit).not.toHaveBeenCalled();
  });
});
