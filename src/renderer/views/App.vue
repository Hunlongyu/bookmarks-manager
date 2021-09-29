<template>
  <div class="main">
    <Frame />
    <div class="main-header">
      <n-input-group>
        <n-input :style="{ width: '50%' }" :value="filePath" />
        <n-button ghost @click="selectBookmarksFile">{{t('selectBookmarksFile')}}</n-button>
      </n-input-group>
      <n-switch v-model:value="tableSwitch" @update:value="changeTableType"></n-switch>
      <n-button class="repeat" :type="repeatShow ? 'primary' : 'default'" :ghost="!repeatShow" @click="checkRepeatBM">{{t('checkRepeatBookmarks')}}</n-button>
      <n-button class="invalid" ghost @click="checkInvalidBM">{{t('checkInvalidBookmarks')}}</n-button>
      <n-button class="invalid" @click="saveEvent" type="info" ghost>{{t('save')}}</n-button>
    </div>
    <div class="main-content" id="body">
      <div class="main-content-wrapper">
        <n-data-table @update:checked-row-keys="handleCheck" :columns="columns" :data="data" max-height="100%" size="small" v-if="!flat && !repeatShow"/>
        <n-data-table @update:checked-row-keys="handleCheck" :columns="flatColumns" :data="flatData" max-height="100%" virtual-scroll :pagination="pagination" v-if="flat && !repeatShow" size="small" />
        <n-data-table @update:checked-row-keys="handleCheck" :columns="flatColumns" :data="repeatData" max-height="100%" virtual-scroll v-if="repeatShow" size="small" />
      </div>
    </div>
    <div class="main-footer">
      <div class="main-footer-left">
        <n-button v-show="checkedRowKeys.length > 1" @click="batchDeleteEvent">{{t('batchDelete')}}</n-button>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button v-show="checkedRowKeys.length > 1" class="batchOpen" @click="batchOpenEvent">{{t('batchOpen')}}</n-button>
          </template>
          {{t('batchOpenWarning')}}
        </n-tooltip>
      </div>
      <div class="main-footer-right">
        <n-button @click="configShow = true">{{t('setting')}}</n-button>
      </div>
    </div>
    <div class="main-file"></div>
    <n-modal v-model:show="showEditItemModle" preset="dialog">
      <template #header>{{t('edit')}}</template>
      <div>
        <n-form :model="model" :rules="rules">
          <n-form-item path="name" :label="t('tbName')">
            <n-input v-model:value="model.name" @keydown.enter.prevent />
          </n-form-item>
          <n-form-item path="href" :label="t('tbHref')">
            <n-input v-model:value="model.href" @keydown.enter.prevent />
          </n-form-item>
        </n-form>
        <label>{{t('tbPath')}}</label>
        <n-tree-select :options="tree" label-field="name" default-expand-all clearable v-model:value="selectTree" />
      </div>
      <template #action>
        <n-button size="small" @click="showEditItemModle === false">{{t('cancel')}}</n-button>
        <n-button size="small" @click="updateData">{{t('confirm')}}</n-button>
      </template>
    </n-modal>
    <n-drawer
      v-model:show="invalidShow"
      width="90%"
      placement="right">
      <n-drawer-content :title="t('checkInvalidBookmarks')">
        <div class="state">
          {{t('scanTime')}}{{(timeend / 1000).toFixed(2)}} s
          <n-progress :key="progress.pass" type="line" status="info" :percentage="progress.passP">{{t('effective')}}: {{progress.pass}} / {{progress.total}}</n-progress>
          <n-progress type="line" status="warning" :percentage="progress.failP">{{t('invalid')}}: {{progress.fail}} / {{progress.total}}</n-progress>
        </div>
        <div class="table">
          <n-data-table :loading="invalidLoading" :columns="flatColumns" :data="invalidData" max-height="100%" size="small"/>
        </div>
      </n-drawer-content>
    </n-drawer>
    <n-drawer
      v-model:show="configShow"
      width="40%"
      placement="right">
      <n-drawer-content :title="t('setting')">
        <div class="language">
          {{t('language')}}:
          <n-select v-model:value="language" :options="languageList" @update:value="changeLanguage" />
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script lang="ts" setup>
import Frame from '@/renderer/components/Frame.vue'
import { ref, h, reactive, onMounted } from 'vue'
import { NInputGroup, NTooltip, NInput, NButton, NDataTable, NImage, NModal, NForm, NFormItem, NSwitch, NTreeSelect, NDrawer, NDrawerContent, NProgress, NSelect } from 'naive-ui'
import { emitter, getItemBykey, Progress, toJSON, Bookmarks, updateJSON, getFlatList, deleteBM, getFolderTree, getFolderKey, moveBM, getRepeat, getInvalid, batchDeleteBM, toHtml } from '@/renderer/utils/bookmarks'
import { TableColumns } from 'naive-ui/lib/data-table/src/interface'
import localforage from 'localforage'
import FileSaver from 'file-saver'
import { useI18n } from 'vue-i18n'
const { locale, t } = useI18n()

