/* ============================================================
   OS MODULE 3 SIMULATOR - Complete JavaScript Logic
   Modules: IPC, Race, Critical Section, Peterson's,
            Semaphores, Producer-Consumer, Deadlocks
   ============================================================ */

// ===== GLOBAL STATE =====
let simRunning = false;
let simTimer = null;
let simStep = 0;
let simSpeed = 800;
let currentTab = 'ipc';

// ===== UTILITIES =====
function log(msg, type = 'info') {
  const area = document.getElementById('logArea');
  const div = document.createElement('div');
  div.className = 'log-' + type;
  const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  div.textContent = `[${ts}] ${msg}`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
function clearLog() {
  document.getElementById('logArea').innerHTML = '';
  log('Log cleared.', 'info');
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getSpeed() { return parseInt(document.getElementById('globalSpeed').value) || 800; }

function stopSim() {
  simRunning = false;
  if (simTimer) { clearTimeout(simTimer); simTimer = null; }
  log('Simulation stopped.', 'warn');
}

// ===== TOOLTIP =====
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-tip]');
  if (el) {
    const tip = document.getElementById('tooltip');
    tip.textContent = el.getAttribute('data-tip');
    tip.style.display = 'block';
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY + 12) + 'px';
  }
});
document.addEventListener('mousemove', e => {
  const tip = document.getElementById('tooltip');
  if (tip.style.display === 'block') {
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY + 12) + 'px';
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('[data-tip]')) {
    document.getElementById('tooltip').style.display = 'none';
  }
});

// ===== SPEED CONTROL =====
document.getElementById('globalSpeed').addEventListener('input', function () {
  simSpeed = parseInt(this.value);
  document.getElementById('speedLabel').textContent = simSpeed + 'ms';
});

// ===== TAB SYSTEM =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    stopSim();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderTab(currentTab);
  });
});

const topicExplanations = {
  ipc: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:8px;"><strong>Inter-Process Communication (IPC)</strong> allows isolated processes to communicate and synchronize their actions safely. Without IPC, memory is strictly isolated.</p>
    <ul style="padding-left:16px;margin-bottom:12px;">
      <li style="margin-bottom:4px;"><strong>Shared Memory:</strong> Processes agree to share a specific region of RAM. It's very fast, but requires explicit synchronization (like semaphores) to avoid race conditions.</li>
      <li><strong>Message Passing:</strong> Processes use the OS kernel to exchange messages via queues. It's safer and avoids direct data corruption, but involves OS overhead (system calls).</li>
    </ul>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>1. Choose a mode: Shared Memory or Message Passing.<br>
    2. Click <strong>Send / Write</strong>. Notice how Shared Memory writes directly to the shared box, while Message Passing places the message in a Kernel Buffer Queue.<br>
    3. Click <strong>Read</strong>. See how P2 either accesses the shared box directly or dequeues a message via an OS system call.</p>
  `,
  race: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;">A <strong>Race Condition</strong> occurs when multiple processes access and manipulate shared data concurrently. The final outcome critically depends on the exact interleaving of their CPU instructions. If they read and write without synchronization, intermediate updates can be overwritten, leading to severe data corruption.</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>We are simulating two processes (P1 and P2) trying to run <code>counter++</code>. In reality, <code>counter++</code> takes 3 assembly instructions: <code>LOAD</code>, <code>ADD</code>, and <code>STORE</code>.<br><br>
    <strong>Show Race Condition:</strong> Watch the steps closely. You will see P2 <code>LOAD</code> the counter <em>before</em> P1 has a chance to <code>STORE</code> its incremented value. Because they both start with the same old value, P2 will eventually overwrite P1's work, and an increment is permanently lost!<br><br>
    <strong>Show Safe (No Race):</strong> Here, processes run sequentially. P1 completes all 3 instructions before P2 starts, ensuring the final counter is perfectly correct.</p>
  `,
  critical: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;">The <strong>Critical Section Problem</strong> addresses how to prevent race conditions. A "Critical Section" (CS) is a segment of code where shared resources are accessed. A valid solution MUST guarantee three things:<br>
    1. <strong>Mutual Exclusion:</strong> Absolutely only one process inside the CS at any time.<br>
    2. <strong>Progress:</strong> If the CS is empty, processes waiting to enter must be allowed to participate in deciding who goes next.<br>
    3. <strong>Bounded Waiting:</strong> A waiting process must eventually get a turn (no starvation).</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>Click <strong>Initialize</strong> and then repeatedly click <strong>Next Step</strong>.<br>
    Notice how processes randomly decide to enter the Entry Section (waiting queue). When the Critical Section is [ EMPTY ], the system strictly allows only ONE process to enter.<br>
    While a process is active in the CS (marked red), all other processes requesting access are forced to queue in the Waiting list. When the active process exits, the next in queue is granted access.</p>
  `,
  peterson: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;"><strong>Peterson's Solution</strong> is a brilliant classic software algorithm that solves the critical section problem for exactly two processes without needing special hardware.<br>
    It relies on two shared variables:<br>
    • <code>flag[i]</code>: Indicates if Process <code>i</code> wants to enter.<br>
    • <code>turn</code>: Resolves conflicts by indicating whose turn it actually is if both want to enter simultaneously.</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>Try making <strong>P0</strong> and <strong>P1</strong> want the CS at the same time.<br>
    1. P0 sets <code>flag[0] = true</code> but gracefully yields priority by setting <code>turn = 1</code>.<br>
    2. If P1 also wants to enter, it sets <code>flag[1] = true</code> and yields priority back (<code>turn = 0</code>).<br>
    3. Look at the <code>while</code> loop: A process will busy-wait (spin) ONLY if the other process wants to enter AND it's the other process's turn. Because <code>turn</code> can only hold one value at a time, Mutual Exclusion is perfectly guaranteed!</p>
  `,
  semaphore: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;"><strong>Semaphores</strong> are integer variables used as powerful synchronization tools. They are accessed exclusively through two atomic (indivisible) OS operations:<br>
    • <code>wait()</code> / <code>P()</code>: Decrements the semaphore. If it becomes negative, the process blocks/sleeps.<br>
    • <code>signal()</code> / <code>V()</code>: Increments the semaphore. If processes are waiting, it wakes one up.<br>
    They can be Binary (Mutexes) for locking a single resource, or Counting for managing a pool of identical resources.</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>1. Initialize with 2 resources.<br>
    2. Click <strong>wait()</strong>. A process grabs a resource, and the semaphore drops to 1.<br>
    3. Click it again. The semaphore drops to 0. All resources are taken.<br>
    4. Click it a third time. The semaphore drops below 0 (-1), and the process is forced into the Waiting Queue (blocked).<br>
    5. Click <strong>signal()</strong>. A resource is released, and the OS automatically wakes up the blocked process from the queue!</p>
  `,
  prodcons: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;">The <strong>Producer-Consumer Problem</strong> involves processes sharing a bounded buffer (like a fixed-size array).<br>
    • Producers generate items and put them in.<br>
    • Consumers take items out.<br>
    We must use Semaphores to ensure:<br>
    1. Producers block if the buffer is FULL.<br>
    2. Consumers block if the buffer is EMPTY.<br>
    3. The buffer itself is protected by a Mutex to prevent race conditions during insertion/removal.</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>Click <strong>Produce</strong> rapidly. You will see items fill the buffer slots. Watch the <code>empty</code> semaphore decrease and the <code>full</code> semaphore increase.<br>
    If you fill all 5 slots and try to Produce again, the Producer will block (wait) because <code>empty = 0</code>.<br>
    Now click <strong>Consume</strong>. An item is removed, <code>full</code> decreases, and the blocked Producer is immediately woken up to insert its pending item!</p>
  `,
  deadlock: `
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">The Concept</h4>
    <p style="margin-bottom:12px;">A <strong>Deadlock</strong> is a catastrophic system state where a group of processes are permanently frozen because each is holding a resource and waiting for another resource held by someone else in the group. For deadlock to occur, 4 conditions MUST hold simultaneously:<br>
    1. Mutual Exclusion<br>2. Hold and Wait<br>3. No Preemption<br>4. Circular Wait.</p>
    <h4 style="color:#000080;margin-bottom:4px;border-bottom:1px solid #ccc;padding-bottom:2px;">In This Simulation</h4>
    <p>In the <strong>Resource Allocation Graph</strong> tab:<br>
    Click <strong>Step: P1 requests R2</strong>, etc. You will build a cycle where P1 holds R1 but waits for R2, and P2 holds R2 but waits for R1. When the cycle completes, the system detects a Deadlock (nodes turn red)!<br>
    In the <strong>Banker's Algorithm</strong> tab:<br>
    This shows deadlock <em>avoidance</em>. The OS checks if granting a request leaves the system in a "Safe State" (where there is a known sequence to finish all processes). If unsafe, the request is denied to prevent deadlock.</p>
  `
};

function renderTab(tab) {
  simStep = 0;
  const tabs = { ipc: renderIPC, race: renderRace, critical: renderCritical,
    peterson: renderPeterson, semaphore: renderSemaphore,
    prodcons: renderProdCons, deadlock: renderDeadlock };
  if (tabs[tab]) tabs[tab]();
  
  const expText = document.getElementById('topicExplanationText');
  if (expText) expText.innerHTML = topicExplanations[tab] || '';
}

