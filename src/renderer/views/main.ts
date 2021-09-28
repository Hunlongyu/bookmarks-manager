import { createApp } from 'vue'
import App from './App.vue'
import { createI18n } from 'vue-i18n'
import messages from '../i18n/index'
const i18n = createI18n({
  locale: 'zh-CN',
  messages
})

const app = createApp(App)
app.use(i18n).mount('#app')
