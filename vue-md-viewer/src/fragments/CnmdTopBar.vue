<script setup lang="ts">
defineProps<{
  editMode: boolean;
  iconList: string;
  menuOpen: boolean;
}>();

const emit = defineEmits<{
  toggleMenu: [];
}>();
</script>

<template>
  <div class="cnmd-top-actions" id="cnmd-top-actions">
    <span
      v-if="editMode"
      class="cnmd-edit-mode-label"
      aria-live="polite"
    >编辑模式</span>
    <button
      type="button"
      class="cnmd-menu-button cnmd-toolbar-button"
      aria-label="菜单"
      :aria-expanded="menuOpen"
      @click="emit('toggleMenu')"
    >
      <span class="cnmd-menu-icon" aria-hidden="true" v-html="iconList"></span>
    </button>
  </div>
</template>
