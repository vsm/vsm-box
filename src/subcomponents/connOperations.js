const clone = obj => JSON.parse(JSON.stringify(obj));


var co = {  // Here starts the exported Object.

  prepConnToReceive(conn_0) {
    var conn = clone(conn_0);
    co.pruneProperties(conn);
    return conn;
  },


  prepConnToEmit(conn_0) {
    var conn = clone(conn_0);
    co.pruneProperties(conn);
    return conn;
  },


  /**
   * Remove extra properties from a connector-object that would interfere
   * when receiving the data, or that are internal and should not be emitted.
   */
  pruneProperties(conn) {
    delete conn.backLevel;
    delete conn.footLevels;
    delete conn.posA;
    delete conn.posZ;
    delete conn.isUC;  // =Is the connector "under-construction".
    delete conn.justRemoved;
    delete conn.justAdded;
  },


  /**
   * Returns an array in which all connectors in `conns`
   * are sorted in a visually natural-looking order.
   *
   *
   * --- This is TEMPORARY code: see `protoSortVSMConns()`. ---
   *
   */
  sortConnectors(conns) {
    // Translate our `conns` to the prototype's old data-representation.
    var protoConns = conns.map((conn, i) => ({
      type: conn.type == 'T' ? 0 : conn.type == 'L' ? 1 : 2,
      ttd:  conn.pos.map(p => ({ eid: p < 0 ? null: `pos-${p}`,   pos: p })),
      pos0: Math.min(...(conn.pos.filter(p => p >= 0))),
      pos1: Math.max(...conn.pos),
      origIndex: i  // Keeps track of which 'protoConn' went where.
    }));

    // Make two more values that the prototype needs.
    var vsmUCStatus = (conns.length  &&  conns[conns.length - 1].isUC) ? 1 : 0;
    var n = 0;
    conns.forEach(conn => n = Math.max(n, ...conn.pos));

    // Call the prototype's connector-sorting code.
    protoConns = co.protoSortVSMConns(protoConns, vsmUCStatus, n + 1);

    // Use its output to create an equivalent reordering of our modern `conns`.
    var conns2 = protoConns.map(c => conns[c.origIndex]);

    return conns2;
  },



  /**
   *
   * --- This is TEMPORARY connector-sorting code. ---
   *
   * This code was plucked from the prototype and slightly minified.
   * It will later be replaced by something more understandable,
   * and that works on the modern data-structure used in the rest of vsm-box.
   */
  protoSortVSMConns(vsmConns, vsmUCStatus, ttsLength) {  /* eslint-disable */
    var i, v, ttd, j, m, d, e, k, t, n, a, va, cx=-1, cy,
        ttls = [],  ttgr = [],  v2s = [],  v2sub,  out = [],  levMaxs,
        nt = ttsLength,
        vs = vsmConns,  nv = vs.length,
        contains = function(a, e)  {
          for(var i=0; i<a.length; i++) if(a[i]===e) return true;  return false;
        };

    for(i=0; i<nt; i++)  ttls.push([]);
    if(vsmUCStatus>0)  va = vs[--nv];

    for(i=0; i<nv; i++){
      v = vs[i];  ttd = v.ttd;

      for(j=0, m=ttd.length; j<m; j++){
        d = ttd[j];
        if(d.eid==null)  continue;
        switch(v.type){
          case 0:
            if(     j==0)  t = m<3 || (((e=ttd[1]).eid==null || d.pos<e.pos) &&
              ((e=ttd[2]).eid==null || d.pos<e.pos))? 3: 2;
            else if(j==2)  t = m<3 || (((e=ttd[0]).eid==null || d.pos>e.pos) &&
              ((e=ttd[1]).eid==null || d.pos>e.pos))? 5: 4;
            else t = 1;
            break;
          case 1:  t = j==0? 0: 6;  break;
          default: t = j==0? 7: 8;
        }
        ttls[d.pos].push({nr:i, t:t});
      }
    }

    var cmp = function(i, j){
      var k, c, a, m, e, x, y;
      for(k=0; k<nt; k++){
        for(c=0, a=ttls[k], m=a.length, x=y=-1; c<m; c++){
          if((e=a[c]).nr==i) x=e.t;
          if(       e.nr==j) y=e.t;
        }
        if(x>=0 && y>=0)  break;
      }
      return k==nt || x==y? 0: (x<y? -1: 1);
    }

    for(i=0; i<nt; i++)  ttgr.push(i);
    for(i=0; i<nv; i++)  v2s.push({nr:i, v:vs[i], c:0, s:false});

    while(v2s.length > 0){
      for(i=0, n=v2s.length, k=nt; i<n; i++){
        v = v2s[i].v;  ttd = v.ttd;
        for(j=v.pos0, a=[]; j<=v.pos1; j++)  if(!ttls[j].length==0  &&
          !contains(a, e=ttgr[j])) a.push(e);
        k = Math.min(k,  v2s[i].c = a.length -
          (ttd.length - (v.type==0 && (ttd[0].eid==null || ttd[1].eid==null ||
            ttd[2].eid==null)? 1: 0))  );
      }

      v2sub = [];
      for(i=0; i<n; i++)  if((e=v2s[i]).c == k)  v2sub.push(e);

      for(i=0, m=v2sub.length; i<m; i++)  v2sub[i].s = false;
      for(i=0; i<m; i++){
        for(j=i+1; j<m; j++){
          k = cmp(v2sub[i].nr, v2sub[j].nr);
          if(k>0) v2sub[i].s=true;  else if(k<0) v2sub[j].s=true;
        }
      }

      for(i=0, k=true; i<m; i++)  k = k && v2sub[i].s;

      for(i=0, a=nt, j=0; i<m; i++){
        e = v2sub[i];
        if((!e.s || k) && (d=e.v.pos0) < a)  {a = d;  j = i;}
      }

      out.push((e=v2sub[j]).v);
      for(i=0, j=e.nr; i<n; i++)  if(v2s[i].nr==j) {v2s.splice(i,1); break;}

      for(i=0, a=[], ttd=e.v.ttd, n=ttd.length;  i<n; i++)
        if((e=ttd[i]).eid!=null) a.push(ttgr[e.pos]);
      for(i=0, d=a.pop();  i<nt; i++)  if(contains(a, ttgr[i])) ttgr[i] = d;
    }

    if(vsmUCStatus>0)  {out.push(va); nv++;}
    vs = vsmConns = out;
    return vsmConns;
  },
};                                                           /* eslint-enable */



///function J(obj) { console.log(JSON.parse(JSON.stringify(obj))) }  J;
///function C(a) { console.log(a.map(JSON.stringify).join('\n') + ';') }  C;

export default co;
