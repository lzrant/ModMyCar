import { randomUUID } from 'node:crypto'
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
const catalog = JSON.parse(
  await readFile(new URL('./catalog.json', import.meta.url), 'utf8'),
)
/** Disk-backed development repository. A serialized atomic write prevents concurrent lost saves. */
export async function createLocalStore(filePath) {
  let builds = []
  try {
    builds = JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  let writes = Promise.resolve()
  return {
    mode: 'local',
    async vehicles() {
      return catalog.vehicles
    },
    async parts(vehicleId, category) {
      const ids = catalog.compatibility
        .filter((c) => c.vehicle_id === vehicleId)
        .map((c) => c.part_id)
      return catalog.parts.filter(
        (p) =>
          ids.includes(p.id) && (!category || p.visual_category === category),
      )
    },
    async listBuilds(owner) {
      await writes
      return builds
        .filter((b) => b.owner === owner)
        .map(publicBuild)
        .reverse()
    },
    async getBuild(owner, id) {
      await writes
      const b = builds.find((b) => b.owner === owner && b.id === id)
      return b ? publicBuild(b) : null
    },
    async saveBuild(owner, payload) {
      const build = {
        ...payload,
        id: randomUUID(),
        created_at: new Date().toISOString(),
        owner,
      }
      const write = writes.then(async () => {
        const next = [...builds, build]
        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(`${filePath}.tmp`, JSON.stringify(next), {
          mode: 0o600,
        })
        await rename(`${filePath}.tmp`, filePath)
        builds = next
      })
      writes = write.catch(() => {})
      await write
      return publicBuild(build)
    },
  }
}
function publicBuild(build) {
  const { id, created_at, vehicle_id, part_ids, paint_color } = build
  return { id, created_at, vehicle_id, part_ids, paint_color }
}
