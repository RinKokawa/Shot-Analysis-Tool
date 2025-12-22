<template>
  <div class="work-area" :style="areaStyle">
    工作区域
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  width: number
  height: number
}>()

const areaStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))
</script>

<style scoped>
.work-area {
  background: #f0f0f0;
  color: #1a1a1a;
  font-size: 14px;
  padding: 12px;
  box-sizing: border-box;
  border-left: 1px solid #d0d0d0;
}
</style>
