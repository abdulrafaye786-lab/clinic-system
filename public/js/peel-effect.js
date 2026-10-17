// ==========================================================================
// 3D PEEL EFFECT ENGINE (WebGL 2 Sheet Curl, Specular Shine & Shadow Shader)
// Exactly matching the reference Peel component (Top Content peels to reveal Sidebar under)
// ==========================================================================

(function (global) {
  'use strict';

  const DEFAULTS = {
    side: "left",
    mode: "cursor",
    reveal: 280,
    zone: 220,
    curl: 340,
    bow: 80,
    shade: 0.32,
    shine: 1,
    shineDistance: 1200,
    shineColor: "auto",
    bulge: 60,
    perspective: 2000,
    smoothing: 0.25
  };

  const SIDE_INDEX = {
    left: 0,
    right: 1,
    top: 2,
    bottom: 3
  };

  const SHEET_VERT = `#version 300 es
  precision highp float;
  layout(location = 0) in vec2 aGrid;
  uniform vec2 uRes;
  uniform float uSide;
  uniform float uPeel;
  uniform float uReveal;
  uniform float uCurl;
  uniform float uBow;
  uniform float uFocal;
  uniform float uZone;
  uniform float uBulge;
  uniform vec2 uPointer;
  out vec2 vUv;
  out float vShade;
  out vec2 vSide;

  const float PI = 3.14159265359;

  void main () {
    vUv = aGrid;
    vec2 p = aGrid * uRes;
    float crossLen = (uSide < 1.5) ? uRes.y : uRes.x;
    float u; float v;
    if (uSide < 0.5) { u = p.x; v = p.y; }
    else if (uSide < 1.5) { u = uRes.x - p.x; v = p.y; }
    else if (uSide < 2.5) { u = p.y; v = p.x; }
    else { u = uRes.y - p.y; v = p.x; }

    float A = clamp(uPeel, 0.0, 1.0);
    float f = A * uReveal;
    float R = max(uCurl * A, 0.001);
    float c0 = f + R;

    float dvB = (uPointer.y - v) / max(crossLen * 0.28, 1.0);
    float prox = clamp(1.0 - uPointer.x / max(c0 + uZone, 1.0), 0.0, 1.0);
    float c = c0 + uBulge * A * prox * prox * exp(-dvB * dvB);

    float x = u;
    float z = 0.0;
    float sh = 0.0;
    if (A > 0.001 && u < c) {
      float theta = (c - u) / R;
      if (theta <= PI) {
        x = c - R * sin(theta);
        z = R * (1.0 - cos(theta));
      } else {
        x = c + (theta - PI) * R;
        z = 2.0 * R;
      }
      sh = sin(clamp(theta, 0.0, PI));
    }
    z += uBow * A * sin(PI * v / max(crossLen, 1.0)) * clamp(z / max(R, 1.0), 0.0, 1.5);
    z = clamp(z, -uFocal * 0.2, uFocal * 0.45);
    vShade = sh * smoothstep(0.0, 0.08, A);
    vSide = vec2(u, v);

    vec2 q;
    if (uSide < 0.5) q = vec2(x, v);
    else if (uSide < 1.5) q = vec2(uRes.x - x, v);
    else if (uSide < 2.5) q = vec2(v, x);
    else q = vec2(v, uRes.y - x);

    vec2 ndc = (q / uRes) * 2.0 - 1.0;
    ndc.y = -ndc.y;
    float w = (uFocal - z) / uFocal;
    gl_Position = vec4(ndc, -z / uFocal, w);
  }`;

  const SHEET_FRAG = `#version 300 es
  precision highp float;
  in vec2 vUv;
  in float vShade;
  in vec2 vSide;
  out vec4 outColor;
  uniform sampler2D uContent;
  uniform float uShade;
  uniform float uMaxX;
  uniform float uShine;
  uniform vec3 uShineColor;
  uniform float uCross;
  uniform float uSpan;
  uniform vec2 uPointer;

  void main () {
    vec2 uv = clamp(vUv, vec2(0.001), vec2(uMaxX - 0.001, 0.999));
    vec4 tex = texture(uContent, uv);
    float sh = 1.0 - clamp(uShade, 0.0, 1.0) * 0.7 * pow(max(vShade, 0.0), 1.3);
    float du = max(vSide.x, 0.0);
    float line = exp(-du / 2.5) + exp(-du / 18.0) * 0.25;
    float dv = (vSide.y - uPointer.y) / max(uCross * 0.45, 1.0);
    float prox = clamp(1.0 - uPointer.x / max(uSpan, 1.0), 0.0, 1.0);
    float shine = uShine * line * exp(-dv * dv) * prox * prox;
    vec3 rgb = mix(tex.rgb * sh, uShineColor, clamp(shine, 0.0, 1.0));
    outColor = vec4(rgb * tex.a, tex.a);
  }`;

  const SEG = 96;

  function getCanvasPixelRatio(element, context) {
    const scale = window.visualViewport?.scale || 1;
    const requested = Math.min(window.devicePixelRatio || 1, 2) * scale;
    const width = Math.max(element.clientWidth, 1);
    const height = Math.max(element.clientHeight, 1);
    return Math.min(
      requested,
      8192 / Math.max(width, height),
      Math.sqrt(16777216 / (width * height))
    );
  }

  function createCanvasResizeObserver(onResize) {
    const viewport = window.visualViewport;
    let frame = 0;
    let disconnected = false;
    const schedule = () => {
      if (frame || disconnected) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        onResize();
      });
    };
    const observer = new ResizeObserver(schedule);
    window.addEventListener("resize", schedule, { passive: true });
    viewport?.addEventListener("resize", schedule, { passive: true });
    return {
      observe(element, options) { observer.observe(element, options); },
      unobserve(element) { observer.unobserve(element); },
      disconnect() {
        disconnected = true;
        observer.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", schedule);
        viewport?.removeEventListener("resize", schedule);
      }
    };
  }

  function createRectCache(element) {
    let current = element.getBoundingClientRect();
    const refresh = () => { current = element.getBoundingClientRect(); };
    const observer = new ResizeObserver(refresh);
    observer.observe(element);
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("scroll", refresh, { capture: true, passive: true });
    return {
      get current() { return current; },
      destroy() {
        observer.disconnect();
        window.removeEventListener("resize", refresh);
        window.removeEventListener("scroll", refresh, true);
      }
    };
  }

  function supportsHtmlInCanvas() {
    if (typeof document === "undefined") return false;
    const probe = document.createElement("canvas");
    const ctx = probe.getContext("2d");
    return Boolean(
      ctx &&
      typeof ctx.drawElementImage === "function" &&
      typeof probe.requestPaint === "function"
    );
  }

  function prepareHtmlInCanvas(source, content) {
    if ("content" in source) {
      source.setAttribute("content", "drawable");
      content.setAttribute("drawable", "");
    } else {
      source.setAttribute("layoutsubtree", "");
    }
  }

  function drawHtmlInCanvas(source, context, content) {
    const transform = context.drawElementImage(content, 0, 0);
    if (transform && typeof source.updateElementGeometry === "function") {
      source.updateElementGeometry(content, { canvasTransform: transform });
    }
  }

  function createPeel(elements, options) {
    const config = Object.assign({}, DEFAULTS, options);
    const { source, content, output, under } = elements;

    const gl = output.getContext("webgl2", {
      alpha: true,
      depth: true,
      stencil: false,
      antialias: true,
      premultipliedAlpha: true
    });
    if (!gl || gl.isContextLost()) return null;

    const sourceCtx = source.getContext("2d");
    const htmlInCanvas = Boolean(
      sourceCtx &&
      typeof sourceCtx.drawElementImage === "function" &&
      typeof source.requestPaint === "function"
    );

    if (htmlInCanvas) prepareHtmlInCanvas(source, content);

    let wake = () => {};
    let capture = () => {};

    if (htmlInCanvas) {
      source.onpaint = () => capture();
    }

    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Peel shader compilation error:", gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    function link(vertText, fragText) {
      const vert = compile(gl.VERTEX_SHADER, vertText);
      const frag = compile(gl.FRAGMENT_SHADER, fragText);
      const program = gl.createProgram();
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const info = gl.getActiveUniform(program, i);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
      }
      return { program, vert, frag, uniforms };
    }

    const sheet = link(SHEET_VERT, SHEET_FRAG);

    const gridVerts = new Float32Array((SEG + 1) * (SEG + 1) * 2);
    for (let y = 0; y <= SEG; y++) {
      for (let x = 0; x <= SEG; x++) {
        const i = (y * (SEG + 1) + x) * 2;
        gridVerts[i] = x / SEG;
        gridVerts[i + 1] = y / SEG;
      }
    }
    const gridIndices = new Uint32Array(SEG * SEG * 6);
    let offset = 0;
    for (let y = 0; y < SEG; y++) {
      for (let x = 0; x < SEG; x++) {
        const a = y * (SEG + 1) + x;
        const b = a + 1;
        const c = a + SEG + 1;
        const d = c + 1;
        gridIndices[offset++] = a;
        gridIndices[offset++] = c;
        gridIndices[offset++] = b;
        gridIndices[offset++] = b;
        gridIndices[offset++] = c;
        gridIndices[offset++] = d;
      }
    }

    const sheetVao = gl.createVertexArray();
    gl.bindVertexArray(sheetVao);
    const gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, gridVerts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, gridIndices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    const contentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, contentTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([248, 250, 252, 255])
    );

    let contentMaxX = 1;
    let hasTexture = false;

    if (under && htmlInCanvas) under.style.visibility = "hidden";

    // Canvas snapshot capture helper for main content sheet (Fallback when htmlInCanvas is false)
    function drawFallbackSnapshot() {
      if (!content || !sourceCtx) return;
      const w = source.width || window.innerWidth;
      const h = source.height || window.innerHeight;
      sourceCtx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      sourceCtx.fillStyle = isDark ? '#0b0f19' : '#f8fafc';
      sourceCtx.fillRect(0, 0, w, h);

      // Header Bar
      sourceCtx.fillStyle = isDark ? '#111827' : '#ffffff';
      sourceCtx.fillRect(0, 0, w, 68);
      sourceCtx.fillStyle = isDark ? '#334155' : '#e2e8f0';
      sourceCtx.fillRect(0, 67, w, 1);

      sourceCtx.fillStyle = isDark ? '#ffffff' : '#0f172a';
      sourceCtx.font = 'bold 20px sans-serif';
      const pageTitle = document.getElementById('page-title') ? document.getElementById('page-title').textContent : 'Clinical Portal Overview';
      sourceCtx.fillText(pageTitle, 32, 42);

      // Dashboard card preview blocks
      const cardBg = isDark ? '#1e293b' : '#ffffff';
      const kpiW = Math.min(220, (w - 80) / 4);
      for (let i = 0; i < 4; i++) {
        const x = 32 + i * (kpiW + 14);
        sourceCtx.fillStyle = cardBg;
        sourceCtx.beginPath();
        sourceCtx.roundRect(x, 88, kpiW, 90, 10);
        sourceCtx.fill();
        sourceCtx.fillStyle = '#05b555';
        sourceCtx.font = 'bold 20px sans-serif';
        sourceCtx.fillText(i === 0 ? '18 Bookings' : (i === 1 ? '3 Waiting' : (i === 2 ? 'Rs. 45,000' : '142 Patients')), x + 14, 138);
      }

      // Main content card
      sourceCtx.fillStyle = cardBg;
      sourceCtx.beginPath();
      sourceCtx.roundRect(32, 196, w - 64, h - 216, 12);
      sourceCtx.fill();

      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      hasTexture = true;
      wake();
    }

    capture = () => {
      if (htmlInCanvas) {
        try {
          sourceCtx.reset();
          drawHtmlInCanvas(source, sourceCtx, content);
          gl.bindTexture(gl.TEXTURE_2D, contentTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
          sourceCtx.reset();
          hasTexture = true;
          wake();
        } catch (e) {
          drawFallbackSnapshot();
        }
      } else {
        drawFallbackSnapshot();
      }
    };

    function syncCanvasSize() {
      const dpr = getCanvasPixelRatio(output, gl);
      const width = Math.max(1, Math.round(output.clientWidth * dpr));
      const height = Math.max(1, Math.round(output.clientHeight * dpr));
      if (output.width !== width || output.height !== height) {
        output.width = width;
        output.height = height;
      }
      contentMaxX = Math.min(
        1,
        Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1))
      );
      const sourceWidth = Math.max(1, Math.round((source.clientWidth || content.clientWidth || window.innerWidth) * dpr));
      const sourceHeight = Math.max(1, Math.round((source.clientHeight || content.clientHeight || window.innerHeight) * dpr));
      if (source.width !== sourceWidth || source.height !== sourceHeight) {
        source.width = sourceWidth;
        source.height = sourceHeight;
      }
      if (htmlInCanvas && typeof source.requestPaint === "function") {
        source.requestPaint();
      } else {
        capture();
      }
    }

    const peel = { a: 0, target: 0 };
    const FAR = 1e4;
    const pointer = { u: FAR, v: 0, su: FAR, sv: 0 };
    let shineRgb = [1, 1, 1];

    function syncShineColor() {
      if (config.shineColor !== "auto") {
        shineRgb = config.shineColor;
        return;
      }
      shineRgb = [1, 1, 1];
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;

    syncCanvasSize();
    syncShineColor();
    capture();

    function render() {
      if (under && hasTexture && under.style.visibility === "hidden") {
        under.style.visibility = "";
      }
      const w = Math.max(output.clientWidth, 1);
      const h = Math.max(output.clientHeight, 1);
      const side = SIDE_INDEX[config.side] ?? 0;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, output.width, output.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.useProgram(sheet.program);
      gl.bindVertexArray(sheetVao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, contentTexture);
      gl.uniform1i(sheet.uniforms.uContent, 0);
      gl.uniform2f(sheet.uniforms.uRes, w, h);
      gl.uniform1f(sheet.uniforms.uSide, side);
      gl.uniform1f(sheet.uniforms.uPeel, peel.a);
      gl.uniform1f(sheet.uniforms.uReveal, Math.max(config.reveal, 0));
      gl.uniform1f(sheet.uniforms.uCurl, Math.max(config.curl, 1));
      gl.uniform1f(sheet.uniforms.uBow, config.bow);
      gl.uniform1f(sheet.uniforms.uFocal, Math.max(config.perspective, 200));
      gl.uniform1f(sheet.uniforms.uShade, config.shade);
      gl.uniform1f(sheet.uniforms.uZone, Math.max(config.zone, 1));
      gl.uniform1f(sheet.uniforms.uBulge, Math.max(config.bulge, 0));
      gl.uniform1f(sheet.uniforms.uShine, Math.max(config.shine, 0));
      gl.uniform3f(sheet.uniforms.uShineColor, shineRgb[0], shineRgb[1], shineRgb[2]);
      gl.uniform1f(sheet.uniforms.uCross, side < 1.5 ? h : w);
      gl.uniform1f(sheet.uniforms.uSpan, config.shineDistance > 0 ? config.shineDistance : (side < 1.5 ? w : h));
      gl.uniform2f(sheet.uniforms.uPointer, pointer.su, pointer.sv);
      gl.uniform1f(sheet.uniforms.uMaxX, contentMaxX);
      gl.drawElements(gl.TRIANGLES, gridIndices.length, gl.UNSIGNED_INT, 0);
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
    }

    function syncContentEvents() {
      const A = peel.a;
      const R = Math.max(config.curl * A, 0.001);
      const c = A * config.reveal + R + Math.max(config.bulge, 0) * A;
      const tailEnd = Math.max(c, 2 * c - Math.PI * R);
      const blocked = A > 0.02 && pointer.u < tailEnd;
      const next = blocked ? "none" : "auto";
      if (content.style.pointerEvents !== next) {
        content.style.pointerEvents = next;
      }
    }

    let raf = 0;
    let lastTime = performance.now();
    let destroyed = false;
    let running = false;
    let visible = true;

    function updateTarget() {
      if (config.mode === "hover") {
        const open = peel.target > 0.5;
        const limit = open ? peel.a * config.reveal + config.zone : config.zone;
        peel.target = pointer.u < limit ? 1 : 0;
        return;
      }
      const span = Math.max(config.zone + peel.a * config.reveal, 1);
      peel.target = Math.min(1, Math.max(0, 1 - pointer.u / span));
    }

    function frame(now) {
      if (destroyed) return;
      if (!visible) {
        running = false;
        return;
      }
      const delta = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;
      const tau = Math.max(config.smoothing, 1e-4);
      const k = reducedMotion ? 1 : 1 - Math.exp(-delta / tau);
      const kp = reducedMotion ? 1 : 1 - Math.exp(-delta / (tau * 0.45));
      pointer.su += (pointer.u - pointer.su) * kp;
      pointer.sv += (pointer.v - pointer.sv) * kp;
      updateTarget();
      peel.a += (peel.target - peel.a) * k;
      syncContentEvents();
      render();
      const settle = 0.5 / Math.max(config.reveal + config.curl, 1);
      if (
        Math.abs(peel.target - peel.a) < settle &&
        Math.abs(pointer.u - pointer.su) < 0.5 &&
        Math.abs(pointer.v - pointer.sv) < 0.5
      ) {
        peel.a = peel.target;
        pointer.su = pointer.u;
        pointer.sv = pointer.v;
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (destroyed || running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }

    wake = start;
    start();

    const observer = createCanvasResizeObserver(() => {
      syncCanvasSize();
      start();
    });
    observer.observe(output);
    observer.observe(content);

    const intersection = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1]?.isIntersecting ?? true;
      if (visible) start();
    });
    intersection.observe(output);

    const listenTarget = output.parentElement ?? output;

    function sideDistance(x, y, rect) {
      if (config.side === "right") return rect.width - x;
      if (config.side === "top") return y;
      if (config.side === "bottom") return rect.height - y;
      return x;
    }

    const rectCache = createRectCache(output);

    function onPointerMove(event) {
      const rect = rectCache.current;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      pointer.u = sideDistance(x, y, rect);
      pointer.v = config.side === "top" || config.side === "bottom" ? x : y;
      updateTarget();
      start();
    }

    function onPointerLeave() {
      pointer.u = FAR;
      peel.target = 0;
      start();
    }

    listenTarget.addEventListener("pointermove", onPointerMove, { passive: true });
    listenTarget.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return {
      setOptions(next) {
        Object.assign(config, next);
        syncShineColor();
        start();
      },
      resize() {
        syncCanvasSize();
        start();
      },
      destroy() {
        destroyed = true;
        rectCache.destroy();
        cancelAnimationFrame(raf);
        observer.disconnect();
        intersection.disconnect();
        listenTarget.removeEventListener("pointermove", onPointerMove);
        listenTarget.removeEventListener("pointerleave", onPointerLeave);
        content.style.pointerEvents = "";
        if (under) under.style.visibility = "";
        gl.deleteTexture(contentTexture);
        gl.deleteProgram(sheet.program);
        gl.deleteShader(sheet.vert);
        gl.deleteShader(sheet.frag);
        gl.deleteBuffer(gridBuffer);
        gl.deleteBuffer(indexBuffer);
        gl.deleteVertexArray(sheetVao);
        if (htmlInCanvas) source.onpaint = null;
      }
    };
  }

  // Exact Layout Attach Helper matching the reference component:
  // Main Content sheet sits on top (`content`), Left Sidebar sits underneath (`under`)
  function initPeelNavigation(mainContentEl, sidebarEl, options) {
    if (!mainContentEl || !sidebarEl) return null;

    let peelWrapper = document.getElementById('peel-outer-wrapper');
    if (peelWrapper) {
      peelWrapper.remove();
    }

    // Wrap into peel container
    peelWrapper = document.createElement('div');
    peelWrapper.id = 'peel-outer-wrapper';
    peelWrapper.style.cssText = 'position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #0f172a;';

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.id = 'peel-source-canvas';
    sourceCanvas.setAttribute('layoutsubtree', '');
    sourceCanvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; display: none;';

    const outputCanvas = document.createElement('canvas');
    outputCanvas.id = 'peel-output-canvas';
    outputCanvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 100;';

    const appContainer = document.getElementById('app-container');
    if (!appContainer) return null;

    // Apply peel layout classes
    appContainer.classList.add('peel-mode-active');
    sidebarEl.classList.add('peel-under-sidebar');
    mainContentEl.classList.add('peel-top-content');

    // Make sure sidebar is under mainContent in DOM
    appContainer.appendChild(sourceCanvas);
    appContainer.appendChild(outputCanvas);

    return createPeel({
      source: sourceCanvas,
      content: mainContentEl,
      output: outputCanvas,
      under: sidebarEl
    }, options || {
      side: 'left',
      mode: 'cursor',
      reveal: 280,
      zone: 220,
      curl: 340,
      bow: 80,
      shade: 0.32,
      shine: 1,
      bulge: 60,
      perspective: 2000,
      smoothing: 0.25
    });
  }

  global.PeelEffect = {
    createPeel,
    supportsHtmlInCanvas,
    initPeelNavigation
  };

})(typeof window !== 'undefined' ? window : this);