// ============================================================
// 1. IPC MODULE
// ============================================================
function renderIPC() {
  document.getElementById('vizTitle').textContent = '▶ IPC — Shared Memory & Message Passing';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">IPC Mode</div>
      <div class="ctrl-row">
        <select id="ipcMode" style="width:140px;">
          <option value="shared">Shared Memory</option>
          <option value="message">Message Passing</option>
        </select>
      </div>
      <div class="ctrl-row">
        <label>Message:</label>
        <input type="text" id="ipcMsg" value="Hello!" style="width:100px;">
      </div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-green" onclick="ipcSend()">▶ Send / Write</button><br>
      <button class="btn btn-blue" onclick="ipcRead()">📖 Read</button><br>
      <button class="btn btn-red" onclick="ipcReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Concepts</div>
      <div style="font-size:10px;color:#333;line-height:1.5;">
        <b>Shared Memory:</b> Processes share a region of RAM. Fast but needs synchronization.<br><br>
        <b>Message Passing:</b> Processes exchange messages via OS. Safer, portable.
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div class="step-counter" id="ipcStepDisp">Step: 0</div>
    <div style="padding:10px;">
      <div class="viz-row" id="ipcVizRow">
        <div class="process-box" id="ipcP1" data-tip="Process 1: The sender/writer process">
          P1<div class="process-label">SENDER</div>
        </div>
        <div class="viz-col" style="gap:4px;">
          <div class="arrow arrow-right" id="ipcArrow1"></div>
          <div id="ipcChan" style="text-align:center;">
            <div class="section-hdr" style="width:140px;text-align:center;">Shared Memory</div>
            <div class="mem-box" id="ipcMem" data-tip="Shared memory region accessible by both processes" style="width:140px;min-height:40px;display:flex;align-items:center;justify-content:center;">[empty]</div>
          </div>
          <div class="arrow arrow-right" id="ipcArrow2"></div>
        </div>
        <div class="process-box" id="ipcP2" data-tip="Process 2: The receiver/reader process">
          P2<div class="process-label">RECEIVER</div>
        </div>
      </div>

      <div id="ipcMsgQueue" style="margin-top:16px;display:none;">
        <div class="section-hdr">Message Queue (Kernel Buffer)</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;" id="ipcQueueViz"></div>
      </div>

      <div style="margin-top:14px;">
        <div class="section-hdr">IPC Steps Explanation</div>
        <div class="highlight-box" id="ipcExplain">
          Select mode and click "Send / Write" to begin.
        </div>
      </div>
    </div>`;

  log('IPC module loaded. Choose Shared Memory or Message Passing.', 'info');
}

let ipcMessages = [];
async function ipcSend() {
  const mode = document.getElementById('ipcMode').value;
  const msg = document.getElementById('ipcMsg').value || 'DATA';
  simStep++;
  document.getElementById('ipcStepDisp').textContent = `Step: ${simStep}`;

  const p1 = document.getElementById('ipcP1');
  const p2 = document.getElementById('ipcP2');
  const mem = document.getElementById('ipcMem');
  const explain = document.getElementById('ipcExplain');
  const a1 = document.getElementById('ipcArrow1');
  const a2 = document.getElementById('ipcArrow2');

  p1.classList.add('active');
  log(`P1 preparing to send: "${msg}"`, 'step');

  if (mode === 'shared') {
    document.getElementById('ipcMsgQueue').style.display = 'none';
    document.getElementById('ipcChan').querySelector('.section-hdr').textContent = 'Shared Memory';
    await sleep(getSpeed() / 2);
    a1.textContent = '→';
    log('P1 writing to shared memory region...', 'step');
    explain.textContent = 'Step 1: P1 acquires write access and writes data to the shared memory block.';
    await sleep(getSpeed() / 2);
    mem.textContent = `"${msg}"`;
    mem.classList.add('highlight');
    log(`Shared memory updated: "${msg}"`, 'success');
    explain.textContent = 'Step 2: Data now lives in shared memory. Both P1 and P2 can access it directly via the same address.';
    await sleep(getSpeed() / 2);
    p1.classList.remove('active');
    a1.textContent = '';
  } else {
    document.getElementById('ipcMsgQueue').style.display = 'block';
    document.getElementById('ipcChan').querySelector('.section-hdr').textContent = 'Kernel Buffer';
    await sleep(getSpeed() / 2);
    log('P1 calls send() system call...', 'step');
    explain.textContent = 'Step 1: P1 calls send(msg). The OS kernel receives the message and places it in a kernel buffer (message queue).';
    ipcMessages.push(msg);
    const qv = document.getElementById('ipcQueueViz');
    const item = document.createElement('div');
    item.className = 'queue-item anim-in-r';
    item.textContent = `"${msg}"`;
    qv.appendChild(item);
    mem.textContent = `[${ipcMessages.length} msg(s)]`;
    log(`Message enqueued in kernel buffer: "${msg}"`, 'success');
    explain.textContent = `Step 2: Message queued in kernel buffer. ${ipcMessages.length} message(s) pending for P2.`;
    p1.classList.remove('active');
    a1.textContent = '';
  }
}

async function ipcRead() {
  const mode = document.getElementById('ipcMode').value;
  const mem = document.getElementById('ipcMem');
  const p2 = document.getElementById('ipcP2');
  const explain = document.getElementById('ipcExplain');
  const a2 = document.getElementById('ipcArrow2');
  simStep++;
  document.getElementById('ipcStepDisp').textContent = `Step: ${simStep}`;

  p2.classList.add('active');
  if (mode === 'shared') {
    a2.textContent = '→';
    const val = mem.textContent;
    if (val === '[empty]') { log('P2 reads shared memory: [empty] — nothing to read.', 'warn'); }
    else { log(`P2 reads from shared memory: ${val}`, 'success'); explain.textContent = `Step 3: P2 directly reads the value from shared memory: ${val}. No OS involvement needed!`; }
    await sleep(getSpeed() / 2);
    mem.classList.remove('highlight');
    p2.classList.remove('active'); a2.textContent = '';
  } else {
    if (ipcMessages.length === 0) { log('P2 calls receive(): queue empty — P2 blocks!', 'warn'); p2.classList.add('blocked'); await sleep(getSpeed()); p2.classList.remove('blocked'); p2.classList.remove('active'); return; }
    log('P2 calls receive() system call...', 'step');
    explain.textContent = 'Step 3: P2 calls receive(). OS dequeues the first message from the kernel buffer and delivers it to P2.';
    const msg = ipcMessages.shift();
    const qv = document.getElementById('ipcQueueViz');
    if (qv.firstChild) qv.removeChild(qv.firstChild);
    const memCount = ipcMessages.length;
    document.getElementById('ipcMem').textContent = memCount ? `[${memCount} msg(s)]` : '[empty]';
    log(`P2 received message: "${msg}"`, 'success');
    explain.textContent = `Step 4: P2 received "${msg}" via message passing. Remaining in queue: ${ipcMessages.length}.`;
    p2.classList.add('done'); await sleep(getSpeed() / 2); p2.classList.remove('done'); p2.classList.remove('active');
  }
}

function ipcReset() {
  ipcMessages = [];
  document.getElementById('ipcMem').textContent = '[empty]';
  document.getElementById('ipcMem').classList.remove('highlight');
  document.getElementById('ipcQueueViz').innerHTML = '';
  document.getElementById('ipcMsgQueue').style.display = 'none';
  simStep = 0;
  document.getElementById('ipcStepDisp').textContent = 'Step: 0';
  document.getElementById('ipcExplain').textContent = 'Reset. Select mode and click Send / Write.';
  ['ipcP1','ipcP2'].forEach(id => { const el=document.getElementById(id); el.className='process-box'; });
  log('IPC simulation reset.', 'warn');
}

// ============================================================
// 2. RACE CONDITION MODULE
// ============================================================
let raceRunning = false;
function renderRace() {
  document.getElementById('vizTitle').textContent = '▶ Race Condition Simulator';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Configuration</div>
      <div class="ctrl-row"><label>Init Counter:</label><input type="number" id="raceInit" value="0" min="0" max="100" style="width:50px;"></div>
      <div class="ctrl-row"><label>Increments:</label><input type="number" id="raceInc" value="3" min="1" max="10" style="width:50px;"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-red" onclick="startRace()">▶ Simulate Race Condition</button><br>
      <button class="btn btn-green" onclick="startRaceSafe()">🔒 Simulate Safe Execution</button><br>
      <button class="btn btn-blue" onclick="resetRace()">↺ Reset</button>
    </div>
    <div class="ctrl-group" style="background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.2);">
      <div class="ctrl-label" style="color: var(--amber);">💡 Concept Breakdown</div>
      <div style="font-size:11px;line-height:1.6;color:var(--text2);font-family:var(--sans);">
        A <b>race condition</b> happens when two or more threads/processes read and write to the same shared data simultaneously.<br><br>
        A seemingly simple <code>counter++</code> operation actually requires <b>3 separate CPU steps</b>:<br>
        <ol style="margin-left: 16px; margin-top: 4px; color: var(--cyan); font-family: var(--mono); font-size: 10px;">
          <li>LOAD shared counter into local register</li>
          <li>ADD 1 to the local register</li>
          <li>STORE local register back to shared counter</li>
        </ol>
        <br>If these steps interleave between processes, updates get lost!
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div style="padding:16px;">
      <div class="viz-row" style="justify-content:center;gap:32px;align-items:flex-start;">
        <!-- P1 Panel -->
        <div style="flex: 1; max-width: 240px;">
          <div class="code-pane-title" style="background: rgba(0,212,255,0.1); color: var(--cyan); border: 1px solid var(--cyan); border-bottom: none; border-radius: 8px 8px 0 0; font-size: 12px; padding: 10px;">Process 1 (P1)</div>
          <div class="code-display" id="raceCode1" style="border-color: var(--cyan); border-radius: 0 0 8px 8px;">
            <div class="code-line" id="rc1_0">  reg1 = counter    <span style="color:var(--text3);">// LOAD</span></div>
            <div class="code-line" id="rc1_1">  reg1 = reg1 + 1   <span style="color:var(--text3);">// ADD</span></div>
            <div class="code-line" id="rc1_2">  counter = reg1    <span style="color:var(--text3);">// STORE</span></div>
          </div>
          <div style="margin-top:12px; text-align: center;">
            <div style="font-size:10px; color:var(--cyan); margin-bottom: 4px; font-family: var(--mono); text-transform: uppercase;">P1's Local Register (reg1)</div>
            <div id="raceReg1" class="mem-box" style="border-color: var(--cyan); color: var(--cyan); font-size: 18px; padding: 8px 16px;">—</div>
          </div>
        </div>

        <!-- Shared Memory Panel -->
        <div style="text-align:center; flex: 1; max-width: 200px; display: flex; flex-direction: column; align-items: center;">
          <div class="section-hdr" style="text-align:center; color: var(--amber); border-bottom-color: var(--amber);">SHARED MEMORY</div>
          <div style="margin:16px 0;">
            <div style="font-size:12px; color:var(--text2); margin-bottom:8px; font-family: var(--mono);">counter</div>
            <div class="semaphore-display" id="raceCounter" style="font-size:36px; min-width:100px; padding: 16px; background: rgba(251,191,36,0.1); border-color: var(--amber); color: var(--amber); box-shadow: 0 0 15px rgba(251,191,36,0.2); transition: all 0.3s;">0</div>
          </div>
          
          <div style="background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 12px; width: 100%;">
            <div style="font-size:11px; color: var(--text2); margin-bottom: 4px;">Expected Result: <span id="raceExpected" style="font-weight:bold;color:var(--green); font-size: 14px;">0</span></div>
            <div style="font-size:11px; color: var(--text2);">Actual Result: <span id="raceGot" style="font-weight:bold;color:var(--red); font-size: 14px;">—</span></div>
          </div>
          <div id="raceConflictBadge" style="margin-top:12px;"></div>
        </div>

        <!-- P2 Panel -->
        <div style="flex: 1; max-width: 240px;">
          <div class="code-pane-title" style="background: rgba(168,85,247,0.1); color: var(--purple); border: 1px solid var(--purple); border-bottom: none; border-radius: 8px 8px 0 0; font-size: 12px; padding: 10px;">Process 2 (P2)</div>
          <div class="code-display" id="raceCode2" style="border-color: var(--purple); border-radius: 0 0 8px 8px;">
            <div class="code-line" id="rc2_0">  reg2 = counter    <span style="color:var(--text3);">// LOAD</span></div>
            <div class="code-line" id="rc2_1">  reg2 = reg2 + 1   <span style="color:var(--text3);">// ADD</span></div>
            <div class="code-line" id="rc2_2">  counter = reg2    <span style="color:var(--text3);">// STORE</span></div>
          </div>
          <div style="margin-top:12px; text-align: center;">
            <div style="font-size:10px; color:var(--purple); margin-bottom: 4px; font-family: var(--mono); text-transform: uppercase;">P2's Local Register (reg2)</div>
            <div id="raceReg2" class="mem-box" style="border-color: var(--purple); color: var(--purple); font-size: 18px; padding: 8px 16px;">—</div>
          </div>
        </div>
      </div>
      <div style="margin-top:24px;" class="highlight-box" id="raceExplain">Click "Simulate Race Condition" to visualize how unsynchronized concurrent access corrupts shared data. Watch carefully as P1 and P2 read the same old value before either can save their new value!</div>
    </div>`;
  log('Race Condition module loaded.', 'info');
}

function hlRaceCode(proc, line, type = 'hl') {
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById(`rc${proc}_${i}`);
    if (el) el.className = 'code-line' + (i === line ? ' ' + type : '');
  }
}
function clearRaceHL() { for (let p=1;p<=2;p++) for(let i=0;i<3;i++) { const el=document.getElementById(`rc${p}_${i}`); if(el) el.className='code-line'; } }

