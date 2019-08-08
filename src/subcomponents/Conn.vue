<template>
  <g class="conn">
    <line
      v-if="drawBack"
      :x1="backX1 - lwh"
      :y1="backY + h"
      :x2="backXM"
      :y2="backY + h"
      :style="backStyle"
      :stroke-dasharray="isRef ? sizes.connRefDashes : 'none'"
      class="back left"
    />
    <line
      v-if="drawBack"
      :x1="backX2 + lwh + h + h"
      :y1="backY + h"
      :x2="backXM"
      :y2="backY + h"
      :style="backStyle"
      :stroke-dasharray="isRef ? sizes.connRefDashes : 'none'"
      class="back right"
    />
    <line
      v-if="isList && drawBack"
      :x1="backX1 - lwh"
      :y1="backY + h + sizes.connListBackSep"
      :x2="backX2 + lwh + h + h"
      :y2="backY + h + sizes.connListBackSep"
      :style="backStyle"
      class="back two"
    />
    <conn-leg
      v-for="(leg, i) in legs"
      :key="i"
      :leg="leg"
      :sizes="sizes"
      :l="l"
    />
    <conn-leg-stub
      v-if="legStub"
      :stub="legStub"
      :sizes="sizes"
      :l="l"
    />
  </g>
</template>


<script>
import ConnLeg from './ConnLeg.vue';
import ConnLegStub from './ConnLegStub.vue';

const mid = (a, b) => ~~((a + b - 1) / 2);


export default {
  name: 'Conn',

  components: {
    'conn-leg': ConnLeg,
    'conn-leg-stub': ConnLegStub
  },

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
    /**
     * These three functions help with precise positioning of lines relative
     * to each other.
     * + They help with making lines being drawn sharply. Note e.g. that for a
     *   horizontal line at height `y`, with strokeWidth 1, the browser draws it
     *   from half a pixel above to half a pixel below `y`. So it draws the line
     *   anti-aliased over two rows of pixels, which makes it look blurry. But:
     *   a stroke at <int>`y` + 0.5 draws on 1 row of pixels only, i.e. sharply.
     * + But, adding 0.5 must not be done for an even strokeWidth. E.g. for
     *   strokeWidth 2, it fills 1 pixel-row above and 1 below, perfectly.
     * + The horizontal backbone and vertical legs at its outer left/right side
     *   must visually join perfectly. Therefore, the backbone starts and ends
     *   half a strokeWidth more left/right, and legs start half a strokeWidth
     *   lower. This again is adjusted for even/odd strokeWidth, for sharpness.
     * + We must use <line>s and not <rect>s (which would be simpler wrt. coos),
     *   because the ref-conn must be drawn with dashes, which only <line>s can.
     */
    h   () { return this.sizes.connLineWidth % 2 / 2 },
    lw  () { return this.sizes.connLineWidth },
    lwh () { return ~~(this.lw / 2) },

    // Combines the three above, so we can easily pass them using one prop.
    l()    { return { h: this.h, lw: this.lw, lwh: this.lwh } },

    isRef () { return this.conn.type == 'R' },
    isList() { return this.conn.type == 'L' },

    realPos() { return this.conn.pos.filter(p => p >= 0) },
    posA() { return Math.min(...this.realPos) },  // Outer left Term position.
    posZ() { return Math.max(...this.realPos) },  // Outer right Term position.

    // Where the backbone starts & ends.
    backX1() {
      return mid(this.termX1s[this.conn.posA], this.termX2s[this.conn.posA]) ||0;
    },
    backX2() {
      return mid(this.termX1s[this.conn.posZ], this.termX2s[this.conn.posZ]) ||0;
    },

    // `backM` helps split the ref-conn in two parts, and drawing both from side
    // to middle. This makes its dashes (never gaps) always connect to the sides.
    backXM()  { return (this.backX1 + this.backX2 - 1) / 2 + 0.5 },

    backY() {
      return this.levelTop(this.conn.backLevel) +
        this.sizes.connBackDepth;
    },

    // `drawBack` tells if the backbone should be drawn. It should not be drawn
    // for an under-construction connector with only one leg so far.
    drawBack() {
      return this.conn.pos.length > 1;
    },

    backStyle () {
      return `stroke: ${this.sizes.connBackColor}; stroke-width: ${this.lw};`;
    },


    legs()  {
      return this.conn.pos.reduce((a, p, i) => {
        if (p >= 0) {
          var type =
            this.conn.type    =='T' ? ( !i ? 'S' : i==1 ? 'R' : i==2 ? 'O' : ''):
              this.conn.type  =='L' ? ( !i ? 'L' : 'E' ) :
                this.conn.type=='R' ? ( !i ? 'C' : i==1 ? 'P' : '' ) : '';
          if (type) {
            var footX1 = this.termX1s[p] || 0;
            var footX2 = this.termX2s[p] || 0;
            var footLevel = this.conn.footLevels[i];
            var isUC = this.conn.isUC  &&  i == this.conn.pos.length - 1;
            a.push({
              x: mid(footX1, footX2),
              y1: this.backY,
              y2: this.levelTop(footLevel) + this.sizes.connFootDepth,
              footX1,
              footX2,
              type,
              isUC,
              // Tells if a list-leg is at the same position of a previous one.
              doublesUp: this.conn.pos.slice(0, i).includes(p)
            });
          }
        }
        return a;
      }, []);
      ///console.log(JSON.stringify(q));
      ///return q;
    },


    legStub() {
      const isRev = (a, b) => this.conn.pos[a] > this.conn.pos[b];

      if (this.conn.type == 'T') {
        var y1 = this.backY + this.h;
        if (     this.conn.pos[0] < 0) {
          var rev = isRev(1, 2);
          return { type: 'S',
            side: rev ? 1 : -1,  x: rev ? this.backX2 : this.backX1,  y1 };
        }
        else if (this.conn.pos[1] < 0) {
          return { type: 'R',
            side: 0,             x: this.backXM,                      y1 };
        }
        else if (this.conn.pos[2] < 0) {
          rev = isRev(0, 1);
          return { type: 'O',
            side: rev ? -1 : 1,  x: rev ? this.backX1 : this.backX2,  y1 };
        }
      }
      return false;
    }

  }
};
</script>
