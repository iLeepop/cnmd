import { onMounted, onUnmounted, type Ref } from "vue";

export function useEditorShortcuts(
  editMode: Ref<boolean>,
  onSave: () => void | Promise<void>
) {
  function onKeyDown(e: KeyboardEvent) {
    if (!editMode.value) return;
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === "s" || e.key === "S") {
      e.preventDefault();
      void onSave();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", onKeyDown);
  });
}