async function startRace() {
  if (raceRunning) return;
  raceRunning = true;
  const initVal = parseInt(document.getElementById('raceInit').value) || 0;
  const increments = parseInt(document.getElementById('raceInc').value) || 3;
  let counter = initVal;
  
  const counterEl = document.getElementById('raceCounter');
  counterEl.textContent = counter;
  counterEl.style.background = 'rgba(251,191,36,0.1)';
  counterEl.style.borderColor = 'var(--amber)';
  counterEl.style.color = 'var(--amber)';
  
  document.getElementById('raceExpected').textContent = initVal + increments * 2;
  document.getElementById('raceGot').textContent = '—';
  document.getElementById('raceConflictBadge').innerHTML = '';
  clearRaceHL();
  log(`=== RACE CONDITION: counter starts at ${initVal}, each process increments ${increments} times ===`, 'warn');
  log(`Expected result: ${initVal + increments * 2}`, 'info');
  const spd = getSpeed();

  for (let i = 0; i < increments; i++) {
    let reg1, reg2;
    const explain = document.getElementById('raceExplain');

    // P1 LOAD
    hlRaceCode(1, 0, 'hl');
    reg1 = counter;
    document.getElementById('raceReg1').textContent = reg1;
    explain.innerHTML = `<span style="color:var(--cyan);font-weight:bold;">Iteration ${i+1} - P1 Step 1:</span> P1 reads the shared counter (${counter}) into its local reg1.`;
    log(`P1 LOAD: reg1 ← counter = ${counter}`, 'step');
    await sleep(spd);

    // P2 LOAD (race condition: P2 reads BEFORE P1 can store!)
    hlRaceCode(2, 0, 'hl-red');
    reg2 = counter; 
    document.getElementById('raceReg2').textContent = reg2;
    explain.innerHTML = `<span style="color:var(--red);font-weight:bold;">⚠ RACE CONDITION!</span> Before P1 can finish and save its new value, P2 ALSO reads the counter (${counter})! Now both processes have the exact same starting value!`;
    log(`P2 LOAD: reg2 ← counter = ${counter}  ← SAME AS P1! Race condition started!`, 'error');
    await sleep(spd * 1.5);

    // P1 ADD
    hlRaceCode(1, 1, 'hl');
    reg1 = reg1 + 1;
    document.getElementById('raceReg1').textContent = reg1;
    explain.innerHTML = `P1 calculates the new value (${reg1}) locally.`;
    log(`P1 ADD: reg1 = ${reg1}`, 'step');
    await sleep(spd * 0.8);

    // P2 ADD
    hlRaceCode(2, 1, 'hl');
    reg2 = reg2 + 1;
    document.getElementById('raceReg2').textContent = reg2;
    explain.innerHTML = `P2 also calculates the new value (${reg2}) locally.`;
    log(`P2 ADD: reg2 = ${reg2}`, 'step');
    await sleep(spd * 0.8);

    // P1 STORE
    hlRaceCode(1, 2, 'hl-green');
    counter = reg1;
    counterEl.textContent = counter;
    explain.innerHTML = `P1 finishes its job and saves ${counter} back to the shared memory.`;
    log(`P1 STORE: counter ← ${counter}`, 'step');
    await sleep(spd);

    // P2 STORE — OVERWRITES P1
    hlRaceCode(2, 2, 'hl-red');
    counter = reg2;
    counterEl.textContent = counter;
    
    // Flash Red Error Effect
    counterEl.style.background = 'rgba(248,113,113,0.2)';
    counterEl.style.borderColor = 'var(--red)';
    counterEl.style.color = 'var(--red)';
    counterEl.style.boxShadow = '0 0 20px rgba(248,113,113,0.5)';
    
    explain.innerHTML = `<span style="color:var(--red);font-weight:bold;">💥 DATA LOST!</span> P2 saves its value (${reg2}) to shared memory. <b>It just completely overwrote P1's work!</b> P1's increment is lost forever.`;
    log(`P2 STORE: counter ← ${reg2}  ← OVERWRITES P1! P1's increment LOST!`, 'error');
    await sleep(spd * 1.5);
    
    // Revert styling
    counterEl.style.background = 'rgba(251,191,36,0.1)';
    counterEl.style.borderColor = 'var(--amber)';
    counterEl.style.color = 'var(--amber)';
    counterEl.style.boxShadow = '0 0 15px rgba(251,191,36,0.2)';
    clearRaceHL();
  }

  const expected = initVal + increments * 2;
  document.getElementById('raceGot').textContent = counter;
  document.getElementById('raceConflictBadge').innerHTML =
    counter !== expected
      ? `<div class="badge badge-red" style="font-size: 12px; padding: 6px 12px; width: 100%;">❌ RACE: Lost ${expected - counter} updates!</div>`
      : `<div class="badge badge-green" style="font-size: 12px; padding: 6px 12px; width: 100%;">✓ No race (lucky)</div>`;
  
  explain.innerHTML = `<span style="color:var(--red);font-weight:bold;">Simulation Complete.</span> Because P1 and P2 were not synchronized, they overwrote each other's work. The final counter is ${counter}, but it should have been ${expected}.`;
  log(`Final counter = ${counter}, Expected = ${expected}. Lost ${expected - counter} increments due to race condition!`, 'error');
  raceRunning = false;
}

async function startRaceSafe() {
  if (raceRunning) return;
  raceRunning = true;
  const initVal = parseInt(document.getElementById('raceInit').value) || 0;
  const increments = parseInt(document.getElementById('raceInc').value) || 3;
  let counter = initVal;
  
  const counterEl = document.getElementById('raceCounter');
  counterEl.textContent = counter;
  counterEl.style.background = 'rgba(0,255,136,0.1)';
  counterEl.style.borderColor = 'var(--green)';
  counterEl.style.color = 'var(--green)';
  counterEl.style.boxShadow = '0 0 15px rgba(0,255,136,0.2)';
  
  document.getElementById('raceExpected').textContent = initVal + increments * 2;
  document.getElementById('raceGot').textContent = '—';
  document.getElementById('raceConflictBadge').innerHTML = '';
  clearRaceHL();
  const explain = document.getElementById('raceExplain');
  explain.innerHTML = `<span style="color:var(--green);font-weight:bold;">Safe Execution:</span> Processes will now run sequentially. P1 will finish all its steps BEFORE P2 is allowed to read the shared counter.`;
  log(`=== SAFE SEQUENTIAL: No interleaving ===`, 'success');
  const spd = getSpeed();

  for (let p = 1; p <= 2; p++) {
    for (let i = 0; i < increments; i++) {
      hlRaceCode(p, 0, 'hl-green');
      const reg = counter;
      if (p===1) document.getElementById('raceReg1').textContent = reg;
      else document.getElementById('raceReg2').textContent = reg;
      explain.innerHTML = `P${p} safely loads counter (${counter}) into local register.`;
      log(`P${p} LOAD: reg ← ${counter}`, 'step');
      await sleep(spd * 0.7);
      
      hlRaceCode(p, 1, 'hl-green');
      const newReg = reg + 1;
      if (p===1) document.getElementById('raceReg1').textContent = newReg;
      else document.getElementById('raceReg2').textContent = newReg;
      explain.innerHTML = `P${p} increments its local register to ${newReg}.`;
      await sleep(spd * 0.7);
      
      hlRaceCode(p, 2, 'hl-green');
      counter = newReg;
      counterEl.textContent = counter;
      explain.innerHTML = `P${p} saves ${counter} to shared memory. No other process interrupted!`;
      log(`P${p} STORE: counter ← ${counter}`, 'success');
      await sleep(spd * 0.7);
    }
    clearRaceHL();
  }

  const expected = initVal + increments * 2;
  document.getElementById('raceGot').textContent = counter;
  document.getElementById('raceConflictBadge').innerHTML = `<div class="badge badge-green" style="font-size: 12px; padding: 6px 12px; width: 100%;">✓ SAFE: ${counter} == ${expected}</div>`;
  explain.innerHTML = `<span style="color:var(--green);font-weight:bold;">Success!</span> By preventing interleaved execution, both processes correctly added their increments. Final counter is ${counter}.`;
  log(`Safe result: ${counter}. No race condition when execution is properly ordered.`, 'success');
  raceRunning = false;
}

function resetRace() {
  raceRunning = false;
  clearRaceHL();
  const counterEl = document.getElementById('raceCounter');
  counterEl.textContent = document.getElementById('raceInit').value || '0';
  counterEl.style.background = 'rgba(251,191,36,0.1)';
  counterEl.style.borderColor = 'var(--amber)';
  counterEl.style.color = 'var(--amber)';
  counterEl.style.boxShadow = '0 0 15px rgba(251,191,36,0.2)';
  
  document.getElementById('raceGot').textContent = '—';
  document.getElementById('raceConflictBadge').innerHTML = '';
  document.getElementById('raceReg1').textContent = '—';
  document.getElementById('raceReg2').textContent = '—';
  document.getElementById('raceExplain').textContent = 'Simulation reset. Click "Simulate Race Condition" to begin.';
  log('Race condition simulator reset.', 'warn');
}
// 3. CRITICAL SECTION MODULE
// ============================================================
let csRunning = false;
let csQueue = [], csInside = null, csStep2 = 0;

