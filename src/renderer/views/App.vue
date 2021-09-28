<template>
  <div class="main">
    <Frame />
    <div class="main-header">
      <n-input-group>
        <n-input :style="{ width: '50%' }" :value="filePath" />
        <n-button ghost @click="selectBookmarksFile">选择书签文件</n-button>
      </n-input-group>
      <n-switch v-model:value="tableSwitch" @update:value="changeTableType"></n-switch>
      <n-button class="repeat" :type="repeatShow ? 'primary' : 'default'" :ghost="!repeatShow" @click="checkRepeatBM">检测重复链接</n-button>
      <n-button class="invalid" ghost @click="checkInvalidBM">检测失效链接</n-button>
      <n-button class="invalid" type="info" ghost>保存</n-button>
    </div>
    <div class="main-content" id="body">
      <div class="main-content-wrapper">
        <n-data-table :columns="columns" :data="data" max-height="100%" size="small" v-if="!flat && !repeatShow"/>
        <n-data-table :columns="flatColumns" :data="flatData" max-height="100%" virtual-scroll :pagination="pagination" v-if="flat && !repeatShow" size="small" />
        <n-data-table :columns="flatColumns" :data="repeatData" max-height="100%" virtual-scroll v-if="repeatShow" size="small" />
      </div>
    </div>
    <div class="main-footer">
      <n-button>批量删除选中书签或目录</n-button>
    </div>
    <div class="main-file"></div>
    <n-modal v-model:show="showEditItemModle" preset="dialog">
      <template #header>Edit</template>
      <div>
        <n-form :model="model" :rules="rules">
          <n-form-item path="name" label="Name">
            <n-input v-model:value="model.name" @keydown.enter.prevent />
          </n-form-item>
          <n-form-item path="href" label="Href">
            <n-input v-model:value="model.href" @keydown.enter.prevent />
          </n-form-item>
        </n-form>
        <label>Path</label>
        <n-tree-select :options="tree" label-field="name" default-expand-all clearable v-model:value="selectTree" />
      </div>
      <template #action>
        <n-button size="small" @click="showEditItemModle === false">取消</n-button>
        <n-button size="small" @click="updateData">确定</n-button>
      </template>
    </n-modal>
    <n-drawer
      v-model:show="invalidShow"
      width="90%"
      placement="right">
      <n-drawer-content title="检测失效链接">
        <div class="state">
          扫描时间：{{(timeend / 1000).toFixed(2)}} s
          <n-progress :key="progress.pass" type="line" status="info" :percentage="progress.passP">有效: {{progress.pass}} / {{progress.total}}</n-progress>
          <n-progress type="line" status="warning" :percentage="progress.failP">失效: {{progress.fail}} / {{progress.total}}</n-progress>
        </div>
        <div class="table">
          <n-data-table :loading="invalidLoading" :columns="flatColumns" :data="invalidData" max-height="100%" size="small"/>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script lang="ts" setup>
import Frame from '@/renderer/components/Frame.vue'
import { ref, h, reactive, onMounted } from 'vue'
import { NInputGroup, NInput, NButton, NDataTable, NImage, NModal, NForm, NFormItem, NSwitch, NTreeSelect, NDrawer, NDrawerContent, NProgress } from 'naive-ui'
import { emitter, Progress, toJSON, Bookmarks, updateJSON, getFlatList, deleteBM, getFolderTree, getFolderKey, moveBM, getRepeat, getInvalid } from '@/renderer/utils/bookmarks'
import { TableColumns } from 'naive-ui/lib/data-table/src/interface'

const filePath = ref('')

const tableSwitch = ref(false)
const flat = ref(false)
const data = ref()
const flatData = ref()

const columns = ref<TableColumns<Bookmarks>>([
  { type: 'selection' },
  {
    title: 'Type',
    key: 'key',
    render (row) {
      if (row.type === 'folder') {
        return h('span', 'Folder')
      }
      if (row.type === 'site') {
        return h('span', 'Site')
      }
    }
  },
  {
    title: 'icon',
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
  { title: 'name', key: 'name', ellipsis: { tooltip: true } },
  { title: 'href', key: 'href', ellipsis: { tooltip: true } },
  {
    title: 'Action',
    key: 'actions',
    width: 200,
    render (row) {
      const openBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => openBtnClick(row) }, { default: () => 'Open' })
      const editBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => editBtnClick(row) }, { default: () => 'Edit' })
      const deleteBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => deleteBtnClick(row), type: 'error' }, { default: () => 'Delete' })
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
    title: 'icon',
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
  { title: 'name', key: 'name', ellipsis: { tooltip: true } },
  { title: 'href', key: 'href', ellipsis: { tooltip: true } },
  { title: 'path', key: 'path', ellipsis: { tooltip: true } },
  {
    title: 'Action',
    key: 'actions',
    width: 200,
    render (row: Bookmarks) {
      const openBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => openBtnClick(row) }, { default: () => 'Open' })
      const editBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => editBtnClick(row) }, { default: () => 'Edit' })
      const deleteBtn = h(NButton, { style: { marginRight: '6px' }, size: 'small', onClick: () => deleteBtnClick(row), type: 'error' }, { default: () => 'Delete' })
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

const repeatData = ref()
const repeatShow = ref(false)

// 选择书签文件， 并解析内容
function selectBookmarksFile () {
  window.api.invoke('event.tools.bookmarks')
  window.api.on('event.tools.bookmarks_replay', args => {
    filePath.value = args.path
    const res = toJSON(args.content)
    data.value = res
    flatData.value = getFlatList(data.value)
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

const invalidData = ref<Bookmarks[]>([])
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

onMounted(() => {
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
