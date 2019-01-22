<template>
  <svg
    :width="width"
    :height="height"
    class="conns"
    unselectable="on"
  >
    <rect
      :y="height - sizes.theConnsMarginBottom"
      :height="sizes.theConnsMarginBottom"
      :style="'fill:' + (this.$parent.$refs.theTerms || {}).bkgrColor"
      x="0"
      width="100%"
    />
    <conn
      v-for="(conn, index) in conns"
      :key="index"
      :index="index"
      :conn="conn"
      :paneHeight="height"
      unselectable="on"
    />
  </svg>
</template>


<script>
import Conn from './Conn.vue';

export default {
  name: 'TheConns',

  components: {
    'conn': Conn
  },

  props: {
    origConns: {
      type: Array,
      required: true
    },
    width: {
      type: Number,
      required: true
    },
    sizes: {
      type: Object,
      required: true
    }
  },

  data: function() { return {
    conns: []  // Current state of Conns. Starts as augmented `origConns`.
  }; },

  computed: {
    height() {
      return (this.conns.length + 1) * 6 + 25 + this.sizes.theConnsMarginBottom;
    }
  },

  watch: {
    origConns: function() {
      this.initForNewConns();
    }
  },

  mounted: function() {
    this.initForNewConns();
  },


  methods: {
    initForNewConns() {
      this.conns = this.origConns.slice();
    }
  }
};

function J(obj) { console.log(JSON.parse(JSON.stringify(obj))) }  J;
</script>


<style scoped>
  .conns {
    box-sizing: border-box;
    padding: 0;
    background-color: #fbfbfb;
  }
</style>
