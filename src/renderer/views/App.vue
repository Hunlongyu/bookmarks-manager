<template>
  <div class="main">
    <Frame />
    <div class="main-header">
      <n-input-group>
        <n-input :style="{ width: '50%' }" :value="filePath" />
        <n-button ghost @click="selectBookmarksFile">选择书签文件</n-button>
      </n-input-group>
      <n-switch v-model:value="tableSwitch" @update:value="changeTableType"></n-switch>
      <n-button class="repeat" ghost @click="checkRepeatBM">检测重复文件</n-button>
      <n-button class="invalid" ghost>检测失效链接</n-button>
    </div>
    <div class="main-content">
      <div class="main-content-wrapper">
        <n-data-table :columns="columns" :data="data" max-height="100%" size="small" v-if="!flat"/>
        <n-data-table :columns="flatColumns" :data="flatData" max-height="100%" virtual-scroll :pagination="pagination" v-if="flat" size="small" />
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
      </div>
      <template #action>
        <n-button size="small" @click="showEditItemModle === false">取消</n-button>
        <n-button size="small" @click="updateData">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script lang="ts" setup>
import Frame from '@/renderer/components/Frame.vue'
import { ref, h, reactive } from 'vue'
import { NInputGroup, NInput, NButton, NDataTable, NImage, NModal, NForm, NFormItem, NSwitch } from 'naive-ui'
import { toJSON, Bookmarks, updateJSON, getFlatList, deleteBM } from '@/renderer/utils/bookmarks'

const filePath = ref('')

const tableSwitch = ref(false)
const flat = ref(false)
const data = ref()
const flatData = ref()
const createColumns = () => {
  return [
    { type: 'selection' },
    {
      title: 'Type',
      render (row: Bookmarks) {
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
  ]
}
const columns = createColumns()
const flatColumns = [
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
]
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

// 打开书签的链接
function openBtnClick (row: Bookmarks) {
  window.shell.openExternal(row.href)
}

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
// 编辑书签内容
function editBtnClick (row: Bookmarks) {
  model.value = row
  showEditItemModle.value = true
}
// 更新书签
function updateData () {
  updateJSON(data.value, model.value)
  showEditItemModle.value = false
}
// 删除书签
function deleteBtnClick (row: Bookmarks) {
  data.value = deleteBM(data.value, row)
  flatData.value = getFlatList(data.value)
}

function checkRepeatBM () {
  flat.value = true
  flatData.value = getFlatList(data.value)
}

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
