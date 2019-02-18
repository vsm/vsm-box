<template>
  <g
    class="conn-remove-icon"
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
    @mousedown="onMousedown"
    @mouseup="onMouseup"
  >
    <rect
      :x="x1"
      :y="y1"
      :width="sizes.connRIW"
      :height="sizes.connRIW"
      :rx="sizes.connHLBorderRadius"
      :ry="sizes.connHLBorderRadius"
      :style="`fill: ${ sizes.connRIBGColor[state] };`"
      class="ri-bg"
    />
    <path
      :d="crossPath"
      :style="`stroke: ${ sizes.connRIFGColor[state] };
        stroke-width: ${ sizes.connRILineWidth };`"
      class="ri-fg"
    />
  </g>
</template>


<script>

export default {
  name: 'ConnRemoveIcon',

  props: {
    conn: {
      type: Object,
      required: true
    },
    connNr: {
      type: Number,
      required: true
    },
    sizes: {
      type: Object,
      required: true
    },
    levelTop: {
      type: Function,
      required: true
    },
    termX2s: {
      type: Array,
      required: true
    }
  },


  data: function() { return {
    state: 0  // The state of the Remove Icon (0, 1:hovered, 2:pressed).
  }; },


  computed: {
    x1() {
      return this.termX2s[this.conn.posZ] + this.sizes.connHLLegOutdent
        - this.sizes.connRIW;
    },

    y1() {
      return this.levelTop(this.conn.backLevel);
    },

    crossPath() {
      var x1 = this.x1 + this.sizes.connRIPadding;
      var y1 = this.y1 + this.sizes.connRIPadding;
      var x2 = this.x1 + this.sizes.connRIW - this.sizes.connRIPadding;
      var y2 = this.y1 + this.sizes.connRIW - this.sizes.connRIPadding;
      return `M ${ x1 } ${ y1 } L ${ x2 } ${ y2 }` +
      /**/   `M ${ x1 } ${ y2 } L ${ x2 } ${ y1 }`;
    }
  },


  methods: {
    onMouseenter()  { this.state = 1 },
    onMouseleave()  { this.state = 0 },
    onMousedown ()  { this.state = 2 },

    onMouseup() {
      if (this.state == 2) {
        this.state = 1;
        this.$emit('remove', this.connNr);
      }
    }
  }
};
</script>
