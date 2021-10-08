module.exports = {
  pages: {
    home: 'src/renderer/views/main.ts'
  },
  pluginOptions: {
    electronBuilder: {
      mainProcessFile: 'src/main/index.ts',
      nodeIntegration: false,
      preload: {
        preload: 'src/main/preload.ts'
      },
      mainProcessWatch: ['src/main/'],
      builderOptions: {
        productName: 'Bookmark Manager',
        copyright: 'Copyright @ 2021 hunlongyu',
        appId: 'com.hunlongyu.bookmark',
        publish: [
          {
            provider: 'github',
            owner: 'Hunlongyu',
            repo: 'bookmarks-manager'
          }
        ],
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },
        win: {
          target: 'nsis',
          icon: 'build/icons/icon.ico'
        },
        mac: {
          icon: 'build/icon/icon.icns',
          category: 'public.app-category.developer-tools',
          target: 'default'
        },
        linux: {
          icon: 'build/icons/256x256.png'
        },
        snap: {
          publish: ['github']
        }
      }
    }
  }
}
