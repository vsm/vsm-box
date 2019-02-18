<template>
  <g class="conn-highlight">
    <path
      :d="hlBackPath"
      :style="`fill: ${ sizes.connHLColor }; stroke-width: 0;`"
      class="hl-back-top"
    />
    <rect
      v-for="(p, i) in realPos"
      :key="i"
      :x="termX1s[p] - sizes.connHLLegOutdent"
      :y="topY + sizes.connHLBackHeight"
      :width="hlLegW(p)"
      :height="hlLegHeight(i)"
      :style="`fill: ${ sizes.connHLColor };`"
      class="hl-leg"
    />
    <g
      v-for="(p, i) in realPos"
      :key="'u' + i"
    >
      <rect
        v-if="realFootLevels[i] > 0"
        :x="termX1s[p] - sizes.connHLLegOutdent"
        :y="levelTop(realFootLevels[i] - 1)"
        :width="hlLegW(p)"
        :height="realFootLevels[i] * sizes.theConnsLevelHeight
          + sizes.theConnsSpaceBelow + sizes.theConnsMarginBottom"
        :style="`fill: ${ sizes.connHLColorLight };`"
        class="hl-leg-under"
      />
    </g>
  </g>
</template>


<script>
/**
 * This draws the highlighting for a hovered VSM-connector.
 * All cells occupied by the connector and its legs are highlighted, whereby a
 * little space is left between individual legs to make them easier to discern.
 * The top part of the top cells, which are also occupied by the connector's
 * backbone, is highlighted contiguously.
 * If there are cells under a connector-leg's foot and above its Term below,
 * then these are also highlighted, but more lightly, to clarify the leg's
 * attachment to that Term.
 */

export default {
  name: 'ConnHL',

  props: {
    conn: {
      type: Object,
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
    termX1s: {
      type: Array,
      required: true
    },
    termX2s: {
      type: Array,
      required: true
    }
  },


  computed: {
    topY() {
      return this.levelTop(this.conn.backLevel);
    },

    backW() {
      return this.termX2s[this.conn.posZ] - this.termX1s[this.conn.posA]
        + this.sizes.connHLLegOutdent * 2;
    },

    hlBackPath() {
      var x = this.termX1s[this.conn.posA] - this.sizes.connHLLegOutdent;
      var y = this.levelTop(this.conn.backLevel);
      var w = this.backW;
      var h = this.sizes.connHLBackHeight;
      var r = this.sizes.connHLBorderRadius;
      var a = `a ${ r } ${ r } 0 0 1 ${ r } `;
      return `M ${ x } ${ y + r }` +
        a + `-${ r }` +       // Top-left rounded corner.
        `h ${ w - r - r }` +
        a + r +               // Top-right rounded corner.
        `v ${ h - r }` +
        `h -${ w } Z`;
    },

    realPos()         { return this.conn.pos       .filter(p => p >= 0) },
    realFootLevels()  { return this.conn.footLevels.filter(p => p >= 0) }
  },


  methods: {
    hlLegW(pos) {
      return this.termX2s[pos] - this.termX1s[pos]
        + this.sizes.connHLLegOutdent * 2;
    },


    hlLegHeight(legIndex) {
      var footLevel = this.realFootLevels[legIndex];
      var s = this.sizes;
      return this.levelTop(footLevel) - this.levelTop(this.conn.backLevel)
        + s.theConnsLevelHeight - s.connHLBackHeight
        + (footLevel > 0 ? 0 : (s.theConnsSpaceBelow + s.theConnsMarginBottom));
    }
  }
};
</script>