function renderCritical() {
  document.getElementById('vizTitle').textContent = '▶ Critical Section Problem';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Processes</div>
      <div class="ctrl-row"><label># Processes:</label><input type="number" id="csNumP" value="3" min="2" max="5" style="width:40px;"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-green" onclick="csInit()">▶ Initialize</button><br>
      <button class="btn btn-blue" onclick="csNextStep()">⏭ Next Step</button><br>
      <button class="btn btn-red" onclick="csReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Requirements</div>
      <div style="font-size:10px;line-height:1.5;color:#333;">
        Any solution must satisfy:<br>
        <b>1. Mutual Exclusion</b> — Only 1 process in CS at a time.<br>
        <b>2. Progress</b> — If no process is in CS, one wanting to enter must be allowed.<br>
        <b>3. Bounded Waiting</b> — No process waits forever.
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div style="padding:8px;">
      <div class="step-counter" id="csStepDisp">Step: 0</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;">
        <div>
          <div class="section-hdr">Process States</div>
          <div id="csProcesses" style="display:flex;flex-direction:column;gap:6px;margin-top:6px;"></div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div class="section-hdr">Critical Section</div>
          <div id="csZone" style="border:3px solid #880000;background:#ffe8e8;min-height:80px;padding:8px;margin-top:6px;text-align:center;position:relative;">
            <div style="position:absolute;top:2px;left:4px;font-size:9px;color:#888;">CRITICAL SECTION (max 1 process)</div>
            <div id="csInnerSlot" style="margin-top:16px;font-size:18px;font-weight:bold;color:#444;">[ EMPTY ]</div>
          </div>
          <div class="section-hdr" style="margin-top:8px;">Waiting Queue</div>
          <div id="csWaitQueue" class="queue-display" style="min-height:30px;border:1px solid #808080;padding:4px;background:#f0f0f0;margin-top:4px;">[none waiting]</div>
        </div>
      </div>
      <div style="margin-top:8px;" class="highlight-box" id="csExplain">Click Initialize to set up processes, then use Next Step.</div>
    </div>`;
  log('Critical Section module loaded. Click Initialize.', 'info');
}

function csInit() {
  const n = parseInt(document.getElementById('csNumP').value) || 3;
  csQueue = [];
  csInside = null;
  csStep2 = 0;
  // Create processes: state = remainder | entry | critical | exit
  window.csProcs = Array.from({length: n}, (_, i) => ({ id: `P${i+1}`, state: 'remainder', turns: 0 }));
  renderCSProcs();
  document.getElementById('csInnerSlot').textContent = '[ EMPTY ]';
  document.getElementById('csWaitQueue').innerHTML = '[none waiting]';
  document.getElementById('csExplain').textContent = `${n} processes initialized. All start in Remainder Section. Use Next Step.`;
  document.getElementById('csStepDisp').textContent = 'Step: 0';
  log(`Critical section initialized with ${n} processes.`, 'info');
}

function renderCSProcs() {
  const div = document.getElementById('csProcesses');
  div.innerHTML = '';
  (window.csProcs || []).forEach(p => {
    const box = document.createElement('div');
    box.className = 'process-box' + (p.state === 'critical' ? ' active' : p.state === 'waiting' ? ' waiting' : p.state === 'entry' ? '' : '');
    box.style.width = '130px';
    box.innerHTML = `<b>${p.id}</b> <span class="badge" style="font-size:9px;">${p.state.toUpperCase()}</span>
      <div class="process-label">Entered CS: ${p.turns}x</div>`;
    div.appendChild(box);
  });
}

function csNextStep() {
  if (!window.csProcs) { csInit(); return; }
  csStep2++;
  document.getElementById('csStepDisp').textContent = `Step: ${csStep2}`;
  const procs = window.csProcs;
  const inCS = procs.find(p => p.state === 'critical');
  const waiting = procs.filter(p => p.state === 'entry');

  // If process in CS, move it to exit then remainder
  if (inCS) {
    if (Math.random() < 0.5) {
      inCS.state = 'exit';
      document.getElementById('csExplain').textContent = `${inCS.id} finishes critical section → moves to Exit Section.`;
      log(`${inCS.id}: Exiting critical section.`, 'step');
    } else {
      inCS.state = 'remainder';
      csInside = null;
      document.getElementById('csInnerSlot').innerHTML = '[ EMPTY ]';
      document.getElementById('csExplain').textContent = `${inCS.id} exits → back to Remainder Section. CS is now free.`;
      log(`${inCS.id}: Back to remainder. CS is free.`, 'success');
    }
  }
  // Move exit to remainder
  procs.filter(p => p.state === 'exit').forEach(p => {
    p.state = 'remainder';
    log(`${p.id}: Exit Section done → Remainder.`, 'step');
  });

  // Random remainder process moves to entry
  const remProcs = procs.filter(p => p.state === 'remainder');
  if (remProcs.length > 0 && Math.random() < 0.6) {
    const p = remProcs[Math.floor(Math.random() * remProcs.length)];
    p.state = 'entry';
    log(`${p.id}: Wants to enter CS → Entry Section (requesting access).`, 'step');
    document.getElementById('csExplain').textContent = `${p.id} needs CS → goes to Entry Section and waits for permission.`;
  }

  // If CS empty and processes waiting, let one in
  const nowInCS = procs.find(p => p.state === 'critical');
  const nowWaiting = procs.filter(p => p.state === 'entry');
  if (!nowInCS && nowWaiting.length > 0) {
    const chosen = nowWaiting[0];
    chosen.state = 'critical';
    chosen.turns++;
    document.getElementById('csInnerSlot').innerHTML = `<div class="process-box active" style="display:inline-block;">${chosen.id}<div class="process-label">IN CRITICAL SECTION</div></div>`;
    log(`${chosen.id}: ENTERS critical section (mutual exclusion guaranteed).`, 'success');
    document.getElementById('csExplain').textContent = `✓ Mutual Exclusion: ${chosen.id} enters CS. Others (${nowWaiting.slice(1).map(p=>p.id).join(', ')||'none'}) must wait.`;
  }

  // Update waiting queue display
  const stillWaiting = procs.filter(p => p.state === 'entry' && p.state !== 'critical');
  const wq = document.getElementById('csWaitQueue');
  wq.innerHTML = stillWaiting.length ? stillWaiting.map(p=>`<span class="queue-item">${p.id}</span>`).join('<span class="queue-arrow">→</span>') : '[none waiting]';

  renderCSProcs();
}

function csReset() {
  window.csProcs = null;
  csStep2 = 0;
  document.getElementById('csProcesses').innerHTML = '';
  document.getElementById('csInnerSlot').textContent = '[ EMPTY ]';
  document.getElementById('csWaitQueue').innerHTML = '[none waiting]';
  document.getElementById('csExplain').textContent = 'Reset. Click Initialize.';
  document.getElementById('csStepDisp').textContent = 'Step: 0';
  log('Critical Section reset.', 'warn');
}

// ============================================================
// 4. PETERSON'S SOLUTION MODULE
// ============================================================
let petRunning = false, petStep2 = 0;
let petState = { flag: [false, false], turn: 0, inCS: -1, phase: [0, 0] };

function renderPeterson() {
  document.getElementById('vizTitle').textContent = "▶ Peterson's Solution";
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Variables</div>
      <div style="font-size:10px;margin-bottom:4px;color:#333;">
        <b>flag[i]</b> = Process i wants to enter CS<br>
        <b>turn</b> = Whose turn to enter CS
      </div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Trigger</div>
      <button class="btn btn-green" onclick="petTrigger(0)">P0 wants CS</button><br>
      <button class="btn btn-blue" onclick="petTrigger(1)">P1 wants CS</button><br>
      <button class="btn btn-blue" onclick="petAutoRun()">▶ Auto Run</button><br>
      <button class="btn btn-red" onclick="petReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Algorithm</div>
      <div class="code-display" style="font-size:10px;">
        <div style="color:#aaa;">// Process Pi (i=0 or 1, j=1-i)</div>
        <div style="color:#88ff88;">flag[i] = true;</div>
        <div style="color:#88ff88;">turn = j;</div>
        <div style="color:#ffff88;">while (flag[j] && turn==j);</div>
        <div style="color:#ff8888;">// CRITICAL SECTION</div>
        <div style="color:#88ffff;">flag[i] = false;</div>
        <div style="color:#aaa;">// REMAINDER</div>
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div style="padding:8px;">
      <div class="step-counter" id="petStepDisp">Step: 0</div>
      <div class="viz-row" style="justify-content:center;gap:20px;align-items:flex-start;">
        <div>
          <div class="code-pane-title" style="background:#880000;">Process P0</div>
          <div class="code-display" id="petCode0">
            <div class="code-line" id="pet0_0">  flag[0] = true</div>
            <div class="code-line" id="pet0_1">  turn = 1</div>
            <div class="code-line" id="pet0_2">  while (flag[1] && turn==1)</div>
            <div class="code-line" id="pet0_3">    wait...</div>
            <div class="code-line" id="pet0_4">  // CRITICAL SECTION</div>
            <div class="code-line" id="pet0_5">  flag[0] = false</div>
          </div>
          <div id="petState0" class="process-box" style="margin-top:6px;width:140px;">P0<div class="process-label" id="petLabel0">REMAINDER</div></div>
        </div>

        <div style="text-align:center;min-width:120px;">
          <div class="section-hdr" style="text-align:center;">Shared Variables</div>
          <div style="margin:8px 0;">
            <div style="font-size:10px;margin-bottom:2px;">flag[0]</div>
            <div class="flag-box" id="petFlag0">false</div>
          </div>
          <div style="margin:8px 0;">
            <div style="font-size:10px;margin-bottom:2px;">flag[1]</div>
            <div class="flag-box" id="petFlag1">false</div>
          </div>
          <div style="margin:10px 0;">
            <div style="font-size:10px;margin-bottom:2px;">turn</div>
            <div class="semaphore-display" id="petTurn" style="font-size:20px;min-width:50px;">0</div>
          </div>
          <div class="section-hdr" style="text-align:center;margin-top:8px;">Critical Section</div>
          <div style="border:3px solid #880000;background:#ffe8e8;min-height:50px;padding:6px;margin-top:4px;" id="petCSZone">
            <div style="font-size:10px;color:#888;">[ EMPTY ]</div>
          </div>
        </div>

        <div>
          <div class="code-pane-title" style="background:#004488;">Process P1</div>
          <div class="code-display" id="petCode1">
            <div class="code-line" id="pet1_0">  flag[1] = true</div>
            <div class="code-line" id="pet1_1">  turn = 0</div>
            <div class="code-line" id="pet1_2">  while (flag[0] && turn==0)</div>
            <div class="code-line" id="pet1_3">    wait...</div>
            <div class="code-line" id="pet1_4">  // CRITICAL SECTION</div>
            <div class="code-line" id="pet1_5">  flag[1] = false</div>
          </div>
          <div id="petState1" class="process-box" style="margin-top:6px;width:140px;">P1<div class="process-label" id="petLabel1">REMAINDER</div></div>
        </div>
      </div>
      <div class="highlight-box" id="petExplain" style="margin-top:8px;">Click "P0 wants CS" or "P1 wants CS" to simulate Peterson's algorithm step by step.</div>
    </div>`;
  log("Peterson's Solution module loaded.", 'info');
}

function updatePetDisplay() {
  const s = petState;
  const f0 = document.getElementById('petFlag0');
  const f1 = document.getElementById('petFlag1');
  f0.textContent = s.flag[0] ? 'true' : 'false';
  f0.className = 'flag-box ' + (s.flag[0] ? 'flag-true' : 'flag-false');
  f1.textContent = s.flag[1] ? 'true' : 'false';
  f1.className = 'flag-box ' + (s.flag[1] ? 'flag-true' : 'flag-false');
  document.getElementById('petTurn').textContent = s.turn;
}
function hlPet(proc, line, type = 'hl') {
  for (let i = 0; i <= 5; i++) {
    const el = document.getElementById(`pet${proc}_${i}`);
    if (el) el.className = 'code-line' + (i === line ? ' ' + type : '');
  }
}
function setPetState(proc, label, cls) {
  const box = document.getElementById(`petState${proc}`);
  box.className = 'process-box ' + cls;
  document.getElementById(`petLabel${proc}`).textContent = label;
}

async function petTrigger(i) {
  if (petRunning) return;
  petRunning = true;
  petStep2++;
  document.getElementById('petStepDisp').textContent = `Step: ${petStep2}`;
  const j = 1 - i;
  const spd = getSpeed();
  const explain = document.getElementById('petExplain');

  // Step 1: set flag[i] = true
  hlPet(i, 0, 'hl');
  petState.flag[i] = true;
  updatePetDisplay();
  setPetState(i, 'ENTRY SECTION', '');
  explain.textContent = `P${i} wants to enter CS. Sets flag[${i}] = true (signals its intent).`;
  log(`P${i}: flag[${i}] = true (P${i} wants to enter CS)`, 'step');
  await sleep(spd);

  // Step 2: turn = j
  hlPet(i, 1, 'hl');
  petState.turn = j;
  updatePetDisplay();
  explain.textContent = `P${i} sets turn = ${j} (yields priority to P${j}). This is the key to Peterson's fairness!`;
  log(`P${i}: turn = ${j} (yielding to P${j})`, 'step');
  await sleep(spd);

  // Step 3: while loop check
  hlPet(i, 2, 'hl');
  const mustWait = petState.flag[j] && petState.turn === j;
  explain.textContent = `P${i} checks: flag[${j}]=${petState.flag[j]} AND turn==${j}? → ${mustWait ? 'YES → MUST WAIT' : 'NO → CAN ENTER CS'}`;
  log(`P${i}: Checking condition: flag[${j}]=${petState.flag[j]} && turn==${j} → ${mustWait}`, 'step');
  await sleep(spd);

  if (mustWait) {
    hlPet(i, 3, 'hl-red');
    setPetState(i, 'WAITING...', 'waiting');
    explain.textContent = `P${i} is WAITING in the busy-wait loop. P${j} is in CS or has priority.`;
    log(`P${i}: Blocked — busy waiting (P${j} has priority or is in CS)`, 'warn');
    await sleep(spd * 1.5);
    petRunning = false;
    return;
  }

  // Enter CS
  hlPet(i, 4, 'hl-green');
  setPetState(i, 'CRITICAL SECTION', 'active');
  petState.inCS = i;
  document.getElementById('petCSZone').innerHTML = `<div class="process-box active" style="display:inline-block;">P${i}<div class="process-label">EXECUTING</div></div>`;
  explain.textContent = `✓ P${i} ENTERS critical section! Mutual exclusion guaranteed by Peterson's algorithm.`;
  log(`P${i}: ENTERS Critical Section (Mutual Exclusion achieved!)`, 'success');
  await sleep(spd * 1.5);

  // Exit CS
  hlPet(i, 5, 'hl');
  petState.flag[i] = false;
  updatePetDisplay();
  setPetState(i, 'REMAINDER', '');
  petState.inCS = -1;
  document.getElementById('petCSZone').innerHTML = '<div style="font-size:10px;color:#888;">[ EMPTY ]</div>';
  explain.textContent = `P${i} exits CS and sets flag[${i}] = false. CS is now free for P${j} to enter.`;
  log(`P${i}: EXIT CS — flag[${i}] = false. CS released.`, 'success');
  hlPet(i, -1, 'hl');
  petRunning = false;
}

async function petAutoRun() {
  if (petRunning) return;
  for (let round = 0; round < 4; round++) {
    await petTrigger(round % 2);
    await sleep(getSpeed() * 0.5);
    await petTrigger(1 - round % 2);
    await sleep(getSpeed() * 0.5);
  }
}

function petReset() {
  petRunning = false;
  petState = { flag: [false, false], turn: 0, inCS: -1 };
  petStep2 = 0;
  updatePetDisplay();
  document.getElementById('petCSZone').innerHTML = '<div style="font-size:10px;color:#888;">[ EMPTY ]</div>';
  for (let p = 0; p <= 1; p++) { hlPet(p, -1, 'hl'); setPetState(p, 'REMAINDER', ''); }
  document.getElementById('petExplain').textContent = "Reset. Click P0 or P1 wants CS.";
  document.getElementById('petStepDisp').textContent = 'Step: 0';
  log("Peterson's solution reset.", 'warn');
}

// ============================================================
// 5. SEMAPHORE MODULE
// ============================================================
let semRunning = false;
let semVal = 1, semWaitQ = [], semProcesses = [];