const filePath = ref('')

const tableSwitch = ref(false)
const flat = ref(false)
const data = ref()
const flatData = ref()

const columns = ref<TableColumns<Bookmarks>>([
  { type: 'selection' },
  {
    title: t('tbType'),
    key: 'key',
    render (row) {
      if (row.type === 'folder') {
        return h('span', t('folder'))
      }
      if (row.type === 'site') {
        return h('span', t('site'))
      }
    }
  },
  {
    title: t('tbIcon'),
    key: 'icon',
    width: 60,
    render (row) {
      return h(
        NImage,
        {
          src: row.icon
        }
      )
    }
  },
  { title: t('tbName'), key: 'name', ellipsis: { tooltip: true } },
  { title: t('tbHref'), key: 'href', ellipsis: { tooltip: true } },
  {
    title: t('Action'),
    key: 'actions',
    width: 200,
    render (row) {
      const openBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => openBtnClick(row) }, { default: () => t('open') })
      const editBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => editBtnClick(row) }, { default: () => t('edit') })
      const deleteBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => deleteBtnClick(row), type: 'error' }, { default: () => t('delete') })
      const btns = []
      if (row.type === 'folder') {
        btns.push(deleteBtn)
      }
      if (row.type === 'site') {
        btns.push(openBtn, editBtn, deleteBtn)
      }
      return btns
    }
  }
])
const flatColumns = ref<TableColumns<Bookmarks>>([
  { type: 'selection' },
  {
    title: t('tbIcon'),
    key: 'icon',
    width: 60,
    render (row: Bookmarks) {
      return h(
        NImage,
        {
          src: row.icon
        }
      )
    }
  },
  { title: t('tbName'), key: 'name', ellipsis: { tooltip: true } },
  { title: t('tbHref'), key: 'href', ellipsis: { tooltip: true } },
  { title: t('tbPath'), key: 'path', ellipsis: { tooltip: true } },
  {
    title: t('Action'),
    key: 'actions',
    width: 200,
    render (row: Bookmarks) {
      const openBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => openBtnClick(row) }, { default: () => t('open') })
      const editBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => editBtnClick(row) }, { default: () => t('edit') })
      const deleteBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => deleteBtnClick(row), type: 'error' }, { default: () => t('delete') })
      const btns = []
      if (row.type === 'folder') {
        btns.push(deleteBtn)
      }
      if (row.type === 'site') {
        btns.push(openBtn, editBtn, deleteBtn)
      }
      return btns
    }
  }
])
const pagination = reactive({
  page: 1,
  pageSize: 50,
  showSizePicker: true,
  pageSizes: [20, 50, 100, 200],
  onChange: (page: number) => {
    pagination.page = page
  },
  onPageSizeChange: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  }
})
const tree = ref()
const selectTree = ref('')

const repeatShow = ref(false)

// 选中书签
const checkedRowKeys = ref<string[]>([])
// 重复书签
const repeatData = ref<Bookmarks[]>()
// 无效书签
const invalidData = ref<Bookmarks[]>([])

// 选择书签文件， 并解析内容
function selectBookmarksFile () {
  window.api.invoke('event.tools.bookmarks')
  window.api.on('event.tools.bookmarks_replay', args => {
    filePath.value = args.path
    const res = toJSON(args.content)
    data.value = res
    flatData.value = getFlatList(data.value)
    checkedRowKeys.value = []
    invalidData.value = []
    repeatData.value = []
    repeatShow.value = false
    window.api.removeAllListeners('event.tools.bookmarks_replay')
  })
}
// 打开书签的链接
function openBtnClick (row: Bookmarks) {
  window.shell.openExternal(row.href)
}
// 切换表格类型
function changeTableType () {
  flat.value = tableSwitch.value
}
// 书签编辑
const model = ref({
  key: '',
  type: '',
  icon: '',
  name: '',
  href: ''
})
// 书签编辑校验
const rules = {
  name: {
    required: true,
    trigger: 'blur',
    message: '不能为空'
  },
  href: {
    required: true,
    trigger: 'blur',
    message: '不能为空'
  }
}
// 控制书签编辑框显示
const showEditItemModle = ref(false)
// 点击编辑按钮
function editBtnClick (row: Bookmarks) {
  if (!row.path) return false
  model.value = row
  tree.value = getFolderTree(data.value)
  selectTree.value = getFolderKey(tree.value, row.path)
  showEditItemModle.value = true
}
// 更新书签内容
function updateData () {
  if (selectTree.value !== '') {
    data.value = moveBM(data.value, selectTree.value, model.value)
    flatData.value = getFlatList(data.value)
  } else {
    data.value = updateJSON(data.value, model.value)
    flatData.value = getFlatList(data.value)
  }
  showEditItemModle.value = false
}
// 保存书签到本地
function saveEvent () {
  const html = toHtml(data.value)
  const file = new File([html], 'bookmarks.html', { type: 'text/html;charset=utf-8' })
  FileSaver.saveAs(file)
}

