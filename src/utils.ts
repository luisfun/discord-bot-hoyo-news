import text from './locale.json'

export type Game = keyof typeof text.game
export const games = Object.keys(text.game) as Game[]

export const t = (textJson: Record<string, string>, locale: string) => {
  const textLocales = Object.keys(textJson)
  const textLoc = localeFind(textLocales, locale)
  if (textLoc) return textJson[textLoc]
  return 'Failed to load text.'
}

const localeFind = (locales: string[], a: string) => locales.find(loc => localeMatch(loc, a))

const localeMatch = (a: string, b: string) => {
  if (a === '' || b === '') return false
  const arrA = a.toLowerCase().split('-')
  const arrB = b.toLowerCase().split('-')
  for (let i = 0, len = Math.max(arrA.length, arrB.length); i < len; i++) {
    if (arrA[i] && arrB[i] && arrA[i] !== arrB[i]) return false
  }
  return true
}

export const titleFilter = (title: string, filter_words: string | undefined) => {
  if (!filter_words || filter_words === '') return true
  const words = filter_words.split(',').map(e => e.trim())
  for (const word of words) {
    if (title.includes(word)) return true
  }
  return false
}

type ApiResponse = {
  res: Response
  xRateLimit: {
    RetryAfter: string | null
    Limit: string | null
    Remaining: string | null
    Reset: string | null
    ResetAfter: string | null
    Bucket: string | null
    Scope: string | null
    Global: string | null
  }
}
export const apiWait = async (apiRes: ApiResponse | undefined) => {
  if (!apiRes) return null
  if (apiRes.res.status === 429) {
    const ms = Number(apiRes.xRateLimit.RetryAfter || 60) * 1000
    console.log('===== RateLimit =====\n', apiRes.xRateLimit, '\n===== RateLimit =====')
    await sleep(ms)
  } else {
    const ms = (5 - Number(apiRes.xRateLimit.Remaining || 5)) * 200
    await sleep(ms)
  }
  return null
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, Math.max(ms, 0)))
