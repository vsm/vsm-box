<template>
  <svg
    :width="width"
    :height="height"
    class="conns"
    unselectable="on"
    @mousemove="onMousemove"
    @mouseleave="onMouseleave"
    @mousedown.left.stop="onMousedown"
  >
    <rect
      :y="height - sizes.theConnsMarginBottom"
      :height="sizes.theConnsMarginBottom"
      :style="`fill: ${ ($parent.$refs.theTerms || {}).bkgrColor };`"
      x="0"
      width="100%"
      class="terms-top-margin"
    />
    <g v-if="showAnyHighlight">
      <transition
        name="fade"
        appear
      >
        <rect
          v-if="showPosHighlight"
          :key="`phl${ 0 }`"
          :x="colX1s[hlPosNr]"
          :width="colX1s[hlPosNr + 1] - colX1s[hlPosNr]"
          :style="`fill: ${ sizes.connHLColorLight };`"
          y="0"
          height="100%"
          class="pos-highlight"
        />
      </transition>
    </g>
    <g v-if="showAnyHighlight">
      <transition
        name="fade"
        appear
      >
        <conn-highlight
          v-if="showConnHighlight"
          :key="`chl${ hlConnNr }`"
          :conn="conns[hlConnNr]"
          :sizes="sizes"
          :level-top="levelTop"
          :termX1s="termX1s"
          :termX2s="termX2s"
        />
      </transition>
    </g>
    <g
      v-for="(conn, index) in conns"
      :key="index"
    >
      <conn
        v-if="!conn.justRemoved"
        :conn="conn"
        :sizes="sizes"
        :level-top="levelTop"
        :termX1s="termX1s"
        :termX2s="termX2s"
      />
    </g>
    <g v-if="showAnyHighlight">
      <transition
        name="fade"
        appear
      >
        <conn-remove-icon
          v-if="showConnHighlight"
          :key="`cri${ hlConnNr }`"
          :conn="conns[hlConnNr]"
          :connNr="hlConnNr"
          :sizes="sizes"
          :level-top="levelTop"
          :termX2s="termX2s"
          @remove="onConnRemove"
        />
      </transition>
    </g>
  </svg>
</template>


<script>
/**
 *
 * --- TheConns.vue still needs a code review, and automated tests. ---
 *
 */


/**
 * Some terminology used in code & comments:
 *
 * TheConns divides its working space into so-called levels and positions.
 * - "Levels" are horizontal rows, which each hold space for one connector's
 *   backbone. (The connector's legs may be placed on the same level, or may
 *   extend further down).
 * - "Positions" ('pos') are vertical columns, one above each Term.
 * - A "cell" is a rectangular area designated by a particular level & position.
 *
 * Under the bottom of level 0 there is still some space left for visual clarity,
 * in addition to a "fake margin" above TheTerms. This margin looks like it
 * belongs to TheTerms (it gets the same background-color), but it is drawn upon
 * by a connector-highlight, to make it highlight nicely until against each Term.
 *
 * A connector has:
 * - a 'back' or 'backbone': the horizontal top line, (or for a list-connector:
 *   two parallel backbones);
 * - one 'leg' per Term it connects: a vertical line in the middle above
 *   each Term, and reaching down from the backbone;
 * - one 'foot' per leg: a horizontal line of about the Term's width, at the
 *   bottom of each leg. The foot makes it easier to see which Term a leg is
 *   connected to, as legs do not always extend all the way down to their Term.
 *
 * In addition:
 * - it can be an 'under-construction' (UC) connector, and then have one UC-leg;
 * - it can have a 'pos-highlight' (posHL): a full-column highlighted background
 *   drawn under its UC-leg;
 * - or when it is a non-UC-conn and mousehovered: it will have a 'connector-
 *   highlight' (connHL) under it, and possibly below it extending to TheTerms,
 *   with also a remove-icon (RI) above it.
 *
 * Note that coordinate-calculations are fairly complex, so that they can
 * support different linewidths, while also being drawn sharply (i.e. without
 * anti-alias blur) at integer widths. See the explanation in 'Conn.vue'.
 *
 *
 * About connHL and posHL 'fade'-transitions:
 * - Fade-in and -outs prevent that quick mousemoves across TheConns would cause
 *   flickering due to several briefly appearing full-opacity conn/posHLs.
 * - A connHL fades-in upon mousehovering onto its associated conn.
 * - A connHL fades-out when mousehovering onto another connHL, or posHL.
 *   + Fade-outs are made slower than fade-ins, as otherwise any 'hl-leg-under's
 *     that overlap between the 2 HLs could flicker (lightColor->none->light).
 * - A posHL does not fade-in but is shown immediately, just like the
 *   immediately shown UC-conn-leg that it accompanies, so the UC-leg never has
 *   a background that appears later.
 * - A posHL does not fade-out when mousehovering to another column. In fact
 *   there is only one, reused posHL element (achieved via `:key="<const>"`).
 *   This avoids a trail of posHLs when mousemoving left or right.
 * - A posHL fades-out when mousehovering onto a connHL.
 * - Any ongoing (and about-to-be-started) fade-ins and fade-outs are aborted as
 *   soon as mousehovering makes that no more connHL nor posHL is present.
 *   Aborting these (esp. already fired fadeouts) is achieved in the html
 *   by wrapping the `<transition>` inside a `<g v-if="showAnyHighlight">`. This
 *   makes any fading elements that Vue 'fires & forgets' will still get deleted.
 * + We use <transition appear> so that fade-in also happens at 1st mouseeenter.
 * + Important: this makes a 'justRemoved' conn's connHL to be immediately
 *   removed, so it won't temporarily stay behind as a fading-out ghost.
 * + Note: posHL and connHL each have a separate <transition>-block instead of
 *   one, so that fading-out posHLs remain shown behind an active connHL.
 */

