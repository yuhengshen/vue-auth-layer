<template>
  <NTabPane :tab="tab" :name="name">
    <slot></slot>
  </NTabPane>
</template>

<script setup lang="ts">
import { useProvideAuth } from "../hooks";
import { NTabPane } from "naive-ui";

defineOptions({
  name: "TabPane",
  // naive-ui: https://github.com/tusen-ai/naive-ui/blob/0839b0ea5e4077e260be4bc3df5d525c35066449/src/tabs/src/Tabs.tsx#L648
  __TAB_PANE__: true,
});
const props = defineProps<{
  auth?: boolean;
  tab: string;
  name: string;
}>();

useProvideAuth(props.tab);
</script>
