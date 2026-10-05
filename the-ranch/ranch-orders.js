// ranch-orders.js: the rancher's mind. You give him jobs and he keeps them in a list, doing one after another; each job he
// works out for himself as a string of steps: which way to walk round the trees, buildings and fences, when he needs the
// tractor (and climbing on and off it), where to spear a bale at the hay barn and where to drive it so it drops in the
// ring, which animals he still has to look over (he goes to the nearest next, following it if it wanders). There is no
// program out on the internet in this: it is a little in-game helper, written here.
// Defines makeOrders(G). G is the ranch's side of it (ranch.js):
//   crew: {x, z, h, speed, pose, onTractor} (the rancher), tractor: {x, z, h, speed, steer, loader, running, bale}
//   path(from, to) -> [{x, z}, ...] or null (a way on foot or by tractor, round what is in the way)
//   spots: {park, parkH, bale, baleH, ring, tap, tapH, coop, coopH, feed, feedH, feedOut, salt, porch, porchH, fence,
//     tractorSide()} (world positions and the way to face there)
//   act: {hayOut(), putOutHay(), fillTroughs(), troughsFull(), hoseOff(), chickensOut(), letChickensOut(), fed(),
//     feedChickens(), saltOut(), setSalt(), unseen() (the animals not looked over yet), see(cow), lookFrom(cow)}
//   say(text), climbOn(), climbOff() (move the rancher onto the tractor's seat and back down beside it)
(function (root) {
  'use strict';
  const PI = Math.PI, TAU = PI * 2;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = a => ((a + PI) % TAU + TAU) % TAU - PI;

  function makeOrders(G) {
    const C = G.crew, TR = G.tractor, S = G.spots;
    const WALK = 1.35, DRIVE = 3.2;

    // ---------- moving along a way ----------
    // walking: turn quickly toward the next point and walk; driving: steer like a tractor (it can't turn on the spot),
    // slowing down for sharp turns and as it comes in
    function along(a, way, dt, o) {
      if (!way || !way.length) return true;
      const p = way[0], dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz), last = way.length === 1;
      if (d < (last ? o.near : o.pass)) { way.shift(); if (!way.length) { a.speed = 0; if (o.car) a.steer = 0; return true; } return false; }
      const dh = wrap(Math.atan2(dx, dz) - a.h);
      let want = o.top;
      if (o.car) {
        if (Math.abs(dh) > .9) want = .9; else if (Math.abs(dh) > .4) want = 1.8;
        if (last) want = Math.min(want, .5 + d * .8);
        const rate = .35 + Math.abs(a.speed) / 2.6;
        a.h += cl(dh, -rate * dt, rate * dt); a.steer = cl(dh * 1.4, -.6, .6);
        a.speed += cl(want - a.speed, -3 * dt, 1.6 * dt);
      } else {
        a.h += cl(dh, -5 * dt, 5 * dt);
        a.speed += ((Math.abs(dh) > 1.2 ? .3 : want) - a.speed) * Math.min(1, dt * 6);
      }
      a.x += Math.sin(a.h) * a.speed * dt; a.z += Math.cos(a.h) * a.speed * dt;
      return false;
    }
    // a way to a spot; for the tractor, through a point lined up in front of it, so it arrives facing the right way
    function wayTo(a, to, face, lineUp) {
      const goal = lineUp && face != null ? {x: to.x - Math.sin(face) * lineUp, z: to.z - Math.cos(face) * lineUp} : to;
      const w = G.path({x: a.x, z: a.z}, goal) || [goal];
      if (goal !== to) w.push({x: to.x, z: to.z});
      return w;
    }

    // ---------- the steps a job is made of ----------
    // each has start() and run(dt), which says true once it is done
    const step = {
      say: text => ({run() { G.say(text); return true; }}),
      call: fn => ({run() { fn(); return true; }}),
      // walk to a spot (a function, so it can follow an animal that moves), then face a way if given
      walk: (to, o) => ({
        start() { o = o || {}; this.t = 0; this.way = wayTo(C, to()); C.pose = o.pose || 'stand'; },
        run(dt) {
          this.t += dt;
          if (o.follow && this.t > 2.5) { this.t = 0; this.way = wayTo(C, to()); }
          const done = along(C, this.way, dt, {near: o.near || .35, pass: .6, top: WALK});
          if (done) { C.speed = 0; if (!o.keepPose) C.pose = 'stand'; }
          return done;
        },
      }),
      face: (to, h) => ({run(dt) { const p = to && to(), want = h != null ? h : Math.atan2(p.x - C.x, p.z - C.z), dh = wrap(want - C.h); C.h += cl(dh, -4 * dt, 4 * dt); return Math.abs(dh) < .08; }}),
      act: (pose, secs, fn) => ({start() { this.t = 0; C.pose = pose; }, run(dt) { this.t += dt; if (this.t < secs) return false; C.pose = 'stand'; if (fn) fn(); return true; }}),
      wait: (cond, most) => ({start() { this.t = 0; }, run(dt) { this.t += dt; return cond() || this.t > most; }}),
      climbOn: () => ({start() { this.t = 0; C.pose = 'climb'; }, run(dt) { this.t += dt; if (this.t < .9) return false; G.climbOn(); C.onTractor = true; C.pose = 'sit'; TR.running = true; return true; }}),
      climbOff: () => ({start() { this.t = 0; TR.running = false; }, run(dt) { this.t += dt; if (this.t < .7) return false; G.climbOff(); C.onTractor = false; C.pose = 'stand'; return true; }}),
      drive: (to, face, o) => ({
        start() { o = o || {}; this.way = wayTo(TR, to(), face, o.lineUp == null ? 4 : o.lineUp); },
        run(dt) { return along(TR, this.way, dt, {near: o.near || .5, pass: 1.7, top: DRIVE, car: true}); },
      }),
      // creep straight on (or back, with a minus) a few metres
      creep: m => ({
        start() { this.left = Math.abs(m); },
        run(dt) { const v = Math.sign(m) * .9; TR.speed = v; TR.steer = 0; TR.x += Math.sin(TR.h) * v * dt; TR.z += Math.cos(TR.h) * v * dt; this.left -= Math.abs(v) * dt; if (this.left > 0) return false; TR.speed = 0; return true; },
      }),
      loader: (h, secs) => ({start() { this.t = 0; TR.loader = h; }, run(dt) { this.t += dt; return this.t > (secs == null ? 1.1 : secs); }}),
    };
    // getting to the tractor and onto it, or off it, as a job needs
    const onTractor = () => (C.onTractor ? [] : [step.say('Getting the tractor.'), step.walk(() => S.tractorSide()), step.face(() => ({x: TR.x, z: TR.z})), step.climbOn()]);
    const onFoot = () => (C.onTractor ? [step.climbOff()] : []);

    // ---------- the jobs ----------
    const JOBS = {
      hay: {
        label: 'Bring a bale to the hay ring', doing: 'bringing a bale to the hay ring',
        busy: () => (G.act.hayOut() ? 'There is still hay in the ring.' : null),
        plan: () => {
          const ringAt = () => { const dx = TR.x - S.ring.x, dz = TR.z - S.ring.z, d = Math.hypot(dx, dz) || 1; return {x: S.ring.x + dx / d * 3.6, z: S.ring.z + dz / d * 3.6, h: Math.atan2(-dx, -dz)}; };
          let drop = null;
          return [...onTractor(), step.say('Off to the hay barn for a bale.'), step.loader(.15, .2),
            step.drive(() => S.bale, S.baleH), step.creep(1.2), step.call(() => { TR.bale = true; }), step.loader(.42), step.creep(-2.5),
            step.say('Taking it to the hay ring.'),
            step.call(() => { drop = ringAt(); }), step.drive(() => drop, null, {lineUp: 0}), step.drive(() => ringAt(), null, {lineUp: 0}),
            {run(dt) { const want = Math.atan2(S.ring.x - TR.x, S.ring.z - TR.z), dh = wrap(want - TR.h); if (Math.abs(dh) < .12) { TR.speed = 0; return true; } TR.h += cl(dh, -.6 * dt, .6 * dt); TR.speed = .5; TR.steer = cl(dh, -.6, .6); TR.x += Math.sin(TR.h) * .5 * dt; TR.z += Math.cos(TR.h) * .5 * dt; return false; }},
            step.loader(.3, .8), step.call(() => { TR.bale = false; G.act.putOutHay(); }), step.say('In it goes!'),
            step.creep(-2.5), step.loader(.3, .2),
            step.drive(() => S.park, S.parkH), ...[step.climbOff()], step.say("The hay's out.")];
        },
      },
      water: {
        label: 'Fill the water troughs', doing: 'filling the water troughs',
        busy: () => (G.act.troughsFull() ? 'The troughs are already full.' : null),
        plan: () => [...onFoot(), step.walk(() => S.tap), step.face(null, S.tapH), step.act('reach', 1.2, () => G.act.fillTroughs()), step.say('Filling the troughs.'),
          step.wait(() => G.act.troughsFull(), 40), step.act('reach', 1, () => G.act.hoseOff()), step.say('The troughs are full.')],
      },
      chickens: {
        label: 'Let the chickens out', doing: 'letting the chickens out',
        busy: () => (G.act.chickensOut() ? 'The chickens are already out.' : null),
        plan: () => [...onFoot(), step.walk(() => S.coop), step.face(null, S.coopH), step.act('reach', 1.2, () => G.act.letChickensOut()), step.say('Out you go, girls!')],
      },
      feed: {
        label: 'Feed the chickens', doing: 'feeding the chickens',
        busy: () => (G.act.fed() ? 'The chickens have been fed.' : null),
        plan: () => [...onFoot(), ...(G.act.chickensOut() ? [] : JOBS.chickens.plan()),
          step.walk(() => S.feed), step.face(null, S.feedH), step.act('reach', 1, null), step.say('Got the feed.'),
          step.walk(() => S.feedOut, {pose: 'scatter'}), step.act('scatter', 2.6, () => G.act.feedChickens()), step.say('Chick, chick, chick!')],
      },
      look: {
        label: 'Look the herd over', doing: 'looking the herd over',
        busy: () => (G.act.unseen().length ? null : 'He has looked them all over today.'),
        plan: () => {
          // the nearest animal not yet looked over, then the next nearest from there, until all are seen
          const next = () => { const u = G.act.unseen(); u.sort((a, b) => Math.hypot(a.x - C.x, a.zz - C.z) - Math.hypot(b.x - C.x, b.zz - C.z)); return u[0]; };
          const one = () => {
            const cow = next(); if (!cow) return [step.say('The herd all looks good.')];
            return [step.walk(() => G.act.lookFrom(cow), {follow: true, near: .6}), step.face(() => ({x: cow.x, z: cow.zz})),
              step.act('look', 2.2, () => G.act.see(cow)), step.say(cow.name + ' looks well.'), {start() { const more = one(); queueSteps(more); }, run: () => true}];
          };
          return [...onFoot(), ...one()];
        },
      },
      salt: {
        label: 'Set out salt', doing: 'setting out salt',
        busy: () => (G.act.saltOut() ? 'The salt is already out.' : null),
        plan: () => [...onFoot(), step.walk(() => S.feed), step.face(null, S.feedH), step.act('reach', 1, null), step.say('A block of salt.'),
          step.walk(() => S.salt, {pose: 'carry', keepPose: true}), step.act('carry', .5, null), step.act('reach', .8, () => G.act.setSalt()), step.say('The salt is out.')],
      },
      fence: {
        label: 'Walk the fence line', doing: 'walking the fence line',
        plan: () => {
          const pts = S.fence.slice(); if (Math.hypot(pts[pts.length - 1].x - C.x, pts[pts.length - 1].z - C.z) < Math.hypot(pts[0].x - C.x, pts[0].z - C.z)) pts.reverse();
          return [...onFoot(), step.say('Walking the fence line.'), ...pts.map(p => step.walk(() => p, {near: 1.2})), step.act('look', 1.5, null), step.say('The fence looks sound. Fixing it comes later.')];
        },
      },
      come: {
        label: 'Come to where I am looking', doing: 'coming over',
        plan: () => [...onFoot(), step.walk(() => G.spots.here()), step.act('wave', 1.6, null), step.say('Here I am.')],
      },
      park: {
        label: 'Park the tractor', doing: 'parking the tractor',
        busy: () => (!C.onTractor && Math.hypot(TR.x - S.park.x, TR.z - S.park.z) < 1.5 ? 'The tractor is parked.' : null),
        plan: () => [...onTractor(), step.drive(() => S.park, S.parkH), step.climbOff(), step.say('Tractor is parked.')],
      },
      house: {
        label: 'Go to the house', doing: 'going to the house',
        plan: () => [...onFoot(), step.walk(() => S.porch), step.face(null, S.porchH), step.act('wave', 1.4, null), step.say("I'll be at the house.")],
      },
    };

    // ---------- the list of jobs, and working through it ----------
    const queue = [];
    let job = null, steps = [], cur = null;
    function queueSteps(more) { steps.unshift(...more); }
    function give(id) {
      const J = JOBS[id]; if (!J) return 'There is no such job.';
      if ((job && job.id === id) || queue.includes(id)) return 'He is already on it.';
      queue.push(id); return null;
    }
    function stop() { queue.length = 0; job = null; steps = []; cur = null; C.speed = 0; TR.speed = 0; if (!C.onTractor) C.pose = 'stand'; G.say('Stopping.'); }
    function tick(dt) {
      if (!cur) {
        if (!steps.length) {
          job = null;
          while (queue.length && !job) {
            const id = queue.shift(), J = JOBS[id], busy = J.busy && J.busy();
            if (busy) { G.say(busy); continue; }
            job = {id, label: J.label, doing: J.doing}; steps = J.plan();
          }
          if (!job) { C.speed = 0; if (!C.onTractor && C.pose !== 'stand' && C.pose !== 'wave') C.pose = 'stand'; return; }
        }
        cur = steps.shift(); if (cur.start) cur.start();
      }
      if (cur.run(dt)) cur = null;
    }
    return {
      JOBS, give, stop, tick,
      get job() { return job; }, get queue() { return queue.slice(); },
      busyWith: id => (job && job.id === id) || queue.includes(id),
      get idle() { return !job && !queue.length; },
    };
  }
  root.makeOrders = makeOrders;
})(typeof window !== 'undefined' ? window : globalThis);