function renderSemaphore() {
  document.getElementById('vizTitle').textContent = '▶ Semaphore Simulator (Binary & Counting)';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Semaphore Config</div>
      <div class="ctrl-row"><label>Type:</label>
        <select id="semType" style="width:110px;" onchange="semTypeChange()">
          <option value="binary">Binary (0/1)</option>
          <option value="counting">Counting</option>
        </select>
      </div>
      <div class="ctrl-row"><label>Init Value:</label><input type="number" id="semInitVal" value="1" min="0" max="10" style="width:40px;"></div>
      <div class="ctrl-row"><label>Processes:</label><input type="number" id="semNumP" value="3" min="2" max="6" style="width:40px;"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-green" onclick="semInit()">▶ Initialize</button><br>
      <button class="btn btn-blue" onclick="semWait()">⬇ Wait() [P op]</button><br>
      <button class="btn btn-green" onclick="semSignal()">⬆ Signal() [V op]</button><br>
      <button class="btn btn-red" onclick="semReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Operations</div>
      <div style="font-size:10px;line-height:1.6;color:#333;">
        <b>Wait(S) / P(S):</b><br>
        if S > 0: S--<br>
        else: block process<br><br>
        <b>Signal(S) / V(S):</b><br>
        if queue empty: S++<br>
        else: wake one process
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div style="padding:8px;">
      <div class="step-counter" id="semStepDisp">Step: 0</div>
      <div class="viz-row" style="gap:20px;flex-wrap:wrap;align-items:flex-start;">
        <div style="text-align:center;">
          <div class="section-hdr" style="text-align:center;width:120px;">Semaphore S</div>
          <div style="margin:8px 0;">
            <div class="semaphore-display" id="semDisplay">1</div>
            <div style="font-size:10px;margin-top:4px;" id="semTypeLabel">Binary Semaphore</div>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:6px;">
            <div style="text-align:center;">
              <div class="badge" style="background:#006600;">Wait()</div>
              <div style="font-size:9px;margin-top:2px;">Decrements / Blocks</div>
            </div>
            <div style="text-align:center;">
              <div class="badge" style="background:#004488;">Signal()</div>
              <div style="font-size:9px;margin-top:2px;">Increments / Wakes</div>
            </div>
          </div>
        </div>

        <div style="flex:1;min-width:180px;">
          <div class="section-hdr">Process States</div>
          <div id="semProcList" style="display:flex;flex-direction:column;gap:4px;margin-top:4px;"></div>
          <div class="section-hdr" style="margin-top:8px;">Blocked Queue</div>
          <div id="semBlockedQ" class="queue-display" style="min-height:28px;border:1px solid #808080;padding:4px;background:#f0f0f0;margin-top:4px;">[none blocked]</div>
          <div class="section-hdr" style="margin-top:8px;">Critical Section</div>
          <div id="semCSZone" style="border:3px solid #880000;background:#ffe8e8;min-height:50px;padding:8px;margin-top:4px;text-align:center;">
            <div style="font-size:10px;color:#888;" id="semCSContent">[ EMPTY ]</div>
          </div>
        </div>
      </div>
      <div class="highlight-box" id="semExplain" style="margin-top:8px;">Click Initialize, then use Wait() and Signal() operations.</div>
    </div>`;
  log('Semaphore module loaded.', 'info');
}

function semTypeChange() {
  const type = document.getElementById('semType').value;
  document.getElementById('semInitVal').value = type === 'binary' ? 1 : 3;
}

function semInit() {
  semVal = parseInt(document.getElementById('semInitVal').value);
  const n = parseInt(document.getElementById('semNumP').value) || 3;
  const type = document.getElementById('semType').value;
  semWaitQ = [];
  semProcesses = Array.from({length: n}, (_, i) => ({ id: `P${i+1}`, state: 'ready' }));
  document.getElementById('semDisplay').textContent = semVal;
  document.getElementById('semTypeLabel').textContent = type === 'binary' ? 'Binary Semaphore (0 or 1)' : `Counting Semaphore (max=${semVal})`;
  document.getElementById('semStepDisp').textContent = 'Step: 0';
  renderSemProcs();
  document.getElementById('semExplain').textContent = `Semaphore initialized to ${semVal}. Use Wait() and Signal() operations.`;
  log(`Semaphore initialized: S=${semVal}, ${n} processes, type=${type}`, 'info');
}

function renderSemProcs() {
  const div = document.getElementById('semProcList');
  div.innerHTML = '';
  semProcesses.forEach(p => {
    const box = document.createElement('div');
    box.className = 'process-box' + (p.state === 'cs' ? ' active' : p.state === 'blocked' ? ' blocked' : '');
    box.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:4px 8px;';
    box.innerHTML = `<b>${p.id}</b> <span class="badge" style="font-size:9px;background:${p.state==='cs'?'#006600':p.state==='blocked'?'#880000':'#000080'}">${p.state.toUpperCase()}</span>`;
    div.appendChild(box);
  });
  // Update blocked queue
  const bq = document.getElementById('semBlockedQ');
  bq.innerHTML = semWaitQ.length ? semWaitQ.map(p=>`<span class="queue-item">${p.id}</span>`).join('<span class="queue-arrow">→</span>') : '[none blocked]';
  // Update CS zone
  const inCS = semProcesses.find(p => p.state === 'cs');
  const csZone = document.getElementById('semCSContent');
  if (inCS) {
    csZone.innerHTML = `<div class="process-box active" style="display:inline-block;">${inCS.id}<div class="process-label">IN CS</div></div>`;
  } else {
    csZone.textContent = '[ EMPTY ]';
  }
}

let semStepCount = 0;
async function semWait() {
  if (!semProcesses.length) { log('Initialize first!', 'warn'); return; }
  semStepCount++;
  document.getElementById('semStepDisp').textContent = `Step: ${semStepCount}`;
  // Pick a ready process
  const ready = semProcesses.filter(p => p.state === 'ready');
  if (!ready.length) { log('No ready processes available.', 'warn'); return; }
  const p = ready[Math.floor(Math.random() * ready.length)];
  const explain = document.getElementById('semExplain');

  log(`${p.id}: Calls Wait(S). Current S=${semVal}`, 'step');
  if (semVal > 0) {
    semVal--;
    document.getElementById('semDisplay').textContent = semVal;
    document.getElementById('semDisplay').style.background = semVal === 0 ? '#880000' : '#000080';
    p.state = 'cs';
    explain.textContent = `${p.id} calls Wait(S): S > 0, so S decremented to ${semVal}. ${p.id} enters Critical Section!`;
    log(`${p.id}: S decremented → S=${semVal}. Process ENTERS critical section.`, 'success');
  } else {
    p.state = 'blocked';
    semWaitQ.push(p);
    explain.innerHTML = `<span style="color:#880000;font-weight:bold;">⚠ BLOCKED!</span> ${p.id} calls Wait(S): S=0, process is BLOCKED and added to waiting queue.`;
    log(`${p.id}: S=0! Process BLOCKED → added to wait queue.`, 'error');
  }
  renderSemProcs();
}

async function semSignal() {
  if (!semProcesses.length) { log('Initialize first!', 'warn'); return; }
  semStepCount++;
  document.getElementById('semStepDisp').textContent = `Step: ${semStepCount}`;
  const explain = document.getElementById('semExplain');
  const inCS = semProcesses.find(p => p.state === 'cs');
  if (!inCS) { log('No process in CS to signal from.', 'warn'); return; }

  // Release from CS
  inCS.state = 'ready';
  log(`${inCS.id}: Calls Signal(S). Leaving CS.`, 'step');

  if (semWaitQ.length > 0) {
    // Wake first blocked process
    const woken = semWaitQ.shift();
    woken.state = 'cs';
    explain.textContent = `${inCS.id} exits CS and calls Signal(S). S stays at ${semVal}. ${woken.id} is WOKEN UP from blocked queue and enters CS!`;
    log(`Signal(S): ${inCS.id} exits CS. ${woken.id} woken from queue, enters CS. S stays ${semVal}.`, 'success');
  } else {
    semVal++;
    const type = document.getElementById('semType')?.value || 'binary';
    if (type === 'binary' && semVal > 1) semVal = 1;
    document.getElementById('semDisplay').textContent = semVal;
    document.getElementById('semDisplay').style.background = '#000080';
    explain.textContent = `${inCS.id} exits CS and calls Signal(S). No blocked processes. S incremented to ${semVal}.`;
    log(`Signal(S): No waiting processes. S incremented → S=${semVal}.`, 'success');
  }
  renderSemProcs();
}

function semReset() {
  semProcesses = []; semWaitQ = []; semVal = 1;
  document.getElementById('semDisplay').textContent = '1';
  document.getElementById('semDisplay').style.background = '#000080';
  document.getElementById('semProcList').innerHTML = '';
  document.getElementById('semBlockedQ').innerHTML = '[none blocked]';
  document.getElementById('semCSContent').textContent = '[ EMPTY ]';
  document.getElementById('semExplain').textContent = 'Reset. Click Initialize.';
  semStepCount = 0;
  document.getElementById('semStepDisp').textContent = 'Step: 0';
  log('Semaphore reset.', 'warn');
}

// ============================================================
// 6. PRODUCER-CONSUMER MODULE
// ============================================================
let pcRunning = false, pcBuffer = [], pcMaxBuf = 5;
let pcSemEmpty, pcSemFull, pcSemMutex;
let pcItemCount = 0, pcStepCount = 0;

function renderProdCons() {
  document.getElementById('vizTitle').textContent = '▶ Producer-Consumer Problem';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Buffer Config</div>
      <div class="ctrl-row"><label>Buffer Size:</label><input type="number" id="pcBufSize" value="5" min="2" max="8" style="width:40px;"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-green" onclick="pcInit()">▶ Initialize</button><br>
      <button class="btn btn-blue" onclick="pcProduce()">+ Produce Item</button><br>
      <button class="btn btn-green" onclick="pcConsume()">- Consume Item</button><br>
      <button class="btn btn-blue" onclick="pcAutoRun()">▶▶ Auto Run</button><br>
      <button class="btn btn-red" onclick="pcStop()">■ Stop</button><br>
      <button class="btn" onclick="pcReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Semaphores</div>
      <div style="font-size:10px;line-height:1.5;color:#333;">
        <b>empty</b>: # free slots (init=N)<br>
        <b>full</b>: # filled slots (init=0)<br>
        <b>mutex</b>: buffer access lock (init=1)
      </div>
    </div>`;

  document.getElementById('vizBody').innerHTML = `
    <div style="padding:8px;">
      <div class="step-counter" id="pcStepDisp">Step: 0</div>
      <div class="viz-row" style="gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div class="process-box" id="pcProducer" style="width:90px;">PROD<div class="process-label">Producer</div></div>
        </div>
        <div style="flex:1;min-width:200px;">
          <div class="section-hdr">Buffer (Circular Queue)</div>
          <div class="buffer-container" id="pcBufferViz"></div>
          <div style="font-size:11px;margin-top:4px;">Items: <b id="pcItemCount">0</b> / <b id="pcMaxLabel">5</b></div>
        </div>
        <div style="text-align:center;">
          <div class="process-box" id="pcConsumer" style="width:90px;">CONS<div class="process-label">Consumer</div></div>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="section-hdr">Semaphores</div>
        <div class="viz-row" style="gap:12px;margin-top:4px;">
          <div style="text-align:center;" data-tip="empty semaphore: counts available (empty) slots in buffer">
            <div class="semaphore-display" id="pcSemEmpty" style="font-size:18px;min-width:50px;">5</div>
            <div style="font-size:9px;margin-top:2px;">empty</div>
          </div>
          <div style="text-align:center;" data-tip="full semaphore: counts filled slots in buffer">
            <div class="semaphore-display" id="pcSemFull" style="font-size:18px;min-width:50px;">0</div>
            <div style="font-size:9px;margin-top:2px;">full</div>
          </div>
          <div style="text-align:center;" data-tip="mutex semaphore: ensures exclusive access to buffer (binary)">
            <div class="semaphore-display" id="pcSemMutex" style="font-size:18px;min-width:50px;background:#555;">1</div>
            <div style="font-size:9px;margin-top:2px;">mutex</div>
          </div>
        </div>
      </div>
      <div class="highlight-box" id="pcExplain" style="margin-top:8px;">Initialize first, then Produce and Consume items.</div>
    </div>`;
  log('Producer-Consumer module loaded.', 'info');
}

function pcInit() {
  pcMaxBuf = parseInt(document.getElementById('pcBufSize').value) || 5;
  pcBuffer = [];
  pcItemCount = 0;
  pcSemEmpty = pcMaxBuf;
  pcSemFull = 0;
  pcSemMutex = 1;
  pcStepCount = 0;
  renderPCBuffer();
  document.getElementById('pcItemCount').textContent = '0';
  document.getElementById('pcMaxLabel').textContent = pcMaxBuf;
  document.getElementById('pcSemEmpty').textContent = pcSemEmpty;
  document.getElementById('pcSemFull').textContent = pcSemFull;
  document.getElementById('pcSemMutex').textContent = pcSemMutex;
  document.getElementById('pcStepDisp').textContent = 'Step: 0';
  document.getElementById('pcExplain').textContent = `Buffer of size ${pcMaxBuf} initialized. empty=${pcSemEmpty}, full=${pcSemFull}, mutex=${pcSemMutex}.`;
  log(`Producer-Consumer initialized: buffer size=${pcMaxBuf}`, 'info');
}

