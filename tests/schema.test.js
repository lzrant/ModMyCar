import { PGlite } from '@electric-sql/pglite'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { RENDER_PRESETS } from '../shared/renderPresets.js'
let db, vehicleId, wheelId, otherWheelId, foreignPartId, buildId
const userA = '00000000-0000-4000-8000-000000000001',
  userB = '00000000-0000-4000-8000-000000000002'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    insert into auth.users values ('${userA}'),('${userB}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    create table public.parts(id bigint generated always as identity primary key,name text not null,type text not null,manufacturer text,specifications jsonb,created_at timestamptz default now());
    insert into public.parts(name,type) values ('Preserved legacy engine','Engine');
    create table public.compatibility(id bigint generated always as identity primary key,part_id bigint not null references public.parts(id),car_make text not null,car_model text not null,car_year_range text,created_at timestamptz default now());
    insert into public.compatibility(part_id,car_make,car_model,car_year_range) values (1,'Acura','RSX','2002-2004');`)
  const schema = await readFile('server/db/schema.sql', 'utf8'),
    seed = await readFile('server/db/seed.sql', 'utf8')
  await db.exec(schema)
  await db.exec(seed)
  await db.exec(schema)
  await db.exec(seed)
  vehicleId = (
    await db.query("select id from vehicles where year=2018 and model='WRX'")
  ).rows[0].id
  wheelId = (await db.query("select id from parts where sku='3798856540SP'"))
    .rows[0].id
  otherWheelId = (
    await db.query("select id from parts where sku='467-885-6538'")
  ).rows[0].id
  foreignPartId = (
    await db.query("select id from parts where sku='32016-AT123'")
  ).rows[0].id
}, 30000)
afterAll(async () => db?.close())
const asUser = async (id) => {
  await db.exec('reset role')
  await db.query("select set_config('app.user_id',$1,false)", [id])
  await db.exec('set role authenticated')
}
const insert = (ids) =>
  db.query(
    `insert into builds(vehicle_id,part_ids,paint_color) values ($1,$2,'#2876d7') returning id`,
    [vehicleId, ids],
  )
describe('Supabase migration and PostgreSQL policies', () => {
  it('is re-runnable and preserves legacy rows while seeding normalized fitment', async () => {
    expect(
      (await db.query('select count(*)::int n from vehicles')).rows[0].n,
    ).toBe(6)
    expect(
      (await db.query('select count(*)::int n from parts')).rows[0].n,
    ).toBe(9)
    expect(
      (await db.query('select name from parts where id=1')).rows[0].name,
    ).toBe('Preserved legacy engine')
    expect(
      (await db.query('select car_make from compatibility where part_id=1'))
        .rows[0].car_make,
    ).toBe('Acura')
    const rows = (await db.query('select * from render_variants')).rows
    expect(rows).toHaveLength(Object.keys(RENDER_PRESETS).length)
    for (const row of rows)
      expect(
        RENDER_PRESETS[`${row.visual_category}:${row.render_key}`].slot,
      ).toBe(row.slot)
  })
  it('allows anonymous catalog reads but forbids build and catalog writes', async () => {
    await db.exec('set role anon')
    expect((await db.query('select * from vehicles')).rows).toHaveLength(6)
    await expect(db.query('select * from builds')).rejects.toThrow(
      'permission denied',
    )
    await expect(
      db.query("insert into parts(name,type) values ('bad','bad')"),
    ).rejects.toThrow('permission denied')
    await db.exec('reset role')
  })
  it('saves a build under auth.uid and restricts reads to that user', async () => {
    await asUser(userA)
    buildId = (await insert([wheelId])).rows[0].id
    expect(
      (await db.query('select user_id from builds where id=$1', [buildId]))
        .rows[0].user_id,
    ).toBe(userA)
    await asUser(userB)
    expect(
      (await db.query('select * from builds where id=$1', [buildId])).rows,
    ).toEqual([])
    await expect(
      db.query(
        `insert into builds(user_id,vehicle_id,part_ids,paint_color) values ($1,$2,'{}','#2876d7')`,
        [userA, vehicleId],
      ),
    ).rejects.toThrow('permission denied')
  })
  it('rejects direct writes with incompatible, duplicate, conflicting or null parts', async () => {
    await asUser(userA)
    for (const ids of [
      [foreignPartId],
      [wheelId, wheelId],
      [wheelId, otherWheelId],
      [null],
      [99999],
    ])
      await expect(insert(ids)).rejects.toThrow('compatible')
    await expect(
      db.query(`insert into builds(vehicle_id,paint_color) values ($1,'red')`, [
        vehicleId,
      ]),
    ).rejects.toThrow()
    expect((await insert([])).rows).toHaveLength(1)
  })
})
