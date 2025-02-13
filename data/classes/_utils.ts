import { camelCase } from 'lodash'
import Papa from 'papaparse'

import { ClassMechanic } from './_types'
import { CLASS_MECHANICS_TABLE } from './class-mechanics-table'

export const loadClassMechanicsData = (playerClass?: string) => {
  const parseResult = Papa.parse<ClassMechanic>(
    CLASS_MECHANICS_TABLE.trim(),
    {
      delimiter: ',',
      header: true,
      transformHeader: (header: string) => {
        return camelCase(header)
      },
      transform(value: string, field: string): any {
        if (field.includes('value')) {
          return value ? parseInt(value) : value
        }

        return value
      },
    },
  )

  if (playerClass)
    return parseResult.data.filter((row) => row.class === playerClass)

  return parseResult.data
}