function renderPCBuffer() {
  const viz = document.getElementById('pcBufferViz');
  if (!viz) return;
  viz.innerHTML = '';
  for (let i = 0; i < pcMaxBuf; i++) {
    const slot = document.createElement('div');
    slot.className = 'buffer-slot' + (i < pcBuffer.length ? ' filled' : '');
    slot.id = `pcSlot${i}`;
    const label = document.createElement('div');
    label.className = 'slot-label';
    label.textContent = i;
    slot.appendChild(label);
    if (i < pcBuffer.length) slot.innerHTML += pcBuffer[i];
    viz.appendChild(slot);
  }
}

function updatePCSems() {
  document.getElementById('pcSemEmpty').textContent = pcSemEmpty;
  document.getElementById('pcSemFull').textContent = pcSemFull;
  document.getElementById('pcSemMutex').textContent = pcSemMutex;
  document.getElementById('pcSemEmpty').style.background = pcSemEmpty === 0 ? '#880000' : '#000080';
  document.getElementById('pcSemFull').style.background = pcSemFull === 0 ? '#555555' : '#000080';
  document.getElementById('pcSemMutex').style.background = pcSemMutex === 0 ? '#880000' : '#555555';
}

async function pcProduce() {
  if (!pcMaxBuf) { log('Initialize first!', 'warn'); return; }
  pcStepCount++;
  document.getElementById('pcStepDisp').textContent = `Step: ${pcStepCount}`;
  const prod = document.getElementById('pcProducer');
  const explain = document.getElementById('pcExplain');
  prod.classList.add('active');

  log('Producer: calls Wait(empty)...', 'step');
  if (pcSemEmpty === 0) {
    prod.classList.add('blocked'); prod.classList.remove('active');
    explain.innerHTML = `<span style="color:#880000;font-weight:bold;">⚠ Producer BLOCKED!</span> Buffer is full (empty=0). Producer must wait for consumer.`;
    log('Producer BLOCKED: Buffer full! Waiting for consumer to consume.', 'error');
    await sleep(getSpeed() * 0.7);
    prod.classList.remove('blocked');
    return;
  }
  pcSemEmpty--;
  log(`Wait(empty): empty=${pcSemEmpty}`, 'step');
  await sleep(getSpeed() * 0.4);

  log('Producer: calls Wait(mutex)...', 'step');
  pcSemMutex--;
  updatePCSems();
  await sleep(getSpeed() * 0.4);

  // Produce item
  pcItemCount++;
  const item = ['🍎','🍊','🍋','🍇','🍓','🍌','🍍','🥝'][pcItemCount % 8];
  pcBuffer.push(item);
  renderPCBuffer();
  document.getElementById('pcItemCount').textContent = pcBuffer.length;
  const slotEl = document.getElementById(`pcSlot${pcBuffer.length - 1}`);
  if (slotEl) slotEl.classList.add('new-item');
  log(`Producer: Added item ${item} to buffer slot ${pcBuffer.length - 1}`, 'success');
  explain.textContent = `Producer added ${item} to buffer. Buffer now has ${pcBuffer.length}/${pcMaxBuf} items.`;
  await sleep(getSpeed() * 0.6);

  // Release mutex
  pcSemMutex++;
  log(`Signal(mutex): mutex=${pcSemMutex}`, 'step');
  // Signal full
  pcSemFull++;
  log(`Signal(full): full=${pcSemFull}`, 'step');
  updatePCSems();
  prod.classList.remove('active');
  explain.textContent = `Producer done: Signal(mutex) and Signal(full). Semaphores: empty=${pcSemEmpty}, full=${pcSemFull}, mutex=${pcSemMutex}`;
}

async function pcConsume() {
  if (!pcMaxBuf) { log('Initialize first!', 'warn'); return; }
  pcStepCount++;
  document.getElementById('pcStepDisp').textContent = `Step: ${pcStepCount}`;
  const cons = document.getElementById('pcConsumer');
  const explain = document.getElementById('pcExplain');
  cons.classList.add('active');

  log('Consumer: calls Wait(full)...', 'step');
  if (pcSemFull === 0) {
    cons.classList.add('blocked'); cons.classList.remove('active');
    explain.innerHTML = `<span style="color:#880000;font-weight:bold;">⚠ Consumer BLOCKED!</span> Buffer is empty (full=0). Consumer must wait for producer.`;
    log('Consumer BLOCKED: Buffer empty! Waiting for producer to produce.', 'error');
    await sleep(getSpeed() * 0.7);
    cons.classList.remove('blocked');
    return;
  }
  pcSemFull--;
  log(`Wait(full): full=${pcSemFull}`, 'step');
  await sleep(getSpeed() * 0.4);

  pcSemMutex--;
  updatePCSems();
  await sleep(getSpeed() * 0.4);

  const slotEl = document.getElementById(`pcSlot${pcBuffer.length - 1}`);
  if (slotEl) slotEl.classList.add('removing');
  const item = pcBuffer.pop();
  renderPCBuffer();
  document.getElementById('pcItemCount').textContent = pcBuffer.length;
  log(`Consumer: Consumed item ${item} from buffer. Buffer now has ${pcBuffer.length} items.`, 'success');
  explain.textContent = `Consumer consumed ${item}. Buffer now has ${pcBuffer.length}/${pcMaxBuf} items.`;
  await sleep(getSpeed() * 0.6);

  pcSemMutex++;
  pcSemEmpty++;
  updatePCSems();
  log(`Signal(mutex) + Signal(empty): empty=${pcSemEmpty}, mutex=${pcSemMutex}`, 'step');
  cons.classList.remove('active');
  explain.textContent = `Consumer done: Signal(mutex), Signal(empty). Semaphores: empty=${pcSemEmpty}, full=${pcSemFull}, mutex=${pcSemMutex}`;
}

let pcAutoTimer = null;
async function pcAutoRun() {
  if (!pcMaxBuf) { pcInit(); }
  pcRunning = true;
  log('Auto run started: Producer and Consumer alternating...', 'info');
  async function step() {
    if (!pcRunning) return;
    const action = Math.random() < 0.55 ? 'produce' : 'consume';
    if (action === 'produce') await pcProduce();
    else await pcConsume();
    if (pcRunning) pcAutoTimer = setTimeout(step, getSpeed() * 1.2);
  }
  step();
}
function pcStop() { pcRunning = false; if (pcAutoTimer) clearTimeout(pcAutoTimer); log('Auto run stopped.', 'warn'); }
function pcReset() {
  pcStop();
  pcBuffer = []; pcMaxBuf = 5; pcItemCount = 0;
  pcSemEmpty = 5; pcSemFull = 0; pcSemMutex = 1;
  pcStepCount = 0;
  document.getElementById('pcBufferViz').innerHTML = '';
  document.getElementById('pcExplain').textContent = 'Reset. Click Initialize.';
  log('Producer-Consumer reset.', 'warn');
}

// ============================================================
// 7. DEADLOCK MODULE
// ============================================================
let dlSubTab = 'characterize';
let dlProcs = [], dlResources = [], dlAlloc = [], dlMax = [], dlAvail = [];
let dlConditions = { mutual: true, holdwait: true, nopreempt: true, circular: true };

function renderDeadlock() {
  document.getElementById('vizTitle').textContent = '▶ Deadlock Simulator';
  document.getElementById('controlsBody').innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Sub-Topic</div>
      <div class="subtabs" style="flex-direction:column;gap:1px;">
        <button class="subtab ${dlSubTab==='characterize'?'active':''}" onclick="dlSwitchTab('characterize')">A. Characterization</button>
        <button class="subtab ${dlSubTab==='prevention'?'active':''}" onclick="dlSwitchTab('prevention')">B. Prevention</button>
        <button class="subtab ${dlSubTab==='bankers'?'active':''}" onclick="dlSwitchTab('bankers')">C. Banker's Algo</button>
        <button class="subtab ${dlSubTab==='detection'?'active':''}" onclick="dlSwitchTab('detection')">D. Detection</button>
        <button class="subtab ${dlSubTab==='recovery'?'active':''}" onclick="dlSwitchTab('recovery')">E. Recovery</button>
      </div>
    </div>
    <div id="dlSubControls"></div>`;

  document.getElementById('vizBody').innerHTML = `<div id="dlVizContent" style="padding:8px;"></div>`;
  dlRenderSubTab();
}

function dlSwitchTab(tab) {
  dlSubTab = tab;
  document.querySelectorAll('#dlSubControls .subtab, .subtab').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(tab.substring(0,4)));
  });
  renderDeadlock();
}

function dlRenderSubTab() {
  const ctrl = document.getElementById('dlSubControls');
  const viz = document.getElementById('dlVizContent');
  if (!ctrl || !viz) return;
  switch (dlSubTab) {
    case 'characterize': dlRenderCharacterize(ctrl, viz); break;
    case 'prevention': dlRenderPrevention(ctrl, viz); break;
    case 'bankers': dlRenderBankers(ctrl, viz); break;
    case 'detection': dlRenderDetection(ctrl, viz); break;
    case 'recovery': dlRenderRecovery(ctrl, viz); break;
  }
}

// === A. CHARACTERIZATION ===
function dlRenderCharacterize(ctrl, viz) {
  ctrl.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-red" onclick="dlShowDeadlock()">💀 Simulate Deadlock</button><br>
      <button class="btn btn-green" onclick="dlAnimateRAG()">🔄 Animate RAG</button><br>
      <button class="btn" onclick="dlResetRAG()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">4 Conditions</div>
      <div style="font-size:10px;line-height:1.5;">
        ALL 4 must hold simultaneously for deadlock.
      </div>
    </div>`;

  viz.innerHTML = `
    <div class="section-hdr">4 Necessary Conditions for Deadlock</div>
    <div style="margin:6px 0;">
      <div class="condition-box active" id="cond0" data-tip="Only one process can use a resource at a time.">
        <div class="cond-icon">🔒</div>
        <div><b>1. Mutual Exclusion</b><br><span style="font-size:10px;">Resources cannot be shared.</span></div>
      </div>
      <div class="condition-box active" id="cond1" data-tip="Processes hold resources while waiting for more.">
        <div class="cond-icon">🤲</div>
        <div><b>2. Hold and Wait</b><br><span style="font-size:10px;">Hold resources, wait for others.</span></div>
      </div>
      <div class="condition-box active" id="cond2" data-tip="Resources cannot be forcibly taken from processes.">
        <div class="cond-icon">🚫</div>
        <div><b>3. No Preemption</b><br><span style="font-size:10px;">Resources released only voluntarily.</span></div>
      </div>
      <div class="condition-box active" id="cond3" data-tip="P1 waits for P2, P2 waits for P1 — circular chain.">
        <div class="cond-icon">🔄</div>
        <div><b>4. Circular Wait</b><br><span style="font-size:10px;">Chain of processes waiting for each other.</span></div>
      </div>
    </div>
    <div class="section-hdr" style="margin-top:8px;">Resource Allocation Graph</div>
    <canvas id="ragCanvas" width="440" height="220" style="border:1px solid #808080;background:#f8f8f8;display:block;margin-top:4px;"></canvas>
    <div class="highlight-box" id="dlCharExplain" style="margin-top:6px;">Click "Simulate Deadlock" to see a circular wait in the RAG.</div>`;
  drawRAG(false);
  log('Deadlock Characterization loaded.', 'info');
}

