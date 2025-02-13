import fs from 'node:fs'
import path from 'node:path'

import { generateMappingTable } from './_utils'

const filePath = path.join(__dirname, 'mappingTable.json')

fs.writeFile(
  filePath,
  JSON.stringify(generateMappingTable(), null, 2),
  (err) => {
    if (err) throw err
    console.log(`Mapping table saved to file: ${filePath}`)
  },
)
