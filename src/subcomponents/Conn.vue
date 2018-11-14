<template>
  <g>
    <circle
      v-for="(x, i) in conn.slice(1)"
      :key="i"
      :cx="6 + 10 * x"
      :cy="paneHeight - 8 - (10 * index)"
      :r="2"
      :class="conn"
      :fill="conn[0] == 0 ? 'black': conn[0] == 1 ? 'blue': '#999'"
    />
  </g>
</template>


<script>

export default {
  name: 'Conns',

  components: {
  },

  props: {
    index: {
      type: Number,
      required: true
    },
    conn: {
      type: Array,
      required: true
    },
    paneHeight: {
      type: Number,
      required: true
    }
  },

  computed: {
  },

  methods: {
  }
};
</script>


<style scoped>
  .conn {
    margin: 0;
    font-size: 12px;
    color: #aaa;
  }
</style>
