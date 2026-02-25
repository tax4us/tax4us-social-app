// Airtable API Mock for testing
export const mockAirtableRecord = {
  id: 'recABC123',
  fields: {
    topic: 'Remote Work Tax Compliance',
    audience: 'US citizens in Israel',
    keywords: 'remote work, taxation, FBAR, dual citizenship',
    status: 'approved',
    priority: 'high',
    category: 'Tax Planning',
    created_at: '2026-02-25T18:00:00Z',
    hebrew_post_id: null,
    english_post_id: null
  },
  createdTime: '2026-02-25T18:00:00Z'
}

export const mockPublishedRecord = {
  ...mockAirtableRecord,
  fields: {
    ...mockAirtableRecord.fields,
    status: 'completed',
    hebrew_post_id: 12345,
    english_post_id: 12346,
    completed_at: '2026-02-25T19:00:00Z'
  }
}

export const setupAirtableMock = (records = [mockAirtableRecord]) => {
  global.fetch = jest.fn().mockImplementation((url: string, options: any) => {
    if (url.includes('airtable.com')) {
      const method = options?.method || 'GET'
      
      switch (method) {
        case 'GET':
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              records: records
            })
          })
        
        case 'POST':
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              id: 'recNEW123',
              fields: JSON.parse(options.body).fields,
              createdTime: new Date().toISOString()
            })
          })
          
        case 'PATCH':
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              ...mockAirtableRecord,
              fields: {
                ...mockAirtableRecord.fields,
                ...JSON.parse(options.body).fields
              }
            })
          })
          
        default:
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({})
          })
      }
    }
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    })
  })
}