// 选则书签事件
function handleCheck (rowkeys: unknown) {
  checkedRowKeys.value = rowkeys as string[]
}
// 批量删除选中书签
function batchDeleteEvent () {
  data.value = batchDeleteBM(data.value, checkedRowKeys.value)
}
// 批量打开书签链接
function batchOpenEvent () {
  if (checkedRowKeys.value.length > 20) {
    return false
  }
  for (const i of checkedRowKeys.value) {
    const item = getItemBykey(flatData.value, i)
    if (item && item.href) {
      const url = item.href
      window.shell.openExternal(url)
    }
  }
}

// 删除失效书签
function deleteInvalidBM (data: Bookmarks[], row: Bookmarks) {
  const arr = [...data]
  const key = row.key
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].key === key) {
      arr.splice(i, 1)
    }
  }
  return arr
}

// 删除书签
function deleteBtnClick (row: Bookmarks) {
  data.value = deleteBM(data.value, row)
  flatData.value = getFlatList(data.value)
  repeatData.value = getRepeat(flatData.value)
  if (invalidData.value.length > 0) {
    invalidData.value = deleteInvalidBM(invalidData.value, row)
  }
}

// 检测重复书签
function checkRepeatBM () {
  if (flatData.value) {
    if (repeatShow.value) {
      repeatShow.value = false
    } else {
      repeatShow.value = true
      repeatData.value = getRepeat(flatData.value)
    }
  }
}

const invalidShow = ref(false)

const progress = ref<Progress>({
  total: 0,
  pass: 0,
  passP: 0,
  fail: 0,
  failP: 0
})
const timestar = ref(0)
const timeend = ref(0)

const invalidLoading = ref(true)

const start = ref(false)

// 检测失效书签
async function checkInvalidBM () {
  if (!flatData.value) return false
  invalidShow.value = true
  if (!start.value) {
    start.value = true
    timestar.value = new Date().getTime()
    invalidLoading.value = true
    await getInvalid(flatData.value)
    invalidLoading.value = false
  }
}

const configShow = ref(false)
const language = ref('zh-CN')
const languageList = ref([
  { label: '中文简体', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
])

// 获取系统语言， 并设置默认语言
function getSystemLanguage () {
  window.api.invoke('event.tools.language')
  window.api.on('event.tools.language_replay', async (e) => {
    const lang = await localforage.getItem('language')
    if (!lang) {
      localforage.setItem('language', e)
      language.value = e
      locale.value = e
    } else {
      locale.value = lang as string
      language.value = lang as string
    }
    window.api.removeAllListeners('event.tools.language_replay')
  })
}
// 切换语言
function changeLanguage (e: string) {
  localforage.setItem('language', e)
  locale.value = e
}

onMounted(() => {
  getSystemLanguage()
  emitter.on('bookmark-check-pass', e => {
    progress.value = e as Progress
    timeend.value = new Date().getTime() - timestar.value
  })
  emitter.on('bookmark-check-fail', e => {
    progress.value = e as Progress
    timeend.value = new Date().getTime() - timestar.value
  })
  emitter.on('bookmark-check-end', async e => {
    invalidData.value = await e as Bookmarks[]
    timeend.value = new Date().getTime() - timestar.value
  })
})
</script>

<style lang="scss">
html,body{
  margin: 0;
  padding: 0;
  height: 100%;
  border-radius: 8px;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
}
.main{
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  .main-header{
    height: 50px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    .repeat, .invalid{
      margin-left: 10px;
    }
  }
  .main-content{
    flex: 1;
    position: relative;
    overflow-y: auto;
    .main-content-wrapper{
      padding: 0 10px;
      position: absolute;
    }
  }
  .main-footer{
    padding: 0 10px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .batchOpen{
      margin-left: 10px;
    }
  }
  .main-file{
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #ffffff;
    border-radius: 8px;
  }
}
</style>
