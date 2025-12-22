<template>
  <div class="player-page">
    <div class="player-container">
      <video ref="videoRef" class="player-video" :src="src" controls autoplay></video>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

defineProps<{ src: string }>()

const videoRef = ref<HTMLVideoElement | null>(null)

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.code !== 'Space' || isEditableTarget(event.target)) return
  event.preventDefault()

  const video = videoRef.value
  if (!video) return

  if (video.paused) {
    video.play()
  } else {
    video.pause()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.player-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding: 0;
  box-sizing: border-box;
  background: #f7f7f7;
}

.player-container {
  width: 100%;
  max-width: 960px;
  background: #000000;
}

.player-video {
  width: 100%;
  height: auto;
  display: block;
  background: #000000;
}
</style>