let ragDeadlocked = false;
function drawRAG(deadlock) {
  const canvas = document.getElementById('ragCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height;

  // Nodes: P1, P2, P3 (circles), R1, R2 (squares)
  const nodes = {
    P1: {x:60,  y:80,  type:'proc'},
    P2: {x:220, y:60,  type:'proc'},
    P3: {x:380, y:80,  type:'proc'},
    R1: {x:140, y:160, type:'res'},
    R2: {x:300, y:160, type:'res'},
  };

  // Edges: deadlock = P1→R1←P2→R2←P3→... circular
  const edges = deadlock ? [
    {from:'P1', to:'R1', req:true},
    {from:'R1', to:'P2', req:false},
    {from:'P2', to:'R2', req:true},
    {from:'R2', to:'P3', req:false},
    {from:'P3', to:'R1', req:true},  // creates cycle!
  ] : [
    {from:'P1', to:'R1', req:true},
    {from:'R1', to:'P2', req:false},
    {from:'P2', to:'R2', req:true},
  ];

  // Draw edges
  edges.forEach(e => {
    const from = nodes[e.from], to = nodes[e.to];
    ctx.beginPath();
    ctx.strokeStyle = deadlock && e.req ? '#cc0000' : '#333';
    ctx.lineWidth = deadlock && e.req ? 2.5 : 1.5;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Arrow
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.fillStyle = deadlock && e.req ? '#cc0000' : '#333';
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 12*Math.cos(angle-0.4), to.y - 12*Math.sin(angle-0.4));
    ctx.lineTo(to.x - 12*Math.cos(angle+0.4), to.y - 12*Math.sin(angle+0.4));
    ctx.closePath(); ctx.fill();
    // Label
    ctx.fillStyle = '#555'; ctx.font = '10px Courier New';
    ctx.fillText(e.req ? 'request' : 'assigned', (from.x+to.x)/2 + 4, (from.y+to.y)/2 - 4);
  });

  // Draw nodes
  Object.entries(nodes).forEach(([name, n]) => {
    ctx.beginPath();
    if (n.type === 'proc') {
      ctx.arc(n.x, n.y, 24, 0, Math.PI*2);
      ctx.fillStyle = deadlock ? '#ffaaaa' : '#d4e8ff';
      ctx.fill();
      ctx.strokeStyle = deadlock ? '#cc0000' : '#000080';
      ctx.lineWidth = 2; ctx.stroke();
    } else {
      ctx.rect(n.x-20, n.y-18, 40, 36);
      ctx.fillStyle = deadlock ? '#ffddaa' : '#ffd4d4';
      ctx.fill();
      ctx.strokeStyle = '#800000'; ctx.lineWidth = 2; ctx.stroke();
      // dot inside resource
      ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI*2);
      ctx.fillStyle = '#800000'; ctx.fill();
    }
    ctx.fillStyle = '#000'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, n.x, n.y);
  });

  if (deadlock) {
    ctx.fillStyle = '#cc0000'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
    ctx.fillText('⚠ DEADLOCK: Circular Wait detected! (P1→R1←P2→R2←P3→R1)', 10, H-10);
  }
}

async function dlShowDeadlock() {
  ragDeadlocked = true;
  drawRAG(true);
  ['cond0','cond1','cond2','cond3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'condition-box active'; el.style.animation = 'pulse 0.8s infinite alternate'; }
  });
  document.getElementById('dlCharExplain').innerHTML = `
    <span style="color:#cc0000;font-weight:bold;">💀 DEADLOCK DETECTED!</span><br>
    All 4 conditions hold: P1 holds R1 and waits for R2. P2 holds R2 and waits for R1. Circular wait → DEADLOCK!`;
  log('DEADLOCK SIMULATED: Circular wait between P1, P2, P3 through R1 and R2.', 'error');
}

function dlAnimateRAG() { ragDeadlocked = false; drawRAG(false); log('RAG reset to non-deadlock state.', 'info'); }
function dlResetRAG() { ragDeadlocked = false; drawRAG(false); ['cond0','cond1','cond2','cond3'].forEach(id => { const el=document.getElementById(id); if(el){el.style.animation='';} }); }

// === B. PREVENTION ===
function dlRenderPrevention(ctrl, viz) {
  ctrl.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Toggle Conditions</div>
      <div style="font-size:10px;color:#333;">Disable conditions to prevent deadlock.</div>
    </div>`;

  viz.innerHTML = `
    <div class="section-hdr">Deadlock Prevention: Disable Necessary Conditions</div>
    <div style="margin:6px 0;" id="prevConditions">
      ${['Mutual Exclusion','Hold and Wait','No Preemption','Circular Wait'].map((name,i) => `
        <div class="condition-box ${dlConditions[['mutual','holdwait','nopreempt','circular'][i]] ? 'active' : 'disabled'}" id="prevCond${i}">
          <div class="cond-icon">${['🔒','🤲','🚫','🔄'][i]}</div>
          <div style="flex:1;">
            <b>${name}</b><br>
            <span style="font-size:10px;">${[
              'Use sharable resources where possible.',
              'Request all resources at once before starting.',
              'Allow OS to preempt resources from waiting processes.',
              'Impose ordering on resource types; request in order.'
            ][i]}</span>
          </div>
          <button class="cond-toggle" onclick="dlToggleCondition(${i})">${dlConditions[['mutual','holdwait','nopreempt','circular'][i]]?'DISABLE':'ENABLE'}</button>
        </div>`).join('')}
    </div>
    <div class="highlight-box" id="prevStatus" style="margin-top:8px;">
      ${Object.values(dlConditions).every(v=>v) ? '⚠ All conditions active → DEADLOCK POSSIBLE' : '✓ At least one condition disabled → Deadlock prevented!'}
    </div>`;
  log('Deadlock Prevention module loaded.', 'info');
}

function dlToggleCondition(i) {
  const keys = ['mutual','holdwait','nopreempt','circular'];
  dlConditions[keys[i]] = !dlConditions[keys[i]];
  dlRenderSubTab();
  const allActive = Object.values(dlConditions).every(v => v);
  log(`Condition "${['Mutual Exclusion','Hold & Wait','No Preemption','Circular Wait'][i]}" ${dlConditions[keys[i]]?'ENABLED':'DISABLED'}.`, dlConditions[keys[i]]?'warn':'success');
  if (!allActive) log('✓ Deadlock prevented! Not all 4 conditions hold.', 'success');
  else log('⚠ All 4 conditions active — deadlock still possible!', 'error');
}

// === C. BANKER'S ALGORITHM ===
let bankProcs = 3, bankRes = 3;
let bankAlloc = [], bankMax = [], bankAvail = [];
let bankNeed = [], bankSafeSeq = [];

function dlRenderBankers(ctrl, viz) {
  ctrl.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Configuration</div>
      <div class="ctrl-row"><label>Processes:</label><input type="number" id="bankP" value="${bankProcs}" min="2" max="6" style="width:40px;" onchange="bankUpdateSize()"></div>
      <div class="ctrl-row"><label>Resources:</label><input type="number" id="bankR" value="${bankRes}" min="1" max="4" style="width:40px;" onchange="bankUpdateSize()"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-green" onclick="bankLoadExample()">📋 Load Example</button><br>
      <button class="btn btn-blue" onclick="bankRunAlgo()">▶ Run Algorithm</button><br>
      <button class="btn btn-red" onclick="bankReset()">↺ Reset</button>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">How it works</div>
      <div style="font-size:10px;line-height:1.5;color:#333;">
        1. Compute Need = Max - Alloc<br>
        2. Find a process whose Need ≤ Available<br>
        3. "Execute" it → release its Alloc<br>
        4. Repeat until all done = SAFE<br>
        &nbsp;&nbsp;&nbsp;or no process found = UNSAFE
      </div>
    </div>`;

  viz.innerHTML = `
    <div class="section-hdr">Banker's Algorithm — Deadlock Avoidance</div>
    <div style="overflow-x:auto;margin-top:6px;">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Process</th>
            <th colspan="3">Allocation</th>
            <th colspan="3">Maximum</th>
            <th colspan="3">Need (Max-Alloc)</th>
          </tr>
          <tr>
            <th></th>
            ${['A','B','C'].map(r=>`<th>${r}</th>`).join('')}
            ${['A','B','C'].map(r=>`<th>${r}</th>`).join('')}
            ${['A','B','C'].map(r=>`<th>${r}</th>`).join('')}
          </tr>
        </thead>
        <tbody id="bankTableBody"></tbody>
      </table>
    </div>
    <div style="margin-top:8px;">
      <div class="section-hdr">Available Resources</div>
      <div style="display:flex;gap:8px;margin-top:4px;" id="bankAvailRow"></div>
    </div>
    <div style="margin-top:8px;" id="bankResult"></div>
    <div style="margin-top:4px;" class="highlight-box" id="bankExplain">Load Example or enter values, then Run Algorithm.</div>`;

  bankLoadExample();
}

function bankUpdateSize() {
  bankProcs = parseInt(document.getElementById('bankP').value) || 3;
  bankRes = parseInt(document.getElementById('bankR').value) || 3;
  bankAlloc = Array.from({length:bankProcs},()=>Array(bankRes).fill(0));
  bankMax = Array.from({length:bankProcs},()=>Array(bankRes).fill(0));
  bankAvail = Array(bankRes).fill(0);
  bankRenderTable();
}

function bankLoadExample() {
  // Classic OS textbook example
  bankProcs = 5; bankRes = 3;
  bankAlloc = [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]];
  bankMax =   [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]];
  bankAvail =  [3,3,2];
  if (document.getElementById('bankP')) { document.getElementById('bankP').value = 5; document.getElementById('bankR').value = 3; }
  bankRenderTable();
  log('Banker\'s example loaded: 5 processes, 3 resources (A,B,C).', 'info');
}

function bankRenderTable() {
  const tbody = document.getElementById('bankTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  bankNeed = bankAlloc.map((row, i) => row.map((v, j) => (bankMax[i][j] || 0) - v));
  for (let i = 0; i < bankProcs; i++) {
    const tr = document.createElement('tr');
    tr.id = `bankRow${i}`;
    let html = `<td>P${i}</td>`;
    for (let j = 0; j < 3; j++) html += `<td><input type="number" min="0" max="20" value="${bankAlloc[i]?.[j]||0}" onchange="bankAlloc[${i}][${j}]=parseInt(this.value)||0;bankRenderTable();" style="width:28px;"></td>`;
    for (let j = 0; j < 3; j++) html += `<td><input type="number" min="0" max="20" value="${bankMax[i]?.[j]||0}" onchange="bankMax[${i}][${j}]=parseInt(this.value)||0;bankRenderTable();" style="width:28px;"></td>`;
    for (let j = 0; j < 3; j++) { const n = (bankMax[i]?.[j]||0)-(bankAlloc[i]?.[j]||0); html += `<td style="background:${n<0?'#ffc0c0':'#f0f0f0'};">${n}</td>`; }
    tr.innerHTML = html;
    tbody.appendChild(tr);
  }
  // Available row
  const avDiv = document.getElementById('bankAvailRow');
  if (avDiv) {
    avDiv.innerHTML = ['A','B','C'].map((r,j)=>`
      <div style="text-align:center;">
        <div style="font-size:10px;">${r}</div>
        <input type="number" min="0" max="20" value="${bankAvail[j]||0}" style="width:40px;border:1px solid #808080;text-align:center;font-family:Courier New;"
          onchange="bankAvail[${j}]=parseInt(this.value)||0;">
      </div>`).join('');
  }
}

async function bankRunAlgo() {
  const n = bankProcs, m = 3;
  const avail = [...bankAvail];
  const need = bankAlloc.map((row, i) => row.map((v, j) => (bankMax[i][j]||0) - v));
  const done = Array(n).fill(false);
  const seq = [];
  const explain = document.getElementById('bankExplain');
  const result = document.getElementById('bankResult');

  log('=== Running Banker\'s Algorithm ===', 'info');
  log(`Available: [${avail.join(', ')}]`, 'step');

  let found = true;
  while (seq.length < n && found) {
    found = false;
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      // Check if need[i] <= avail
      const canRun = need[i].every((v, j) => v <= avail[j]);
      if (canRun) {
        document.querySelectorAll('#bankTableBody tr').forEach((r,idx)=>r.className = idx===i?'active-row':'');
        explain.textContent = `P${i}: Need=[${need[i].join(',')}] ≤ Available=[${avail.join(',')}] → Can run!`;
        log(`P${i}: Need[${need[i].join(',')}] ≤ Available[${avail.join(',')}] → GRANTED. Running...`, 'step');
        await sleep(getSpeed() * 0.8);
        // Simulate completion: release resources
        for (let j = 0; j < m; j++) avail[j] += bankAlloc[i][j];
        done[i] = true;
        seq.push(i);
        document.querySelectorAll('#bankTableBody tr')[i].className = 'safe-row';
        log(`P${i} completes. Resources released. Available now: [${avail.join(', ')}]`, 'success');
        found = true;
        break;
      }
    }
  }

  const isSafe = seq.length === n;
  bankSafeSeq = seq;
  const seqStr = seq.map(i=>`P${i}`).join(' → ');
  result.innerHTML = isSafe
    ? `<div class="status-safe">✓ SAFE STATE — Safe Sequence: ${seqStr}</div>`
    : `<div class="status-unsafe">✗ UNSAFE STATE — No safe sequence exists! Deadlock possible!</div>`;
  explain.textContent = isSafe
    ? `System is in a SAFE state. Safe sequence: ${seqStr}. All processes can complete.`
    : `System is UNSAFE. No valid execution order found. Deadlock may occur!`;
  log(isSafe ? `SAFE STATE. Safe sequence: ${seqStr}` : 'UNSAFE STATE! No safe sequence!', isSafe?'success':'error');
}

