import * as cheerio from 'cheerio'

interface Record {
  [key: string]: string | undefined
}

export interface BookmarkProperties extends Record {
  ADD_DATE?: string
  LAST_MODIFIED?: string
  ICON?: string
  ICON_URI?: string
  SHORTCUT_URL?: string
  TAGS?: string
}

export interface Bookmark {
  href: string
  name: string
  properties?: BookmarkProperties
}

export interface FolderProperties extends Record {
  ADD_DATE?: string
  LAST_MODIFIED?: string
  PERSONAL_TOOLBAR_FOLDER?: 'true' | 'false'
}

export interface Folder {
  name: string
  children: (Bookmark | Folder)[]
  properties?: FolderProperties
}

const HEADER = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>`

// 获取不同浏览器的书签内容
const getRootFolder = (body: cheerio.Cheerio<cheerio.Element>) => {
  const h3 = body.find('h3').first()

  const isChrome = typeof h3.attr('personal_toolbar_folder') === 'string'
  if (isChrome) return body.children('dl').first()

  const isSafari = typeof h3.attr('folded') === 'string'
  if (isSafari) return body

  const isIE = typeof h3.attr('item_id') === 'string'
  if (isIE) return body.children('dl').first()

  const isFireFox = h3.text() === 'Mozilla Firefox'
  if (isFireFox) return body.children('dl').first()

  return body.children('dl').first()
}

const toJSON = (content: string): (Bookmark | Folder)[] => {
  const $ = cheerio.load(content, { decodeEntities: false })

  const body = $('body')
  const root: (Bookmark | Folder)[] = []
  if (!body) return root
  const rdt = getRootFolder(body)?.children('dt')

  console.log('to json')
  return root
}

const toHTML = (): string => {
  console.log('toHTML')
  return HEADER
}

const getList = (): void => {
  console.log('get list')
}

const getRepeat = (): void => {
  console.log('get repeat')
}

export {
  toJSON,
  toHTML,
  getList,
  getRepeat
}
