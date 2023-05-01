<script setup lang="ts">
import { ref } from "vue";
const showModal = ref(false);
</script>

<template>
  <n-tabs type="line">
    <n-tab-pane name="tab1" tab="第一个Tab">
      <n-button auth> Tab中的按钮权限 </n-button>
    </n-tab-pane>
    <n-tab-pane name="tab2" tab="第二个Tab">
      <n-button @click="showModal = true">显示弹窗</n-button>
      <n-modal
        v-model:show="showModal"
        preset="dialog"
        title="Dialog"
        positive-text="Submit"
        negative-text="Cancel"
      >
        <n-button auth>Tab中Modal中的权限校验</n-button>
        <n-tabs>
          <n-tab-pane name="dialogTabPane" tab="dialog中的TabPane">
            <n-button auth>嵌套的权限</n-button>
          </n-tab-pane>
        </n-tabs>
      </n-modal>
    </n-tab-pane>
  </n-tabs>

  <n-button :auth="true" style="margin-top: 1em">普通的按钮权限</n-button>
</template>
