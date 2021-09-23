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
  function getItem (child: Bookmarks[], num: number) {
    child.forEach(item => {
      if (item.key === key) {
        item = val
      } else {
        if (item.name === path[num] && item.children) {
          idx++
          getItem(item.children, idx)
        }
      }
    })
    return child
  }
  getItem(arr, idx)
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
  getSite(d)
  return arr
}

// 获取目录树
const getFolderTree = (data: Bookmarks[]): Bookmarks[] => {
  const root: Bookmarks[] = []
  const arr = [...data]

  const parseNode = (child: Bookmarks): Bookmarks | null => {
    if (child.type === 'site') return null
    const key = child.key
    const name = child.name
    const type = 'folder'
    const href = ''
    const icon = ''
    const path = child.path
    let children: Bookmarks[] = []

    const cdc = child.children
    if (cdc) {
      const ls = cdc.map(item => {
        if (item.type === 'site') return null
        return parseNode(item)
      })
      children = ls.filter(item => item !== null) as Bookmarks[]
    }

    const doc: Bookmarks = { key, type, name, href, icon, path }
    if (children.length) doc.children = children
    return doc
  }

  arr.forEach(item => {
    const child = parseNode(item)
    if (child) root.push(child)
  })

  return root
}

// 删除单个书签
const deleteBM = (data: Bookmarks[], val: Bookmarks): Bookmarks[] => {
  const key = val.key
  const arr = [...data]
  function deleteItem (child: Bookmarks[]) {
    for (let i = 0; i < child.length; i++) {
      if (child[i].key === key) {
        child.splice(i, 1)
        return child
      } else {
        const cd = child[i].children
        if (cd) deleteItem(cd)
      }
    }
  }
  deleteItem(arr)
  return arr
}

// 移动书签到其他目录
const moveBM = (data: Bookmarks[], key: string, val: Bookmarks): Bookmarks[] => {
  let arr = [...data]
  arr = deleteBM(arr, val)
  function addItem (child: Bookmarks[]) {
    child.forEach(item => {
      if (item.key === key) {
        if (item.children) item.children.push(val)
      } else {
        if (item.children) addItem(item.children)
      }
    })
  }
  addItem(arr)
  return arr
}

// 通过书签的路径，获取父目录的 key
const getFolderKey = (data: Bookmarks[], path: string): string => {
  const arr = [...data]
  let key = ''
  const p = path.substr(0, path.length - 1)
  function findItem (child: Bookmarks[]) {
    for (let i = 0; i < child.length; i++) {
      if (child[i].path === p) {
        key = child[i].key
        return key
      } else {
        const cd = child[i].children
        if (cd) findItem(cd)
      }
    }
  }
  findItem(arr)
  return key
}

const toHTML = (): string => {
  console.log('toHTML')
  return HEADER
}

const getRepeat = (data: Bookmarks[]): Bookmarks[] => {
  const arr = [...data]
  const repeatArr: Bookmarks[] = []

  function checkItem (d: Bookmarks[]) {
    if (d.length <= 1) return false
    const drr = [...d]
    const first = d[0]
    const a = d.filter(item => {
      return item.href === first.href
    })

    if (a.length > 1) {
      for (let i = a.length - 1; i >= 0; i--) {
        const n = drr.findIndex(item => item.key === a[i].key)
        if (n < 0) return false
        repeatArr.push(a[i])
        drr.splice(n, 1)
      }
    } else {
      drr.shift()
    }
    checkItem(drr)
  }
  checkItem(arr)
  return repeatArr
}

export {
  toJSON,
  updateJSON,
  getFlatList,
  getFolderTree,
  getFolderKey,
  deleteBM,
  moveBM,
  toHTML,
  getRepeat
}
