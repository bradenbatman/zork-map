const test = require('node:test');
const assert = require('node:assert/strict');
const {loadMap} = require('../scripts/load-map.cjs');

function withMap(fn, options) {
  const app = loadMap(options);
  try {assert.deepEqual(app.errors, [], 'standalone page initializes without script errors'); fn(app);}
  finally {app.close();}
}
test('recorded expedition initializes with real 2D drawing and no external assets', () => withMap(({document:d, getCanvas}) => {
  assert.match(d.querySelector('#figures').textContent, /350 \/ 350/);
  assert.match(d.querySelector('#figures').textContent, /624/);
  assert.equal(d.querySelector('#detail h3').textContent, 'Living Room');
  assert.equal(d.querySelectorAll('script[src],link[rel="stylesheet"]').length, 0);
  assert.equal(JSON.parse(d.querySelector('#state').textContent).resume, undefined);
  const canvas = getCanvas(d.querySelector('.wl-base'));
  assert.ok(canvas.width > 500 && canvas.height > 500);
  assert.ok(canvas.toBuffer('image/png').length > 10000);
}));
test('view switching, selection, panels and WebGL fallback work repeatedly', () => withMap(({document:d, errors}) => {
  for (let i=0; i<2; i++) {
    for (const [mode, target] of [['chart','#map'], ['ascii','#asciiWrap'], ['world','#worldWrap']]) {
      d.querySelector('#m-'+mode).click();
      assert.equal(d.querySelector('#m-'+mode).getAttribute('aria-pressed'), 'true');
      assert.equal(d.querySelector(target).hasAttribute('hidden'), false);
    }
    d.querySelector('#m-chart').click();
    const room = d.querySelector('.node'); room.dispatchEvent(new d.defaultView.MouseEvent('click',{bubbles:true}));
    assert.ok(d.querySelector('#detail h3').textContent);
    d.querySelector('#hereLink').click();
    assert.equal(d.querySelector('#detail h3').textContent, 'Living Room');
    for (const tab of ['items','puz','sk','log']) {
      d.querySelector('#t-'+tab).click();
      assert.equal(d.querySelector('#p-'+tab).hidden, false);
    }
  }
  d.querySelector('#m-3d').click();
  assert.match(d.querySelector('#threeWrap').textContent, /needs WebGL/);
  d.querySelector('#m-world').click();
  assert.equal(d.querySelector('#worldWrap').hidden, false);
  assert.equal(errors.filter(e => !String(e).includes('WebGL')).length, 0);
}));
test('replay, stop, scrubbing, zoom and persisted mode remain usable', () => withMap(({document:d,window:w}) => {
  const scrub=d.querySelector('#scrub');
  d.querySelector('#play').click();
  assert.equal(scrub.value,'1');assert.equal(d.querySelector('#play').textContent,'Stop');
  d.querySelector('#play').click();assert.equal(d.querySelector('#play').textContent,'Replay');
  scrub.value=scrub.max;scrub.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelector('#scrublabel').textContent,'Showing everything found');
  for(const id of ['zin','zout','zfit','zme']) d.querySelector('#'+id).click();
  d.querySelector('#m-ascii').click();w.dispatchEvent(new w.Event('pagehide'));
  assert.equal(JSON.parse(w.sessionStorage.getItem('zork-view')).mode,'ascii');
  assert.equal(d.querySelector('#live').checked,false);
}));
test('narrow viewport state and reduced-motion mode initialize', () => withMap(({document:d}) => {
  assert.equal(d.querySelector('#m-chart').getAttribute('aria-pressed'),'true');
  assert.ok(d.querySelectorAll('.node').length > 80);
}, {width:390, reducedMotion:true, savedView:{mode:'chart',sel:'kitchen'}}));
