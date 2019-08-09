<template>
  <span
    title="--Terms--
Doubleclick: show popup for empty Term
Mousehover: show popup for normal Term
Mousedrag: move normal Term
Ctrl+Shift+Mousedrag: move empty Term
Alt+Up/Down: move empty Term
Ctrl+Del: remove empty Term
Ctrl+Del: reset the end-Term
Ctrl+Enter: insert empty Term to the right
Alt+Click: assign Term as sentence head
--Connectors--
Add trident: click above 3 Terms and above any other connector,
  to assign subject, relation, object.
Add bident: click twice above a Term to omit subject or relation,
  or Esc (or click outside vsm-box) to omit object.
Add list: Shift+click for relation, then click for elements, then Esc.
Add coreference: Ctrl+click for child, then click for parent.
Remove connector: hover it and click the X.
['vsm-box': developed by stcruy]"
    class="hotkey help"
    @click.stop="x => x"
  >
    Help (hover me)
  </span>
</template>
