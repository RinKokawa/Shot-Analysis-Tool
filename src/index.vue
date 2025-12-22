<template>
  <div class="app-title">
    <div class="title-main">拉片分析软件</div>
    <div class="title-sub">请先将视频文件放到统一或单独的文件夹</div>
  </div>
  <button class="select-button" type="button">选择视频</button>
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
