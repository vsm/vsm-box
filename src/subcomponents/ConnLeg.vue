<template>
  <g class="conn-leg">
    <line
      v-if="showFoot"
      :x1="footXM"
      :y1="footY"
      :x2="leg.footX1 + sizes.connFootIndent"
      :y2="footY"
      :style="`stroke: ${ footColor }; stroke-width: ${ l.lw };`"
      :stroke-dasharray="dashes"
      class="foot left"
    />
    <line
      v-if="showFoot"
      :x1="footXM"
      :y1="footY"
      :x2="leg.footX2 - sizes.connFootIndent"
      :y2="footY"
      :style="`stroke: ${ footColor }; stroke-width: ${ l.lw };`"
      :stroke-dasharray="dashes"
      class="foot right"
    />
    <line
      :x1="x"
      :y1="legY2"
      :x2="x"
      :y2="leg.y1 - l.lwh + (leg.isUC ? l.lw : 0)"
      :style="`stroke: ${ legColor }; stroke-width: ${ l.lw };`"
      :stroke-dasharray="dashes"
      class="leg"
    />
    <!-- eslint-disable -->
    <path
      v-if="leg.type == 'R'"
      :d="
        `M${ x                      } ${ y2lwh - sizes.connTridRelH } ` +
        `L${ x + sizes.connTridRelW } ${ y2lwh                      } ` +
        `H${ x - sizes.connTridRelW } Z`"
      :style="`fill: ${ legColor }; stroke-width: 0;`"
      class="pointer relation"
    />
    <path
      v-if="leg.type == 'O'"
      :d="
        `M${ x - sizes.connTridObjW } ${ y2 - sizes.connTridObjH } ` +
        `L${ x                      } ${ y2                      } ` +
        `L${ x + sizes.connTridObjW } ${ y2 - sizes.connTridObjH }`"
      :style="`
        fill: none; stroke: ${ legColor }; stroke-width: ${ l.lw };`"
      class="pointer object"
    />
    <path
      v-if="leg.type == 'L'"
      :d="
        `M${ x - sizes.connListRelW }, ${ y2lwh - sizes.connListRelH } `+
        `H${ x + sizes.connListRelW } ` +
        `V${ y2lwh                  } ` +
        `H${ x - sizes.connListRelW } Z`"
      :style="`fill: ${ legColor }; stroke-width: 0;`"
      class="pointer list-relation"
    />
    <path
      v-if="leg.type == 'P'"
      :d="
        `M${ x - sizes.connRefParW } ${ y2 - sizes.connRefParH } ` +
        `L${ x                     } ${ y2                     } ` +
        `L${ x + sizes.connRefParW } ${ y2 - sizes.connRefParH } Z`"
      :style="`
        fill: none; stroke: ${ legColor }; stroke-width: ${ l.lw };`"
      class="pointer parent"
    />
    <!-- eslint-enable -->
  </g>
</template>


<script>

export default {
  name: 'ConnLeg',

  props: {
    leg: {
      type: Object,  // See `Conn.legs()`.
      required: true
    },
    sizes: {
      type: Object,
      required: true
    },
    l: {
      type: Object,  // For pixel-perfect positioning; see 'Conn.l()'.
      required: true
    }
  },


  computed: {
    dashes()  {
      return ['P', 'C'].includes(this.leg.type) ?
        this.sizes.connRefDashes : 'none';
    },

    x() {
      // Last part: For an under-construction list-leg at the same position of
      // one of its real legs: shift it 1 line-width to the right.
      return this.leg.x  + this.l.h +
        (this.leg.isUC && this.leg.type == 'E' && this.leg.doublesUp ?
          this.l.lw : 0);
    },

    y2() {
      return this.leg.y2 - (this.leg.isUC ? this.sizes.connUCLegShorter : 0);
    },

    legY2 () {
      var t = this;
      var v = t.l.lwh + t.l.h;
      return t.y2 - (
        t    .leg.type == 'R' ? (t.sizes.connTridRelH - v - t.l.h - t.l.lw) :
          t  .leg.type == 'L' ? (t.sizes.connListRelH - v - t.l.h) :
            t.leg.type == 'P' ? (t.sizes.connRefParH  + v) :
              t.l.lwh );
    },

    y2lwh()  { return this.y2 + this.l.lwh + this.l.h + this.l.h },

    footY ()   { return this.leg.y2 + this.l.h },
    footXM()   { return (this.leg.footX1 + this.leg.footX2 - 1) / 2 + 0.5 },

    showFoot() {
      return this.sizes.connFootVisible &&
        (!this.leg.isUC || !this.leg.doublesUp);
    },

    legColor() {
      return this.leg.isUC ?
        this.sizes.connUCLegColor : this.sizes.connLegColor;
    },

    footColor() {
      return this.leg.isUC ?
        this.sizes.connUCFootColor : this.sizes.connFootColor;
    },
  }
};
</script>
