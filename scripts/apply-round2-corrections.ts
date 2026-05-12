import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) envVars[match[1].trim()] = match[2].trim()
})

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

interface ComponentRow {
  id: string
  ingredient_code: string
  inci_name_en: string | null
  inci_name_kr: string | null
  cas_number: string | null
  composition_ratio: number | null
  component_order: number | null
  function: string | null
}

async function getComponents(code: string): Promise<ComponentRow[]> {
  const { data, error } = await supabase
    .from('labdoc_ingredient_components')
    .select('*')
    .eq('ingredient_code', code)
    .order('component_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch ${code}: ${error.message}`)
  return (data ?? []) as ComponentRow[]
}

async function updateComponent(id: string, updates: Partial<ComponentRow>) {
  const { error } = await supabase
    .from('labdoc_ingredient_components')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(`Failed to update ${id}: ${error.message}`)
}

async function insertComponent(data: Omit<ComponentRow, 'id'>) {
  const { error } = await supabase
    .from('labdoc_ingredient_components')
    .insert(data)

  if (error) throw new Error(`Failed to insert component for ${data.ingredient_code}: ${error.message}`)
}

async function deleteComponent(id: string) {
  const { error } = await supabase
    .from('labdoc_ingredient_components')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete ${id}: ${error.message}`)
}

async function correctMVC0010() {
  console.log('\n── MVC-0010 (Esaflor EC3) ──')
  const comps = await getComponents('MVC-0010')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    if (comp.inci_name_en?.includes('Guar')) {
      await updateComponent(comp.id, { composition_ratio: 90 })
      console.log(`  ✅ Updated ${comp.inci_name_en}: 0 → 90`)
    } else if (comp.inci_name_en?.includes('Water')) {
      await updateComponent(comp.id, { composition_ratio: 10 })
      console.log(`  ✅ Updated ${comp.inci_name_en}: 0 → 10`)
    }
  }
}

async function correctMAN0011() {
  console.log('\n── MAN-0011 (Nanoactive RAL) ──')
  const comps = await getComponents('MAN-0011')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    const name = (comp.inci_name_en ?? '').toLowerCase()
    if (name.includes('retinal')) {
      await updateComponent(comp.id, {
        composition_ratio: 1.0,
        cas_number: '116-31-4',
      })
      console.log(`  ✅ Updated Retinal: ratio → 1.0`)
    } else if (name.includes('lecithin') || name.includes('phospholipid')) {
      await updateComponent(comp.id, {
        inci_name_en: 'Phospholipids',
        composition_ratio: 3.5,
        cas_number: '123465-35-0',
      })
      console.log(`  ✅ Updated Lecithin → Phospholipids: ratio → 3.5`)
    } else if (name.includes('caprylic') || name.includes('triglyceride')) {
      await updateComponent(comp.id, {
        inci_name_en: 'Caprylic/capric/linoleic triglyceride',
        composition_ratio: 26.5,
        cas_number: '65381-09-01',
      })
      console.log(`  ✅ Updated Caprylic/Capric Triglyceride → Caprylic/capric/linoleic triglyceride: ratio → 26.5`)
    } else if (name.includes('ascorbic')) {
      await updateComponent(comp.id, {
        inci_name_en: 'Ascorbic acid',
        composition_ratio: 0.2,
        cas_number: '50-81-7',
      })
      console.log(`  ✅ Updated Ascorbic Acid: ratio → 0.2`)
    } else if (name.includes('glycerin')) {
      await updateComponent(comp.id, {
        inci_name_en: 'Glycerin',
        composition_ratio: 35,
        cas_number: '56-81-5',
      })
      console.log(`  ✅ Updated Glycerin: ratio → 35`)
    } else if (name.includes('water') || name.includes('aqua')) {
      await updateComponent(comp.id, {
        inci_name_en: 'Aqua',
        composition_ratio: 33.8,
        cas_number: '7732-18-5',
      })
      console.log(`  ✅ Updated Water → Aqua: ratio → 33.8`)
    }
  }
}

async function correctMOF0006() {
  console.log('\n── MOF-0006 (Florasun-90) ──')
  const comps = await getComponents('MOF-0006')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    if (comp.inci_name_en?.includes('Helianthus') || comp.inci_name_en?.includes('Sunflower')) {
      await updateComponent(comp.id, { composition_ratio: 99.95 })
      console.log(`  ✅ Updated ${comp.inci_name_en}: 0 → 99.95`)
    } else if (comp.inci_name_en?.includes('Tocopherol')) {
      await updateComponent(comp.id, { composition_ratio: 0.05 })
      console.log(`  ✅ Updated ${comp.inci_name_en}: 0 → 0.05`)
    }
  }
}

async function correctMSE0025() {
  console.log('\n── MSE-0025 (Eumulgin HPS) ──')
  const comps = await getComponents('MSE-0025')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    const name = (comp.inci_name_en ?? '').toLowerCase()
    if (name.includes('coceth')) {
      await updateComponent(comp.id, {
        composition_ratio: 39.02,
        cas_number: '61791-13-7',
      })
      console.log(`  ✅ Updated Coceth-7: ratio → 39.02`)
    } else if (name.includes('ppg') && name.includes('lauryl')) {
      await updateComponent(comp.id, {
        composition_ratio: 39.02,
        cas_number: '154248-98-3',
      })
      console.log(`  ✅ Updated PPG-1-PEG-9 Lauryl Glycol Ether: ratio → 39.02`)
    } else if (name.includes('peg-40') || name.includes('castor')) {
      await updateComponent(comp.id, {
        composition_ratio: 14.64,
        cas_number: '61788-85-0',
      })
      console.log(`  ✅ Updated PEG-40 Hydrogenated Castor Oil: ratio → 14.64`)
    }
  }

  const hasWater = comps.some(c => (c.inci_name_en ?? '').toLowerCase().includes('water') || (c.inci_name_en ?? '').toLowerCase().includes('aqua'))
  if (!hasWater) {
    const maxOrder = Math.max(...comps.map(c => c.component_order ?? 0))
    await insertComponent({
      ingredient_code: 'MSE-0025',
      inci_name_en: 'Water',
      inci_name_kr: null,
      cas_number: '7732-18-5',
      composition_ratio: 7.32,
      component_order: maxOrder + 1,
      function: null,
    })
    console.log(`  ✅ Inserted Water: ratio → 7.32 (order ${maxOrder + 1})`)
  } else {
    console.log(`  ℹ️ Water already exists — skipping insert`)
  }
}

async function correctMVA0007() {
  console.log('\n── MVA-0007 (Adekanol GT-730) ──')
  const comps = await getComponents('MVA-0007')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    const name = (comp.inci_name_en ?? '').toLowerCase()
    if (name.includes('peg-240') || name.includes('hdi')) {
      await updateComponent(comp.id, {
        composition_ratio: 29.94,
        cas_number: '283175-22-4',
      })
      console.log(`  ✅ Updated PEG-240/HDI...: ratio → 29.94`)
    } else if (name.includes('butylene')) {
      await updateComponent(comp.id, {
        composition_ratio: 50,
        cas_number: '107-88-0',
      })
      console.log(`  ✅ Updated Butylene Glycol: ratio → 50`)
    } else if (name.includes('water') || name.includes('aqua')) {
      await updateComponent(comp.id, {
        composition_ratio: 20,
        cas_number: '7732-18-5',
      })
      console.log(`  ✅ Updated Water: ratio → 20`)
    }
  }

  const maxOrder = Math.max(...comps.map(c => c.component_order ?? 0))
  const existingNames = comps.map(c => (c.inci_name_en ?? '').toLowerCase())

  if (!existingNames.some(n => n.includes('potassium laurate'))) {
    await insertComponent({
      ingredient_code: 'MVA-0007',
      inci_name_en: 'Potassium Laurate',
      inci_name_kr: null,
      cas_number: '10124-65-9',
      composition_ratio: 0.03,
      component_order: maxOrder + 1,
      function: null,
    })
    console.log(`  ✅ Inserted Potassium Laurate: ratio → 0.03`)
  }

  if (!existingNames.some(n => n.includes('tocopherol'))) {
    await insertComponent({
      ingredient_code: 'MVA-0007',
      inci_name_en: 'Tocopherol',
      inci_name_kr: null,
      cas_number: '1406-18-4',
      composition_ratio: 0.03,
      component_order: maxOrder + 2,
      function: null,
    })
    console.log(`  ✅ Inserted Tocopherol: ratio → 0.03`)
  }
}

async function correctMVB0003() {
  console.log('\n── MVB-0003 (Bentone Gel VS5PC-V) ──')
  const comps = await getComponents('MVB-0003')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio})`).join(', '))

  for (const comp of comps) {
    const name = (comp.inci_name_en ?? '').toLowerCase()
    if (name.includes('cyclopentasiloxane')) {
      await updateComponent(comp.id, {
        composition_ratio: 80.65,
        cas_number: '541-02-6',
      })
      console.log(`  ✅ Updated Cyclopentasiloxane: ratio → 80.65`)
    } else if (name.includes('hectorite')) {
      await updateComponent(comp.id, {
        composition_ratio: 13.44,
        cas_number: '94891-31-3',
      })
      console.log(`  ✅ Updated Disteardimonium Hectorite: ratio → 13.44`)
    } else if (name.includes('propylene carbonate')) {
      await updateComponent(comp.id, {
        composition_ratio: 5.91,
        cas_number: '108-32-7',
      })
      console.log(`  ✅ Updated Propylene Carbonate: ratio → 5.91`)
    }
  }
}

