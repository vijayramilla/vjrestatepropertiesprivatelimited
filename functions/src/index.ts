import * as functions from 'firebase-functions'
import * as https from 'https'
import * as http from 'http'

function followRedirects(
  url: string,
  redirectCount = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) {
      return reject(new Error('Too many redirects'))
    }
    const isHttps = url.startsWith('https')
    const lib = isHttps ? https : http
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)'
      }
    }, (res) => {
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        let location = res.headers.location
        if (location.startsWith('/')) {
          const parsed = new URL(url)
          location = `${parsed.protocol}//${parsed.host}${location}`
        }
        resolve(followRedirects(location, redirectCount + 1))
      } else {
        resolve(url)
      }
    })
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
  })
}

function extractCoords(
  url: string
): { lat: number; lng: number } | null {
  const patterns = [
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[2])
      }
    }
  }
  return null
}

export const resolveMapUrl = functions
  .region('asia-south1')
  .https.onCall(async (data) => {
    const { url } = data
    if (!url) {
      throw new functions.https.HttpsError(
        'invalid-argument', 'URL required'
      )
    }
    try {
      const finalUrl = await followRedirects(url)
      const coords = extractCoords(finalUrl)
      return { success: true, finalUrl, coords }
    } catch (err: any) {
      throw new functions.https.HttpsError(
        'internal', err.message
      )
    }
  })
