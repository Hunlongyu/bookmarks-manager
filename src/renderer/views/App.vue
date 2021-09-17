<template>
  <div class="main">
    <div class="main-header"></div>
    <div class="main-content"></div>
    <div class="main-footer"></div>
    <div class="main-file"></div>
  </div>
</template>

<script lang="ts" setup>
// import HelloWorld from './components/HelloWorld.vue'

</script>

<style lang="scss">
html,body{
  margin: 0;
  padding: 0;
  height: 100%;
  border-radius: 10px;
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
  -webkit-app-region: drag;
  .main-header{
    height: 50px;
  }
  .main-content{
    flex: 1;
  }
  .main-footer{
    height: 50px;
  }
  .main-file{
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #ffffff;
    border-radius: 10px;
  }
}
</style>
