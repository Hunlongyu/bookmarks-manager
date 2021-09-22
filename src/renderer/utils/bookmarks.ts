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

// 转为书签 JSON
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
      path = `${p}/`
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

// 更新书签
const updateJSON = (data: Bookmarks[], val: Bookmarks): Bookmarks[] => {
  const key = val.key
  if (!val.path) return data
  const path = val.path.split('/')
  const arr = [...data]
  let idx = 1
  function getItem (child: Bookmarks[], idx: number) {
    child.forEach(item => {
      if (item.key === key) {
        item = val
      } else {
        if (item.name === path[idx] && item.children) {
          idx++
          getItem(item.children, idx)
        }
      }
    })
    return child
  }
  arr.forEach(item => {
    if (item.name === path[idx]) {
      if (item.key === key) {
        item = val
      } else {
        idx++
        if (item.children && idx <= path.length) {
          getItem(item.children, idx)
        }
      }
    }
  })
  return arr
}

// 获取扁平书签列表
const getFlatList = (data: Bookmarks[]): Bookmarks[] => {
  const d = [...data]
  const arr: Bookmarks[] = []
  function getSite (child: Bookmarks[]) {
    for (const i of child) {
      if (i.type === 'site') {
        arr.push(i)
      } else {
        if (i.type === 'folder' && i.children) {
          getSite(i.children)
        }
      }
    }
  }
  d.forEach(item => {
    if (item.type === 'site') {
      arr.push(item)
    } else {
      if (item.type === 'folder' && item.children) {
        getSite(item.children)
      }
    }
  })
  return arr
}

const toHTML = (): string => {
  console.log('toHTML')
  return HEADER
}

const getRepeat = (): void => {
  console.log('get repeat')
}

export {
  toJSON,
  updateJSON,
  getFlatList,
  toHTML,
  getRepeat
}
