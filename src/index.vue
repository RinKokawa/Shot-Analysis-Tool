<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import PlayerPage from './components/PlayerPage.vue'

type RecentProject = {
  path: string
  name: string
  lastOpened: number
}

const videoUrl = ref<string | null>(null)
const currentFilePath = ref<string | null>(null)
const recentProjects = ref<RecentProject[]>([])
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItem = ref<RecentProject | null>(null)

const revokeIfBlob = (url: string | null) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const loadRecentProjects = async () => {
  if (!window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('recent-projects:get')
  if (Array.isArray(result)) {
    recentProjects.value = result as RecentProject[]
  }
}

const addRecentProject = async (file: File) => {
  if (!window.ipcRenderer?.invoke) return
  const filePath = (file as File & { path?: string }).path
  if (!filePath) return
  const result = await window.ipcRenderer.invoke('recent-projects:add', {
    path: filePath,
    name: file.name,
  })
  if (Array.isArray(result)) {
    recentProjects.value = result as RecentProject[]
  }
}

const openRecent = async (item: RecentProject) => {
  if (!window.ipcRenderer?.invoke) return
  const fileUrl = await window.ipcRenderer.invoke('recent-projects:toAppFileUrl', item.path)
  if (typeof fileUrl !== 'string') return
  revokeIfBlob(videoUrl.value)
  videoUrl.value = fileUrl
  currentFilePath.value = item.path
}

const onBack = () => {
  revokeIfBlob(videoUrl.value)
  videoUrl.value = null
  currentFilePath.value = null
}

const onContextMenu = (event: MouseEvent, item: RecentProject) => {
  event.preventDefault()
  contextMenuVisible.value = true
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuItem.value = item
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuItem.value = null
}

const deleteRecent = async () => {
  const item = contextMenuItem.value
  if (!item || !window.ipcRenderer?.invoke) return
  const result = await window.ipcRenderer.invoke('recent-projects:remove', item.path)
  if (Array.isArray(result)) {
    recentProjects.value = result as RecentProject[]
  }
  closeContextMenu()
}

const onGlobalClick = () => {
  if (contextMenuVisible.value) closeContextMenu()
}

const onGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeContextMenu()
}

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  revokeIfBlob(videoUrl.value)
  videoUrl.value = URL.createObjectURL(file)
  currentFilePath.value = (file as File & { path?: string }).path || null
  await addRecentProject(file)
}

onMounted(loadRecentProjects)

onMounted(() => {
  window.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>
<template>
  <div class="app-title" v-if="!videoUrl">
    <div class="title-main">拉片分析软件</div>
    <div class="title-sub">请先将视频文件放到统一或单独的文件夹</div>
  </div>
  <div class="recent-projects" v-if="!videoUrl">
    <h2 class="recent-projects-title">最近项目</h2>
    <div class="recent-list">
      <button
        v-for="item in recentProjects"
        :key="item.path"
        class="recent-item"
        @click="openRecent(item)"
        @contextmenu="onContextMenu($event, item)"
      >
        <div class="recent-name">{{ item.name }}</div>
        <div class="recent-path">{{ item.path }}</div>
      </button>
      <div v-if="recentProjects.length === 0" class="recent-empty">暂无最近项目</div>
    </div>
  </div>
  <div
    v-if="contextMenuVisible"
    class="context-menu"
    :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
    @click.stop
  >
    <button class="context-menu-item" @click="deleteRecent">删除</button>
  </div>
  <label class="select-button" v-if="!videoUrl">
    <input class="file-input" type="file" accept="video/*" @change="onFileChange" />
    选择视频
  </label>
  <PlayerPage
    v-if="videoUrl"
    :src="videoUrl"
    :file-path="currentFilePath"
    @back="onBack"
  />
</template>



<style scoped>
.app-title {
  position: fixed;
  top: 16px;
  left: 16px;
  text-align: left;
}

.title-main {
  font-size: 24px;
  font-weight: 600;
}

.title-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #666666;
}

.recent-projects {
  position: fixed;
  top: 96px;
  left: 16px;
  margin: 0;
  width: 520px;
}

.recent-projects-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.recent-list {
  border: 1px solid #dedede;
  background: #ffffff;
}

.recent-item {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #efefef;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.recent-item:hover {
  background: #f5f5f5;
}

.recent-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.recent-path {
  margin-top: 4px;
  font-size: 12px;
  color: #666666;
  word-break: break-all;
}

.recent-empty {
  padding: 12px;
  font-size: 12px;
  color: #999999;
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #d0d0d0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 120px;
}

.context-menu-item {
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.context-menu-item:hover {
  background: #f2f2f2;
}

.file-input {
  display: none;
}

.select-button {
  position: fixed;
  top: 16px;
  right: 16px;
  padding: 8px 12px;
  border: 1px solid #c9c9c9;
  border-radius: 0;
  background: #ffffff;
  color: #1a1a1a;
  cursor: pointer;
}
</style>