import Conn from './Conn.vue';
import ConnHighlight from './ConnHighlight.vue';
import ConnRemoveIcon from './ConnRemoveIcon.vue';
import co from './connOperations.js';

const clone = obj => JSON.parse(JSON.stringify(obj));
const hook   = window.addEventListener;
const unhook = window.removeEventListener;


export default {
  name: 'TheConns',

  components: {
    'conn': Conn,
    'conn-highlight': ConnHighlight,
    'conn-remove-icon': ConnRemoveIcon
  },

  props: {
    origConns: {
      type: [Array, Boolean],
      required: true
    },
    width: {
      type: Number,
      required: true
    },
    sizes: {
      type: Object,
      required: true
    },
    termsChangeNr: {
      type: Number,
      required: true
    },
    enabled: {  // If `false`, TheConns does not respond to mouse-events, ..
      type: Boolean,  // ..e.g. during Term-dragging.
      default: true
    }
  },


  data: function() { return {
    conns: [],  // Current state of Conns. Starts as augmented `origConns`.
    lastKeys: [],  // Stores which term-key was last seen at each Term position.
    fullTerms: [],  // Will be a reference to TheTerms full `terms` data.
    termX1s: [],  // } The current left- and right x-coordinate of each Term.
    termX2s: [],  // }
    colX1s: [],  // The current left x-coo of the column above a Term.
    highLevels: [],  // Top used level per Term position.
    hlConnNr: -1,  // Tells if and which connector is highlighted.
    levelCount: this.sizes.theConnsMinLevels,  // Current number of levels.
    cellOwner: [[]], // Index of the connector that occupies cell at (pos,level).
    finalizeTimer: 0, // Helps create a delay between add/remove-conn and resort.
    shiftCtrlListener: 0, // Temp. active while there's an UC-Conn with 1 leg.
    escListener: 0,       // } Temp. active while there's an UC-Conn with >1 leg.
    clickOutListener: 0   // } " .
  }; },


  computed: {
    lastConn() {
      var n = this.conns.length;
      return !n ? false : this.conns[n - 1];
    },


    /**
     * Tells if the last connector in `this.conns` is an "Under-Construction"
     * connector.
     * Note that just like TheTerms' "endTerm" (which is a part of the UI, but
     * not emitted), the UC-conn is not emitted either.
     * When the user finalizes constructing an UC-conn, it becomes a real conn.,
     * and there is no UC-conn anymore in the UI (unlike endTerm, which is
     * always present) until the user starts creating another connector.
     */
    hasUCConn() {
      return this.lastConn  &&  !!this.lastConn.isUC;
    },


    /**
     * Tells if there is an UC-Conn for which the user clicked once already.
     */
    hasActiveUCConn() {
      return this.lastConn.isUC  &&  this.lastConn.pos.length > 1;
    },


    /**
     * Calculates TheConns-panel's current height in pixels.
     */
    height() {
      return this.levelCount * this.sizes.theConnsLevelHeight
        + this.sizes.theConnsMarginBottom + this.sizes.theConnsSpaceBelow;
    },


    /**
     * Tells if and which Term-pos column is highlighted.
     * This depends on there being an under-construction connector. It follows
     * its last, under-construction leg.
     */
    hlPosNr() {
      if (!this.hasUCConn)  return -1;
      var arr = this.lastConn.pos;
      return arr[arr.length - 1];
    },


    /**
     * Tells if a pos-highlight component (column at UC-conn-leg) may be shown.
     */
    showPosHighlight() {
      return this.hlPosNr >= 0  &&  this.hlPosNr < this.colX1s.length - 1;
    },


    /**
     * Tells if a connector-highlight component (and remove-icon) may be shown.
     */
    showConnHighlight() {
      return this.hlConnNr >= 0  &&  this.hlConnNr < this.conns.length
        &&  !this.conns[this.hlConnNr].justRemoved
        &&  !this.conns[this.hlConnNr].justAdded
        &&  !this.conns[this.hlConnNr].isUC
        &&  !this.hasActiveUCConn;
    },


    /**
     * Tells if any highlight-component is currently shown.
     */
    showAnyHighlight() {
      return this.showPosHighlight || this.showConnHighlight;
    },


    /**
     * Tells if any conn is currently marked as justAdded or justRemoved. (If so,
     * mousemove won't cause the creation of a new UC-conn and posHL, or connHL).
     */
    anyConnJustAddedOrRemoved() {
      return this.conns.filter(c => c.justRemoved || c.justAdded).length;
    }
  },


  watch: {
    origConns: function(val) {
      this.updateTermsRef();
      if (val === false)  this.reset();
      else  this.initForNewConns();
    },

    termsChangeNr: function(val) {
      this.updateAfterTermsChange(val);
    },

    height: function() {
      this.calcCoordinates();
    },

    enabled: function(val) {
      if (!val) {
        this.hlConnNr = -1;
        if (this.hasUCConn)  this.removeUCConn();
      }
    }
  },


  created: function() {
    this.shiftCtrlListener = ev => {
      var type = this.eventModifiersToConnType(ev);
      this.updateUCConnType(type);
    };
    this.escListener      = ev => { if (ev.key == 'Escape') this.stopUCConn(); };
    this.clickOutListener = () => this.stopUCConn();
  },


  destroyed: function() {
    this.setShiftCtrlListeners(false);
    this.setStopUCConnListeners(false);
  },


  methods: {
    /**
     * Updates the direct reference to TheTerms' full `terms` data,
     * after TheTerms possibly created a new array.
     */
    updateTermsRef() {
      this.fullTerms = this.$parent.$refs.theTerms.terms;
    },


    /**
     * Returns an array with the `key` of each Term, in their current order
     * of appearance. (Requires that the `fullTerms`-reference is up to date).
     */
    getCurrentTermKeys() {
      return this.fullTerms.slice(0, -1).map(t => t.key);
    },


    /**
     * Called after VsmBox initializes or receives a new `initialValue`,
     * but before TheTerms has calculated new Term coordinates.
     */
    reset() {
      this.conns = [];
      this.lastKeys = [];
    },


    /**
     * Constructs and emits the current, publicly visible state of TheConns,
     * excluding any UC-conn (=a possibly-existing under-construction connector).
     */
    emitValue(eventStr, termsChangeNr = null) {
      var conns = this.conns
        .filter(c => !c.isUC  &&  !c.justRemoved)
        .map(co.prepConnToEmit);

      this.$emit(eventStr || 'change', { conns, termsChangeNr });
    },


    /**
     * Called at start and after TheTerms calculated new Term coordinates.
     */
    initForNewConns() {
      this.hlConnNr = -1;
      this.lastKeys = this.getCurrentTermKeys();

      this.conns = this.origConns
        .map(conn =>
          Math.max(...conn.pos) > this.fullTerms.length - 2 ?
            false :  // Remove any conn. with a leg to where there is no Term.
            co.prepConnToReceive(conn)
        )
        .filter(c => c);

      this.sortConnectors();  // This also calls `calcCoordinates()`.

      this.emitValue('change-init');
    },


    /**
     * Updates connector-leg positions and coordinates, based on changes in
     * TheTerms (e.g. dragging a Term, editing a Term which makes it wider, etc).
     */
    updateAfterTermsChange(termsChangeNr) {
      this.hlConnNr = -1;
      this.updateTermsRef();
      if (this.hasUCConn)  this.removeUCConn();

      this.makeLegsFollowTerms();  // (Updates coordinates as well).
      this.emitValue(0, termsChangeNr);
    },


    /**
     * Updates the position of existing connector-legs, according to the
     * possibly new positions of Terms, after TheTerms reported a 'change'.
     * It tracks Terms' `key` property to detect if Terms changed position,
     * or if a Term was removed (which must result in deleting attached Conns).
     */
    makeLegsFollowTerms() {
      var newKeys = this.getCurrentTermKeys();

      var gone  = {};
      var moved = {};
      this.lastKeys.forEach((key, i) => {
        var j = newKeys.indexOf(key);
        if      (j == -1)  gone [i] = true;
        else if (j !=  i)  moved[i] = j;
      });

      var conns = this.conns.map(conn_0 => {
        var conn = clone(conn_0);  // Makes each Conn check if some data changed.

        // Key-tracking also causes update of `pos[]`es behind a deleted Term.
        conn.pos = conn.pos.map(
          p => gone[p] ? -2 : moved[p] !== undefined ? moved[p] : p );

        // + If one of this connector's legs was removed, then tag the connector
        //   as `justRemoved`. This makes it invisible until connector-resorting,
        //   when it is really removed. It is visually clearer to delete, then
        //   compact & resort, than delete & compact (when re-stacking) at once.
        // + All _remaining_ legs are kept in `pos`, so that conn-(re)stacking
        //   works as if they were still there.
        if (conn.pos.includes(-2))  conn.justRemoved = true;

        if (conn.type == 'L')  co.sortListConnElemPos(conn);
        return conn;
      });

      this.lastKeys = newKeys;
      this.conns = conns;


      // If a Term was removed, then only update horizontal coordinates/data.
      // (Updating vertical coos will then be postponed until connector-resort.
      //  That makes changes visually easier to follow).
      var gones = Object.keys(gone);
      if (gones.length) {
        gones.sort((a, b) => a - b).reverse().forEach(p => {
          this.highLevels.splice(p, 1);
          this.cellOwner .splice(p, 1);
        });
        this.calcCoordinates(false);
        this.delayedFinalizeChanges();
      }
      else {  // Else (e.g for dragged Term), immediately update sorting & coos.
        this.sortConnectors();
      }
    },


    /**
     * Calculates coordinates and levels (from which each Conn calculates coos)
     * for the connector-backbone and its legs, based on the latest Term coos.
     * + It replaces `this.conns` with enriched objects, all at once. This makes
     *   all sub-properties reactive, all at once.
     */
    calcCoordinates(updateStacking = true) {
      // 1) Calculate `termX1/2s` and `colX1s`; and init. `highLevels` with -1s.
      var termX1s = [];
      var termX2s = [];
      var colX1s  = [];
      var highLevels = [];
      var highestLevelExclUC = -1;

      this.fullTerms.forEach((term, i) => {
        termX1s[i] = term.x;
        termX2s[i] = term.x + term.width;
        colX1s [i] = i == 0 ? 0 : term.x
          - ((this.$parent.$refs.theTerms || {}).termMarginHor || 0) / 2;
        highLevels[i] = -1;
      });
      this.termX1s = termX1s;  // Assign at once. Prevent using `this.$set()`.
      this.termX2s = termX2s;
      this.colX1s = colX1s;


      // 2) Enrich each connector (object in `conns[]`) with useful data.
      this.conns = this.conns.map(conn => {
        conn = Object.assign({}, conn);

        this.setConnPosAZ(conn);

        if (!updateStacking)  return conn;

        // Determine how high each Conn's feet and backbone are located above
        // the Terms, starting from level 0.
        // Stack the connectors on top of each other (in given order),
        // whereby their feet reach down to the connector below, or to TheTerms.
        conn.footLevels = [];
        conn.pos.forEach((p, i) => {
          conn.footLevels[i] = p < 0 ? p :
            conn.pos.slice(0, i).includes(p) ? highLevels[p] : // =Pos occurs 2x?
              ++highLevels[p];
        });

        var max = 0;
        var realPos = conn.pos.filter(p => p >= 0);
        for (var p = conn.posA; p <= conn.posZ; p++) {
          // Part 2 of the sum checks if we should climb over another connector.
          max = Math.max(max, highLevels[p] + (realPos.includes(p) ? 0 : 1) );
        }
        for (    p = conn.posA; p <= conn.posZ; p++)  highLevels[p] = max;
        conn.backLevel = max;

        // Make that `levelCount` depends on only non-UC-conns' highest level.
        // (Note that any UC-conn is always the last one in the array).
        if (!conn.isUC)  highestLevelExclUC = Math.max(...highLevels);

        return conn;
      });

      if (!updateStacking)  return;

      this.highLevels = highLevels;


      // 3) Calculate `levelCount`. This will determine TheConns' current height.
      this.levelCount = Math.max(
        this.sizes.theConnsMinLevels,  highestLevelExclUC + 2);


      // 4) Fill the `cellOwner[][]` matrix.
      var cellOwner = [];
      var n = this.fullTerms.length;  // (Includes a column above the endTerm).
      var m = this.levelCount;
      for (var i = 0; i < n; i++) {
        cellOwner[i] = [];
        for (var j = 0; j < m; j++)  cellOwner[i][j] = -1;  // `-1`==unoccupied.
      }
      this.conns.forEach((conn, connNr) => {
        conn.pos.forEach((p, posNr) => {  // Deal with leg above Term at `p`.
          for (j = conn.footLevels[posNr]; j <= conn.backLevel; j++) {
            if (p >= 0)  cellOwner[p][j] = connNr;
          }
        });
        for (i = conn.posA; i < conn.posZ; i++) {  // Deal with the backbone.
          cellOwner[i][conn.backLevel] = connNr;
        }
      });
      this.cellOwner = cellOwner;
      ///console.log('---\n'+cellOwner.map((a,i) => i+': '+a.join(',')
      ///  +' :'+this.fullTerms[i].str).join('\n'));
    },


    /**
     * Changes the given connector object, by setting/adding `posA` and `posZ`.
     */
    setConnPosAZ(conn) {
      var realPos = conn.pos.filter(p => p >= 0); // Excl.s bident missing leg.
      conn.posA = Math.min(...realPos);  // Leftmost Term position.
      conn.posZ = Math.max(...realPos);  // Rightmost Term position.
    },


    /**
     * Returns the top Y-coordinate for any given level (=Y-coo. still in it).
     * Note that Y-coordinates start from 0 at the top of the screen,
     * while levels start from 0 at the bottom, closest to TheTerms.
     */
    levelTop(level) {
      return this.height - this.sizes.theConnsMarginBottom
        - this.sizes.theConnsSpaceBelow
        - this.sizes.theConnsLevelHeight * (level + 1);
    },


    /**
     * Gets the coordinates of the mouse from the given mouse-event,
     * relative to the top-left of TheConns.
     * Returns an array with 2 values: x- and y-coordinate.
     */
    eventToCoos(event) {
      var theConns = this.$el.getBoundingClientRect();
      return [
        event.clientX - ~~theConns.left,
        event.clientY - ~~theConns.top ];
    },


    /**
     * For coordinates (x,y), tells which (pos,level)-cell is located there.
     */
    coosToCell(x, y) {
      for (var pos   = this.fullTerms.length - 1; pos   > 0; pos--  ) {
        if (x >= this.colX1s[pos])  break;
      }
      for (var level = this.levelCount;           level > 0; level--) {
        if (y < this.levelTop(level - 1))  break;   // (Top level has lowest Y).
      }
      return { pos, level };
    },


    eventToCell(event) {
      return this.coosToCell(...this.eventToCoos(event));
    },


    onMousemove(event) {
      if (!this.enabled || this.anyConnJustAddedOrRemoved)  return;
      var cell = this.eventToCell(event);
      this.updateHLConnNr(cell);
      this.handleUCConnAfterMousemove(event, cell);
    },


    onMouseleave() {
      if (!this.enabled)  return;
      this.hlConnNr = -1;
      if (this.hasUCConn  &&  !this.hasActiveUCConn)  this.removeUCConn();
    },


    onMousedown(event) {
      if (!this.enabled)  return;
      var cell = this.eventToCell(event);

      if (cell.pos == this.fullTerms.length - 1) {
        // If enabled, next line makes click above endTerm stop UC-Conn-constr.
        ///if (this.hasActiveUCConn)  this.stopUCConn();  else
        if (!this.hasActiveUCConn)  this.$emit('click-above-end-term');
        return;
      }

      this.handleUCConnAfterMousedown(event, cell);
    },


    updateHLConnNr(cell) {
      var connNr = this.cellOwner[cell.pos][cell.level];
      var conn   = this.conns[connNr];
      this.hlConnNr = (!conn || conn.justRemoved || conn.isUC ||
        this.hasActiveUCConn) ?  -1 :  connNr;
    },


    onConnRemove(index) {
      if (!this.enabled)  return;
      this.hlConnNr = -1;
      this.$set(this.conns[index], 'justRemoved', true);
      this.emitValue();
      this.delayedFinalizeChanges();
    },


    delayedFinalizeChanges() {
      if (this.finalizeTimer)  clearTimeout(this.finalizeTimer);
      this.finalizeTimer = setTimeout(this.finalizeChanges.bind(this),
        this.sizes.theConnsResortDelay);
    },


    /**
     * Is called after the resort-delay. Continues processing the addition or
     * removal of a connector, or a change in term positions.
     */
    finalizeChanges() {
      clearTimeout(this.finalizeTimer);
      this.hlConnNr = -1;  // Because a Conn may be removed, invalidating this.
      this.conns = this.conns.reduce((a, conn) => {
        if (conn.justRemoved)  return a;
        if (conn.justAdded)  this.$delete(conn, 'justAdded');
        a.push(conn);
        return a;
      }, []);
      this.sortConnectors();
    },


    handleUCConnAfterMousemove(event, cell) {
      if (this.hlConnNr < 0  &&  cell.pos < this.fullTerms.length - 1) {
        var type = this.eventModifiersToConnType(event);
        if (!this.hasUCConn) {
          this.createUCConn(type, cell);
        }
        else {
          this.updateUCConnType(type);
          this.updateUCConnPos(cell);
        }
      }
      else {
        if (this.hasUCConn  &&  !this.hasActiveUCConn)  this.removeUCConn();
      }
    },


    handleUCConnAfterMousedown(event, cell) {
      this.updateHLConnNr(cell);
      if (!this.hasUCConn  &&  this.hlConnNr < 0) {
        this.handleUCConnAfterMousemove(event, cell);
      }

      if (!this.hasUCConn)  return;

      this.updateUCConnType   (this.eventModifiersToConnType(event));
      this.updateUCConnOnClick(cell);
    },


    eventModifiersToConnType(event) {
      return event.shiftKey ? 'L' : event.ctrlKey ? 'R' : 'T';
    },


    createUCConn(type, cell) {
      this.setShiftCtrlListeners(true);
      this.conns.push({ type, pos: [cell.pos], isUC: true });
      this.calcCoordinates();
    },


    updateUCConnType(type) {
      if (this.hasUCConn  &&  !this.hasActiveUCConn  &&
        this.lastConn.type != type
      ) {
        var conn = clone(this.lastConn);
        conn.type = type;
        this.$set(this.conns, this.conns.length - 1, conn);
      }
    },


    updateUCConnPos(cell) {
      if (this.hasUCConn) {
        var arr = this.lastConn.pos;
        if (arr[arr.length - 1] != cell.pos) {
          var conn = clone(this.lastConn);
          conn.pos[arr.length - 1] = cell.pos;
          this.$set(this.conns, this.conns.length - 1, conn);

          this.calcCoordinates();
        }
      }
    },


    updateUCConnOnClick(cell) {
      var conn = clone(this.lastConn);
      var type = conn.type;
      var n = conn.pos.length;
      var p = cell.pos;

      if (n == 1) {  // (This includes the UC-leg).
        this.setShiftCtrlListeners(false);
        conn.pos.push(p);
      }
      else if (type == 'T') {
        if (n == 2) {
          if (conn.pos[0] == p)  conn.pos[0] = -1;
          conn.pos.push(p);
        }
        else {
          if (conn.pos[0] == p)  return;
          if (conn.pos[1] == p) {
            if (conn.pos[0] == -1)  return this.removeUCConn();
            conn.pos[1] = -1;
          }
          conn.justAdded = true;
        }
      }
      else if (type == 'L') {
        if (n == 2) {
          if (conn.pos[0] == p)  return this.removeUCConn();
          conn.pos.push(p);
        }
        else if (!conn.pos.slice(0, n - 1).includes(p))  conn.pos.push(p);
        else {
          conn.pos.pop();
          co.sortListConnElemPos(conn);  // Only now, as UC-leg must be last leg.
          conn.justAdded = true;
        }
      }
      else if (type == 'R') {
        if (conn.pos[0] == p)  return this.removeUCConn();
        conn.justAdded = true;
      }

      if (conn.pos.length == 2)  this.setStopUCConnListeners(true); // (Not `n`).

      this.$set(this.conns, this.conns.length - 1, conn);

      if (conn.justAdded) {
        delete conn.isUC;
        this.setStopUCConnListeners(false);
        this.emitValue();
        this.delayedFinalizeChanges();
      }
      else  this.calcCoordinates();
    },


    removeUCConn() {
      this.setShiftCtrlListeners(false);
      this.conns.pop();
      this.calcCoordinates();
    },


    stopUCConn() {
      if (!this.hasUCConn)  return;
      this.setStopUCConnListeners(false);

      var conn = clone(this.lastConn);
      if (conn.pos.length < 2)  return;  // (Just an extra safety).

      if (conn.type == 'T'  &&  conn.pos.length == 3 && conn.pos[0] != -1) {
        conn.pos[2] = -1;
        conn.justAdded = true;
      }
      else if (conn.type == 'L'  &&  conn.pos.length > 2)  {
        conn.pos.pop();
        co.sortListConnElemPos(conn);
        conn.justAdded = true;
      }

      if (conn.justAdded) {
        delete conn.isUC;
        this.setConnPosAZ(conn);  // As mouse may hover outside A-Z at Esc-press.
        this.$set(this.conns, this.conns.length - 1, conn);
        this.emitValue();
        this.delayedFinalizeChanges();
      }
      else  this.removeUCConn();
    },


    setShiftCtrlListeners(bool) {
      var f = bool ? hook : unhook;
      f('keydown', this.shiftCtrlListener);
      f('keyup'  , this.shiftCtrlListener);
    },


    setStopUCConnListeners(bool) {
      var f = bool ? hook : unhook;
      f('keydown'  , this.escListener);
      f('mousedown', this.clickOutListener);
    },


    sortConnectors() {
      this.conns = co.sortConnectors(this.conns);
      this.calcCoordinates();
    }
  }
};
</script>


<style scoped>
  .conns {
    box-sizing: border-box;
    padding: 0;
    background-color: #fbfbfb;
  }

  /* This seems to prevent the problem of sometimes not receiving a 'mouseleave',
     which could leave a connector highlighted after the mouse left TheConns. */
  .conns * {
    pointer-events: none;
  }

  .conns g.conn-remove-icon:not([class*="fade-leave"]) {
    pointer-events: auto;
  }

  .fade-enter:not(.pos-highlight),
  .fade-leave-to {
    opacity: 0;
  }

  .fade-enter-active:not(.pos-highlight) {
    transition: opacity 0.08s ease-in;
  }

  .fade-enter-active.conn-remove-icon {
    transition-duration: 0.16s;
  }

  .fade-leave-active {
    transition: opacity 0.14s ease-in;
  }
</style>
