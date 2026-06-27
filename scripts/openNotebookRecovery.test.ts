import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldOfferFolderImportAfterOpenFailure } from '../src/features/app/openNotebookRecovery.ts'

test('open notebook failure can recover by importing ordinary document folders', () => {
  assert.equal(
    shouldOfferFolderImportAfterOpenFailure(
      'Selected folder is not a OnePlace notebook: missing notebook.json. Use Folder import for ordinary document folders.',
    ),
    true,
  )
  assert.equal(
    shouldOfferFolderImportAfterOpenFailure(
      'Notebook section file is invalid or missing (sections/group__section.json): The system cannot find the file specified. (os error 2)',
    ),
    false,
  )
})
