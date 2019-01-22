<template>
  <span
    title="Doubleclick: show popup for empty Term
Mousehover: show popup for normal Term
Mousedrag: move normal Term
Ctrl+Shift+Mousedrag: move empty Term
Alt+Up/Down: move empty Term
Ctrl+Del: remove empty Term
Ctrl+Enter: insert empty Term to the right
['vsm-box': developed by stcruy]"
    class="hotkey help"
    @click.stop="x => x"
  >
    Help (hover me)
  </span>
</template>
