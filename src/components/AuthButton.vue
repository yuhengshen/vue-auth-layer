<template>
  <NButton v-if="show" key="1">
    <slot></slot>
  </NButton>
  <!-- 这里我们通过自定义逻辑和页面，控制权限按钮的其他逻辑，如下：当权限不满足时，显示了一个按钮来复制当前的权限路径-->
  <NButton v-else type="warning" key="2" @click="copyAuthPath">
    复制权限路径
  </NButton>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui";
import { useAuth } from "../hooks";

const props = defineProps<{
  auth?: boolean;
}>();

const { show, authPath } = useAuth(() => props.auth);

const copyAuthPath = () => {
  if (authPath.value) {
    navigator.clipboard.writeText(authPath.value);
  }
};
</script>