async function correctMPS0001() {
  console.log('\n── MPS-0001 (Spectrastat) ──')
  const comps = await getComponents('MPS-0001')
  console.log('  Before:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio}, order=${c.component_order})`).join(', '))

  // Move all to temp orders (100+) to avoid unique constraint on (ingredient_code, component_order)
  for (let i = 0; i < comps.length; i++) {
    await updateComponent(comps[i].id, { component_order: 100 + i })
  }

  for (const comp of comps) {
    const name = (comp.inci_name_en ?? '').toLowerCase()
    if (name.includes('caprylyl glycol')) {
      await updateComponent(comp.id, { composition_ratio: 70, component_order: 0, cas_number: '1117-86-8' })
      console.log(`  ✅ Caprylyl Glycol: ratio → 70, order → 0`)
    } else if (name.includes('glycerin') && !name.includes('caprylyl')) {
      await updateComponent(comp.id, { composition_ratio: 15, component_order: 1, cas_number: '56-81-5' })
      console.log(`  ✅ Glycerin: ratio → 15, order → 1`)
    } else if (name.includes('caprylhydroxamic')) {
      await updateComponent(comp.id, { composition_ratio: 15, component_order: 2, cas_number: '7377-03-9' })
      console.log(`  ✅ Caprylhydroxamic Acid: ratio → 15, order → 2`)
    }
  }
}

async function correctMPK0001() {
  console.log('\n── MPK-0001 (Kathon CG) — INCI name update only, no ratios ──')
  const comps = await getComponents('MPK-0001')
  console.log('  Current:', comps.map(c => `${c.inci_name_en}(${c.composition_ratio}, order=${c.component_order})`).join(', '))

  for (const comp of comps) {
    await deleteComponent(comp.id)
    console.log(`  🗑️ Deleted: ${comp.inci_name_en} (${comp.id})`)
  }

  const newComponents = [
    { name: '5-Chloro-2-methyl-4-isothiazolin-3-one', cas: '26172-55-4', order: 0 },
    { name: '2-Methyl-4-isothiazolin-3-one', cas: '2682-20-4', order: 1 },
    { name: 'Magnesium Chloride', cas: '7786-30-3', order: 2 },
    { name: 'Magnesium dinitrate', cas: '10377-60-3', order: 3 },
    { name: 'Water', cas: '7732-18-5', order: 4 },
  ]

  for (const comp of newComponents) {
    await insertComponent({
      ingredient_code: 'MPK-0001',
      inci_name_en: comp.name,
      inci_name_kr: null,
      cas_number: comp.cas,
      composition_ratio: null,
      component_order: comp.order,
      function: null,
    })
    console.log(`  ✅ Inserted: ${comp.name} (ratio=null, order=${comp.order})`)
  }

  console.log('  ⚠️  WARNING: No ratios available for MPK-0001. Each component defaults to 100% (=500% total).')
  console.log('  ⚠️  This will still show as a problem in analysis. Supplier needs to provide ratios.')
}

async function verify() {
  console.log('\n\n════════════════════════════════════')
  console.log('  VERIFICATION')
  console.log('════════════════════════════════════\n')

  const codes = ['MVC-0010', 'MAN-0011', 'MOF-0006', 'MSE-0025', 'MVA-0007', 'MVB-0003', 'MPS-0001', 'MPK-0001']
  
  for (const code of codes) {
    const comps = await getComponents(code)
    const ratioSum = comps.reduce((s, c) => s + (c.composition_ratio ?? 100), 0)
    const status = Math.abs(ratioSum - 100) < 0.01 ? '✅' : '⚠️'
    console.log(`${status} ${code}: ${comps.length} components, ratio sum = ${ratioSum}`)
    comps.forEach(c => {
      console.log(`     ${c.component_order}: ${c.inci_name_en} — ratio=${c.composition_ratio ?? 'null(→100)'}, CAS=${c.cas_number}`)
    })
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  ROUND 2: Composition Corrections')
  console.log('  8 ingredients from supplier data')
  console.log('═══════════════════════════════════════')

  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE — showing current state only\n')
    const codes = ['MVC-0010', 'MPK-0001', 'MAN-0011', 'MOF-0006', 'MSE-0025', 'MVA-0007', 'MVB-0003', 'MPS-0001']
    for (const code of codes) {
      const comps = await getComponents(code)
      const ratioSum = comps.reduce((s, c) => s + (c.composition_ratio ?? 100), 0)
      console.log(`\n${code}: ${comps.length} components, ratio sum = ${ratioSum}`)
      comps.forEach(c => {
        console.log(`  [${c.id}] order=${c.component_order}: ${c.inci_name_en} — ratio=${c.composition_ratio}, CAS=${c.cas_number}`)
      })
    }
    return
  }

  await correctMVC0010()
  await correctMAN0011()
  await correctMOF0006()
  await correctMSE0025()
  await correctMVA0007()
  await correctMVB0003()
  await correctMPS0001()
  await correctMPK0001()

  await verify()

  console.log('\n✅ All Round 2 corrections applied!')
  console.log('⚠️  MPK-0001 still has no ratios — will remain flagged until supplier provides data.')
}

main().catch(console.error)
