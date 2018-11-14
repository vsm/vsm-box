<template>
  <div class="popup">
    Popup for {{ term.str }}.
  </div>
</template>


<script>

export default {
  name: 'ThePopup',

  props: {
    term: {
      type: Object,
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
  .popup {
    margin: 9px 0 0 2px;
    font-size: 12px;
    color: #888;
  }
</style>
