// ElevenLabs API Mock for testing
export const mockElevenLabsResponse = {
  audio: Buffer.from('mock-audio-data'),
  headers: {
    'content-type': 'audio/mpeg'
  }
}

export const mockElevenLabsError = {
  error: {
    detail: {
      status: 'detected_unusual_activity',
      message: 'Unusual activity detected'
    }
  }
}

export const mockFetch = jest.fn()

export const setupElevenLabsMock = (shouldSucceed = true) => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('elevenlabs.io')) {
      if (shouldSucceed) {
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(mockElevenLabsResponse.audio),
          headers: new Map(Object.entries(mockElevenLabsResponse.headers))
        })
      } else {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve(mockElevenLabsError)
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

export const resetMocks = () => {
  jest.clearAllMocks()
}