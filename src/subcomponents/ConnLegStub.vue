<template>
  <g
    v-if="!!stub"
    class="conn-leg-stub"
  >
    <line
      v-if="stub.side"
      :x1="x + (stub.side < 0 ? (-l.lwh - l.h) : (l.lwh + l.h))"
      :y1="stub.y1"
      :x2="stub.x + (stub.side < 0 ? -l.lwh : (l.lwh + l.h + l.h))"
      :y2="stub.y1"
      :style="`stroke: ${ sizes.connStubBackColor }; stroke-width: ${ l.lw };`"
      class="stub-back"
    />
    <line
      :x1="x - footW"
      :y1="y2 + l.h + l.lwh"
      :x2="x + footW"
      :y2="y2 + l.h + l.lwh"
      :style="`stroke: ${ sizes.connStubFootColor }; stroke-width: ${ l.lw };`"
      class="stub-foot"
    />
    <line
      :x1="x"
      :y1="y1"
      :x2="x"
      :y2="y2"
      :style="`stroke: ${ sizes.connStubLegColor }; stroke-width: ${ l.lw };`"
      class="stub-leg"
    />
    <!-- eslint-disable -->
    <path
      v-if="stub.type == 'R'"
      :d="
        `M${ x                         } ${ l.h + y2 - sizes.connStubBidRelH } `+
        `L${ x + sizes.connStubBidRelW } ${ y2                               } `+
        `H${ x - sizes.connStubBidRelW } Z`"
      :style="`fill: ${ sizes.connStubLegColor }; stroke-width: 0;`"
      class="stub-pointer relation"
    />
    <path
      v-if="stub.type == 'O'"
      :d="
        `M${ x - sizes.connStubBidObjW } ${ y2 + l.h - sizes.connStubBidObjH } `+
        `L${ x                         } ${ y2 - l.h - l.lwh                 } `+
        `L${ x + sizes.connStubBidObjW } ${ y2 + l.h - sizes.connStubBidObjH }`"
      :style="`
        fill: none; stroke: ${sizes.connStubLegColor}; stroke-width: ${l.lw};`"
      class="stub-pointer object"
    />
    <!-- eslint-enable -->
  </g>
</template>


<script>

export default {
  name: 'ConnLegStub',

  props: {
    stub: {
      type: Object,  // See `Conn.legStub()`.
      required: true
    },
    sizes: {
      type: Object,
      required: true
    },
    l: {
      type: Object,  // See 'Conn.l()'.
      required: true
    }
  },


  computed: {
    // While `stub.x` is the left- or rightmost x-coord of the main backbone
    // (i.e. where the stub-backbone starts from),
    // `x` is the x-coord of the stub-leg, away from the main backbone.
    x() {
      return this.stub.x + this.l.h + this.stub.side *
        ( this.stub.type == 'S' ? this.sizes.connStubBidSubBackW :
          this.stub.type == 'O' ? this.sizes.connStubBidObjBackW : 0);
    },

    // The Y-coordinate at the stub-leg's top, one linewidth under the backbone.
    y1() {
      return this.stub.y1 + this.l.h + this.l.lwh;
    },

    // The Y-coordinate at the stub-leg's foot.
    y2() {
      return this.stub.y1 + (
        this.stub.type     == 'S' ? this.sizes.connStubBidSubLegH :
          this.stub.type   == 'R' ? this.sizes.connStubBidRelLegH :
            this.stub.type == 'O' ? this.sizes.connStubBidObjLegH : 0);
    },

    footW() {
      return this.stub.type == 'S' ? this.sizes.connStubBidSubFootW :
        this     .stub.type == 'R' ? this.sizes.connStubBidRelFootW :
          this   .stub.type == 'O' ? this.sizes.connStubBidObjFootW : 0;

    }
  }
};
</script>