function bankReset() { bankAlloc=[]; bankMax=[]; bankAvail=[]; bankNeed=[]; document.getElementById('bankTableBody').innerHTML=''; document.getElementById('bankResult').innerHTML=''; log('Banker reset.','warn'); }

// === D. DETECTION ===
function dlRenderDetection(ctrl, viz) {
  ctrl.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Setup</div>
      <div class="ctrl-row"><label>Procs:</label><input type="number" id="detP" value="4" min="2" max="6" style="width:40px;"></div>
      <div class="ctrl-row"><label>Resources:</label><input type="number" id="detR" value="2" min="1" max="4" style="width:40px;"></div>
    </div>
    <div class="ctrl-group">
      <div class="ctrl-label">Actions</div>
      <button class="btn btn-red" onclick="detLoadDeadlock()">Load Deadlock Scene</button><br>
      <button class="btn btn-blue" onclick="detRunDetection()">▶ Detect Deadlock</button><br>
      <button class="btn" onclick="detReset()">↺ Reset</button>
    </div>`;

  viz.innerHTML = `
    <div class="section-hdr">Deadlock Detection — Wait-For Graph & Cycle Detection</div>
    <canvas id="detCanvas" width="440" height="200" style="border:1px solid #808080;background:#f8f8f8;display:block;margin-top:6px;"></canvas>
    <div style="margin-top:8px;" id="detResult"></div>
    <div class="highlight-box" id="detExplain" style="margin-top:4px;">Load a deadlock scene and run detection to find cycles.</div>`;
  detDrawGraph([], []);
  log('Deadlock Detection module loaded.', 'info');
}

let detNodes = [], detEdges = [];
function detDrawGraph(nodes, edges, deadlockedNodes = []) {
  const canvas = document.getElementById('detCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height;
  const positions = {};
  const n = nodes.length;
  nodes.forEach((name, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    positions[name] = { x: W/2 + 160 * Math.cos(angle), y: H/2 + 80 * Math.sin(angle) };
  });

  // Edges
  edges.forEach(([from, to]) => {
    if (!positions[from] || !positions[to]) return;
    const isDeadlock = deadlockedNodes.includes(from) && deadlockedNodes.includes(to);
    ctx.beginPath();
    ctx.strokeStyle = isDeadlock ? '#cc0000' : '#555';
    ctx.lineWidth = isDeadlock ? 2.5 : 1.5;
    ctx.moveTo(positions[from].x, positions[from].y);
    ctx.lineTo(positions[to].x, positions[to].y);
    ctx.stroke();
    // Arrow
    const angle = Math.atan2(positions[to].y - positions[from].y, positions[to].x - positions[from].x);
    ctx.fillStyle = isDeadlock ? '#cc0000' : '#555';
    ctx.beginPath();
    ctx.moveTo(positions[to].x - 24*Math.cos(angle), positions[to].y - 24*Math.sin(angle));
    ctx.lineTo(positions[to].x - 36*Math.cos(angle-0.35), positions[to].y - 36*Math.sin(angle-0.35));
    ctx.lineTo(positions[to].x - 36*Math.cos(angle+0.35), positions[to].y - 36*Math.sin(angle+0.35));
    ctx.closePath(); ctx.fill();
  });

  // Nodes
  nodes.forEach(name => {
    const pos = positions[name];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 22, 0, Math.PI*2);
    ctx.fillStyle = deadlockedNodes.includes(name) ? '#ff4444' : '#d4e8ff';
    ctx.fill();
    ctx.strokeStyle = deadlockedNodes.includes(name) ? '#880000' : '#000080';
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, pos.x, pos.y);
  });

  if (deadlockedNodes.length > 0) {
    ctx.fillStyle = '#cc0000'; ctx.font = 'bold 11px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`DEADLOCK: ${deadlockedNodes.join(' → ')} → ${deadlockedNodes[0]}`, 8, H - 8);
  }
}

function detLoadDeadlock() {
  detNodes = ['P1','P2','P3','P4'];
  detEdges = [['P1','P2'],['P2','P3'],['P3','P1'],['P4','P2']]; // P1-P2-P3 cycle
  detDrawGraph(detNodes, detEdges);
  document.getElementById('detExplain').textContent = 'Wait-For graph loaded: P1→P2→P3→P1 (cycle) + P4→P2. Run detection!';
  log('Deadlock detection scene loaded. P1, P2, P3 form a cycle. P4 is not deadlocked.', 'info');
}

async function detRunDetection() {
  if (!detNodes.length) { detLoadDeadlock(); return; }
  const spd = getSpeed();
  const explain = document.getElementById('detExplain');
  const result = document.getElementById('detResult');
  log('Running cycle detection on Wait-For graph using DFS...', 'step');
  explain.textContent = 'Running DFS-based cycle detection on Wait-For graph...';
  await sleep(spd * 0.5);

  // Simple cycle detection via DFS
  const adj = {};
  detNodes.forEach(n => adj[n] = []);
  detEdges.forEach(([from, to]) => adj[from].push(to));

  const visited = {}, recStack = {}, cycleNodes = [];
  let cycleFound = false;

  function dfs(node, path) {
    visited[node] = true;
    recStack[node] = true;
    path.push(node);
    for (const neighbor of adj[node]) {
      if (!visited[neighbor]) { if (dfs(neighbor, path)) return true; }
      else if (recStack[neighbor]) {
        const cycleStart = path.indexOf(neighbor);
        path.slice(cycleStart).forEach(n => cycleNodes.push(n));
        return true;
      }
    }
    recStack[node] = false;
    path.pop();
    return false;
  }

  for (const node of detNodes) {
    if (!visited[node]) {
      if (dfs(node, [])) { cycleFound = true; break; }
    }
  }

  await sleep(spd * 0.5);
  if (cycleFound) {
    detDrawGraph(detNodes, detEdges, [...new Set(cycleNodes)]);
    result.innerHTML = `<div class="status-unsafe">⚠ DEADLOCK DETECTED! Cycle: ${[...new Set(cycleNodes)].join(' → ')} → ${cycleNodes[0]}</div>`;
    explain.textContent = `Deadlock found! Cycle involves: ${[...new Set(cycleNodes)].join(', ')}. Highlighted in red in the Wait-For Graph.`;
    log(`DEADLOCK DETECTED: Cycle = ${[...new Set(cycleNodes)].join(' → ')} → ${cycleNodes[0]}`, 'error');
  } else {
    result.innerHTML = `<div class="status-safe">✓ No Deadlock — No cycle in Wait-For graph.</div>`;
    log('No cycle found. System is deadlock-free.', 'success');
  }
}

function detReset() { detNodes = []; detEdges = []; detDrawGraph([], []); document.getElementById('detResult').innerHTML=''; document.getElementById('detExplain').textContent='Load a scene and run detection.'; log('Detection reset.','warn'); }

// === E. RECOVERY ===
let recoveryProcs = [{id:'P1',res:'R1,R2',state:'deadlocked'},{id:'P2',res:'R2,R3',state:'deadlocked'},{id:'P3',res:'R3,R1',state:'deadlocked'},{id:'P4',res:'R1',state:'waiting'}];

function dlRenderRecovery(ctrl, viz) {
  ctrl.innerHTML = `
    <div class="ctrl-group">
      <div class="ctrl-label">Recovery Methods</div>
      <button class="btn btn-red" onclick="recoverKill()">🔪 Kill Process</button><br>
      <button class="btn btn-blue" onclick="recoverPreempt()">⚡ Preempt Resource</button><br>
      <button class="btn btn-green" onclick="recoverRollback()">↩ Rollback</button><br>
      <button class="btn" onclick="recoverReset()">↺ Reset</button>
    </div>`;

  viz.innerHTML = `
    <div class="section-hdr">Deadlock Recovery Strategies</div>
    <div style="margin:6px 0;display:flex;gap:10px;flex-wrap:wrap;">
      ${recoveryProcs.map((p,i) => `
        <div class="process-box ${p.state==='deadlocked'?'blocked':p.state==='recovered'?'done':''}" id="recProc${i}" style="min-width:90px;cursor:pointer;" onclick="recSelectProc(${i})" data-tip="Click to select for kill/preemption">
          <b>${p.id}</b>
          <div class="process-label">Holds: ${p.res}</div>
          <div class="process-label">${p.state.toUpperCase()}</div>
        </div>`).join('')}
    </div>
    <div style="margin-top:8px;">
      <div class="section-hdr">Selected Process</div>
      <div class="inset-box" id="recSelected">None selected. Click a process.</div>
    </div>
    <div style="margin-top:8px;" class="highlight-box" id="recExplain">Three recovery strategies available. Select a process and apply recovery.</div>
    <div style="margin-top:8px;">
      <div class="section-hdr">Recovery Methods Explained</div>
      <div style="font-size:10px;line-height:1.6;color:#333;padding:4px;">
        <b>Kill Process:</b> Terminate one or all deadlocked processes. Simple but costly — work is lost.<br>
        <b>Preempt Resource:</b> OS forcibly takes resources from a process, assigns to another. Process must wait.<br>
        <b>Rollback:</b> Roll process back to a safe checkpoint and restart from there. Requires checkpointing.
      </div>
    </div>`;
  log('Deadlock Recovery module loaded.', 'info');
}

let recSelected = -1;
function recSelectProc(i) {
  recSelected = i;
  const p = recoveryProcs[i];
  document.getElementById('recSelected').textContent = `Selected: ${p.id} | Holds: ${p.res} | State: ${p.state}`;
  document.querySelectorAll('[id^="recProc"]').forEach((el,idx) => el.style.outline = idx===i?'3px solid #000080':'');
}

function recoverKill() {
  if (recSelected < 0) { log('Select a process first!', 'warn'); return; }
  const p = recoveryProcs[recSelected];
  if (p.state === 'recovered') { log(`${p.id} already recovered.`, 'warn'); return; }
  p.state = 'recovered';
  document.getElementById('recSelected').textContent = `${p.id} KILLED. Resources ${p.res} released back to system.`;
  document.getElementById('recExplain').textContent = `${p.id} terminated. All its resources (${p.res}) released. Other processes may now proceed.`;
  log(`RECOVERY: ${p.id} killed. Resources ${p.res} released. Deadlock broken if no circular wait remains.`, 'success');
  dlRenderSubTab();
  recSelected = -1;
}

function recoverPreempt() {
  if (recSelected < 0) { log('Select a process first!', 'warn'); return; }
  const p = recoveryProcs[recSelected];
  p.state = 'waiting';
  document.getElementById('recSelected').textContent = `${p.id}: Resources ${p.res} PREEMPTED by OS. Process waits.`;
  document.getElementById('recExplain').textContent = `OS preempted ${p.res} from ${p.id}. Process put in waiting state. Resources given to blocked processes.`;
  log(`RECOVERY: OS preempts ${p.res} from ${p.id}. Resources redistributed.`, 'success');
  dlRenderSubTab(); recSelected = -1;
}

function recoverRollback() {
  if (recSelected < 0) { log('Select a process first!', 'warn'); return; }
  const p = recoveryProcs[recSelected];
  p.state = 'waiting';
  document.getElementById('recExplain').textContent = `${p.id} rolled back to last checkpoint. Resources released. Will restart from safe state.`;
  log(`RECOVERY: ${p.id} rolled back to checkpoint. Resources ${p.res} released and process restarted from safe state.`, 'success');
  dlRenderSubTab(); recSelected = -1;
}

function recoverReset() {
  recoveryProcs = [{id:'P1',res:'R1,R2',state:'deadlocked'},{id:'P2',res:'R2,R3',state:'deadlocked'},{id:'P3',res:'R3,R1',state:'deadlocked'},{id:'P4',res:'R1',state:'waiting'}];
  recSelected = -1;
  dlRenderSubTab();
  log('Recovery module reset.', 'warn');
}

// ============================================================
// INIT
// ============================================================
window.onload = () => {
  renderTab('ipc');
  log('=== OS Module 3 Simulator Ready ===', 'success');
  log('Topics: IPC | Race Condition | Critical Section | Peterson\'s | Semaphores | Producer-Consumer | Deadlocks', 'info');
};
