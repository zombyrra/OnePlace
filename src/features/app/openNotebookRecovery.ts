export const shouldOfferFolderImportAfterOpenFailure = (message: string) =>
  /missing\s+notebook\.json/i.test(message) && /OnePlace notebook/i.test(message)
