import * as cheerio from 'cheerio'
import { nanoid } from 'nanoid'

export interface Bookmarks {
  key: string
  type: string
  name: string
  href: string
  icon: string
  path?: string
  children?: Bookmarks[]
}

interface Folder extends Bookmarks {
  type: 'folder'
  children?: Bookmarks[]
}

interface Site extends Bookmarks {
  type: 'site'
  children?: Bookmarks[]
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

const toJSON = (content: string): Bookmarks[] => {
  const $ = cheerio.load(content, { decodeEntities: false })

  const body = $('body')
  const root: Bookmarks[] = []
  if (!body) return root
  const rdt = getRootFolder(body)?.children('dt')

  const parseNode = (node: cheerio.Cheerio<cheerio.Element>, p: string): Bookmarks => {
    const eq = node.children().eq(0)

    const key = nanoid()
    const name = eq.html() || ''
    let type = 'site'
    let href = ''
    let icon = ''
    let path = p
    let children: Bookmarks[] = []

    if (eq[0].name === 'h3') {
      type = 'folder'
      path = `${p}/${name}`
      const dl = node.children('dl').first()
      const dts = dl.children()
      const ls = dts.toArray().map(ele => {
        if (ele.name !== 'dt') return null
        return parseNode($(ele), path)
      })
      children = ls.filter(item => item !== null) as Bookmarks[]
    }
    if (eq[0].name === 'a') {
      type = 'site'
      href = eq.attr('href') || ''
      icon = eq.attr('icon') || ''
      path = `${p}/${name}`
    }

    const doc: Bookmarks = { key, type, name, href, icon, path }
    if (children.length !== 0) {
      doc.children = children
    }
    return doc
  }

  rdt.each((_, item) => {
    const node = $(item)
    const child = parseNode(node, '')
    root.push(child)
  })

  return root
}

const updateJSON = (data: Bookmarks[], val: Bookmarks): Bookmarks[] => {
  const key = val.key
  console.log(val, val.path, '=====  val =====')
  const path = val.path?.split('/')
  console.log(path)
  const arr = [...data]

  return arr
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
  updateJSON,
  toHTML,
  getList,
  getRepeat
}
