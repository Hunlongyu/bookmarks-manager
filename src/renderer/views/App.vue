<template>
  <div class="main">
    <Frame />
    <div class="main-header">
      <n-input-group>
        <n-input :style="{ width: '50%' }" />
        <n-button ghost>选择书签文件</n-button>
      </n-input-group>
      <n-button ghost>检测重复文件</n-button>
      <n-button class="invalid" ghost>检测失效链接</n-button>
    </div>
    <div class="main-content"></div>
    <div class="main-footer"></div>
    <div class="main-file"></div>
  </div>
</template>

<script lang="ts" setup>
import Frame from '@/renderer/components/Frame.vue'
import { NInputGroup, NInput, NButton } from 'naive-ui'

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
    .invalid{
      margin-left: 10px;
    }
  }
  .main-content{
    flex: 1;
  }
  .main-footer{
    height: 50px;
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
