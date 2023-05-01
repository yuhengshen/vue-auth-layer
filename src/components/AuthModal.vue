<template>
  <NModal :title="title">
    <slot></slot>
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import { useProvideAuth } from "../hooks";

const props = defineProps<{
  auth?: boolean;
  title?: string;
}>();

useProvideAuth(props.title);
</script>
