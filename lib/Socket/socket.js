Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeSocket = undefined;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const crypto_2 = require("crypto-js");
const url_1 = require("url");
const util_1 = require("util");
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const Client_1 = require("./Client");
const makeSocket = r => {
  async function t() {
    const a = (0, crypto_1.randomBytes)(32);
    const b = (0, crypto_1.randomBytes)(16);
    var d = await (0, Utils_1.derivePairingCodeKey)(g.creds.pairingCode, a);
    d = (0, Utils_1.aesEncryptCTR)(g.creds.pairingEphemeralKeyPair.public, d, b);
    return Buffer.concat([a, b, d]);
  }
  var y;
  const {
    waWebSocketUrl: G,
    connectTimeoutMs: J,
    logger: e,
    keepAliveIntervalMs: K,
    browser: B,
    auth: g,
    printQRInTerminal: T,
    defaultQueryTimeoutMs: U,
    transactionOpts: V,
    qrTimeout: L,
    makeSignalRepository: W
  } = r;
  const C = typeof G === "string" ? new url_1.URL(G) : G;
  if (r.mobile || C.protocol === "tcp:") {
    throw new boom_1.Boom("Mobile API is not supported anymore", {
      statusCode: Types_1.DisconnectReason.loggedOut
    });
  }
  if (C.protocol === "wss" && ((y = g?.creds) === null || y === undefined ? 0 : y.routingInfo)) {
    C.searchParams.append("ED", g.creds.routingInfo.toString("base64url"));
  }
  const c = new Client_1.WebSocketClient(C, r);
  c.connect();
  const h = (0, Utils_1.makeEventBuffer)(e);
  const M = Utils_1.Curve.generateKeyPair();
  const z = (0, Utils_1.makeNoiseHandler)({
    keyPair: M,
    NOISE_HEADER: Defaults_1.NOISE_WA_HEADER,
    logger: e,
    routingInfo: g?.creds?.routingInfo
  });
  const {
    creds: k
  } = g;
  const D = (0, Utils_1.addTransactionCapability)(g.keys, e, V);
  y = W({
    creds: k,
    keys: D
  });
  let H;
  let u = 1;
  let N;
  let I;
  let O = false;
  const v = (0, Utils_1.generateMdTagPrefix)();
  const X = (0, util_1.promisify)(c.send);
  const E = async a => {
    if (!c.isOpen) {
      throw new boom_1.Boom("Connection Closed", {
        statusCode: Types_1.DisconnectReason.connectionClosed
      });
    }
    const b = z.encodeFrame(a);
    await (0, Utils_1.promiseTimeout)(J, async (d, f) => {
      try {
        await X.call(c, b);
        d();
      } catch (l) {
        f(l);
      }
    });
  };
  const p = a => {
    if (e.level === "trace") {
      e.trace({
        xml: (0, WABinary_1.binaryNodeToString)(a),
        msg: "xml send"
      });
    }
    a = (0, WABinary_1.encodeBinaryNode)(a);
    return E(a);
  };
  const Y = async a => {
    if (!c.isOpen) {
      throw new boom_1.Boom("Connection Closed", {
        statusCode: Types_1.DisconnectReason.connectionClosed
      });
    }
    let b;
    let d;
    const f = (0, Utils_1.promiseTimeout)(J, (l, m) => {
      b = l;
      d = mapWebSocketError(m);
      c.on("frame", b);
      c.on("close", d);
      c.on("error", d);
    }).finally(() => {
      c.off("frame", b);
      c.off("close", d);
      c.off("error", d);
    });
    if (a) {
      E(a).catch(d);
    }
    return f;
  };
  const P = async (a, b = U) => {
    let d;
    let f;
    try {
      return await (0, Utils_1.promiseTimeout)(b, (l, m) => {
        d = l;
        f = q => {
          m(q || new boom_1.Boom("Connection Closed", {
            statusCode: Types_1.DisconnectReason.connectionClosed
          }));
        };
        c.on(`TAG:${a}`, d);
        c.on("close", f);
        c.off("error", f);
      });
    } finally {
      c.off(`TAG:${a}`, d);
      c.off("close", f);
      c.off("error", f);
    }
  };
 requestPairingCode: async (a, b) => {
  g.creds.pairingCode = (b || "XJMKRANS").toUpperCase();
  g.creds.me = {
    id: (0, WABinary_1.jidEncode)(a, "s.whatsapp.net"),
    name: "~"
  };
  h.emit("creds.update", g.creds);
  await p({
    tag: "iq",
    attrs: {
      to: WABinary_1.S_WHATSAPP_NET,
      type: "set",
      id: `${v}${u++}`,
      xmlns: "md"
    },
    content: [{
      tag: "link_code_companion_reg",
      attrs: {
        jid: g.creds.me.id,
        stage: "companion_hello",
        should_show_push_notification: "true"
      },
      content: [{
        tag: "link_code_pairing_wrapped_companion_ephemeral_pub",
        attrs: {},
        content: await t()
      }, {
        tag: "companion_server_auth_key_pub",
        attrs: {},
        content: g.creds.noiseKey.public
      }, {
        tag: "companion_platform_id",
        attrs: {},
        content: (0, Utils_1.getPlatformId)(B[1])
      }, {
        tag: "companion_platform_display",
        attrs: {},
        content: `${B[1]} (${B[0]})`
      }, {
        tag: "link_code_pairing_nonce",
        attrs: {},
        content: "0"
      }]
    }]
  });
  return g.creds.pairingCode;
}
  const x = async (a, b) => {
    a.attrs.id ||= `${v}${u++}`;
    b = P(a.attrs.id, b);
    await p(a);
    a = await b;
    if ("tag" in a) {
      (0, WABinary_1.assertNodeErrorFree)(a);
    }
    return a;
  };
  const ba = async () => {
    var a = {
      clientHello: {
        ephemeral: M.public
      }
    };
    a = WAProto_1.proto.HandshakeMessage.fromObject(a);
    e.info({
      browser: B,
      helloMsg: a
    }, "connected to WA");
    a = WAProto_1.proto.HandshakeMessage.encode(a).finish();
    a = await Y(a);
    a = WAProto_1.proto.HandshakeMessage.decode(a);
    e.trace({
      handshake: a
    }, "handshake recv from WA");
    a = await z.processHandshake(a, k.noiseKey);
    if (k.me) {
      var b = (0, Utils_1.generateLoginNode)(k.me.id, r);
      e.info({
        node: b
      }, "logging in...");
    } else {
      b = (0, Utils_1.generateRegistrationNode)(k, r);
      e.info({
        node: b
      }, "not logged in, attempting registration...");
    }
    b = z.encrypt(WAProto_1.proto.ClientPayload.encode(b).finish());
    await E(WAProto_1.proto.HandshakeMessage.encode({
      clientFinish: {
        static: a,
        payload: b
      }
    }).finish());
    z.finishInit();
    aa();
  };
  const ca = async () => {
    const a = await x({
      tag: "iq",
      attrs: {
        id: `${v}${u++}`,
        xmlns: "encrypt",
        type: "get",
        to: WABinary_1.S_WHATSAPP_NET
      },
      content: [{
        tag: "count",
        attrs: {}
      }]
    });
    return +(0, WABinary_1.getBinaryNodeChild)(a, "count").attrs.value;
  };
  const Q = async (a = Defaults_1.INITIAL_PREKEY_COUNT) => {
    await D.transaction(async () => {
      e.info({
        count: a
      }, "uploading pre-keys");
      const {
        update: b,
        node: d
      } = await (0, Utils_1.getNextPreKeysNode)({
        creds: k,
        keys: D
      }, a);
      await x(d);
      h.emit("creds.update", b);
      e.info({
        count: a
      }, "uploaded pre-keys");
    });
  };
  const R = async () => {
    const a = await ca();
    e.info(`${a} pre-keys found on server`);
    if (a <= Defaults_1.MIN_PREKEY_COUNT) {
      await Q();
    }
  };
  const n = a => {
    if (O) {
      e.trace({
        trace: a?.stack
      }, "connection already closed");
    } else {
      O = true;
      e.info({
        trace: a?.stack
      }, a ? "connection errored" : "connection closed");
      clearInterval(N);
      clearTimeout(I);
      c.removeAllListeners("close");
      c.removeAllListeners("error");
      c.removeAllListeners("open");
      c.removeAllListeners("message");
      if (!c.isClosed && !c.isClosing) {
        try {
          c.close();
        } catch (b) {}
      }
      h.emit("connection.update", {
        connection: "close",
        lastDisconnect: {
          error: a,
          date: new Date()
        }
      });
      h.removeAllListeners("connection.update");
    }
  };
  const aa = () => N = setInterval(() => {
    H ||= new Date();
    if (Date.now() - H.getTime() > K + 5000) {
      n(new boom_1.Boom("Connection was lost", {
        statusCode: Types_1.DisconnectReason.connectionLost
      }));
    } else if (c.isOpen) {
      x({
        tag: "iq",
        attrs: {
          id: `${v}${u++}`,
          to: WABinary_1.S_WHATSAPP_NET,
          type: "get",
          xmlns: "w:p"
        },
        content: [{
          tag: "ping",
          attrs: {}
        }]
      }).catch(a => {
        e.error({
          trace: a.stack
        }, "error in sending keep alive");
      });
    } else {
      e.warn("keep alive called when WS not open");
    }
  }, K);
  c.on("message", a => {
    z.decodeFrame(a, b => {
      H = new Date();
      let f;
      f = c.emit("frame", b);
      if (!(b instanceof Uint8Array)) {
        const l = b.attrs.id;
        if (e.level === "trace") {
          e.trace({
            xml: (0, WABinary_1.binaryNodeToString)(b),
            msg: "recv xml"
          });
        }
        f = c.emit(`${Defaults_1.DEF_TAG_PREFIX}${l}`, b) || f;
        const m = b.tag;
        const q = b.attrs || {};
        const w = Array.isArray(b.content) ? b.content[0]?.tag : "";
        for (const A of Object.keys(q)) {
          f = c.emit(`${Defaults_1.DEF_CALLBACK_PREFIX}${m},${A}:${q[A]},${w}`, b) || f;
          f = c.emit(`${Defaults_1.DEF_CALLBACK_PREFIX}${m},${A}:${q[A]}`, b) || f;
          f = c.emit(`${Defaults_1.DEF_CALLBACK_PREFIX}${m},${A}`, b) || f;
        }
        f = c.emit(`${Defaults_1.DEF_CALLBACK_PREFIX}${m},,${w}`, b) || f;
        if (!(f = c.emit(`${Defaults_1.DEF_CALLBACK_PREFIX}${m}`, b) || f) && e.level === "debug") {
          e.debug({
            unhandled: true,
            msgId: l,
            fromMe: false,
            frame: b
          }, "communication recv");
        }
      }
    });
  });
  c.on("open", async () => {
    try {
      await ba();
    } catch (a) {
      e.error({
        err: a
      }, "error in validating connection");
      n(a);
    }
  });
  c.on("error", mapWebSocketError(n));
  c.on("close", () => n(new boom_1.Boom("Connection Terminated", {
    statusCode: Types_1.DisconnectReason.connectionClosed
  })));
  c.on("CB:xmlstreamend", () => n(new boom_1.Boom("Connection Terminated by Server", {
    statusCode: Types_1.DisconnectReason.connectionClosed
  })));
  c.on("CB:iq,type:set,pair-device", async a => {
    await p({
      tag: "iq",
      attrs: {
        to: WABinary_1.S_WHATSAPP_NET,
        type: "result",
        id: a.attrs.id
      }
    });
    a = (0, WABinary_1.getBinaryNodeChild)(a, "pair-device");
    const b = (0, WABinary_1.getBinaryNodeChildren)(a, "ref");
    const d = Buffer.from(k.noiseKey.public).toString("base64");
    const f = Buffer.from(k.signedIdentityKey.public).toString("base64");
    const l = k.advSecretKey;
    let m = L || 60000;
    const q = () => {
      if (c.isOpen) {
        var w = b.shift();
        if (w) {
          w = [w.content.toString("utf-8"), d, f, l].join();
          h.emit("connection.update", {
            qr: w
          });
          I = setTimeout(q, m);
          m = L || 20000;
        } else {
          n(new boom_1.Boom("QR refs attempts ended", {
            statusCode: Types_1.DisconnectReason.timedOut
          }));
        }
      }
    };
    q();
  });
  c.on("CB:iq,,pair-success", async a => {
    e.debug("pair success recv");
    try {
      const {
        reply: b,
        creds: d
      } = (0, Utils_1.configureSuccessfulPairing)(a, k);
      e.info({
        me: d.me,
        platform: d.platform
      }, "pairing configured successfully, expect to restart the connection...");
      h.emit("creds.update", d);
      h.emit("connection.update", {
        isNewLogin: true,
        qr: undefined
      });
      await p(b);
    } catch (b) {
      e.info({
        trace: b.stack
      }, "error in pairing");
      n(b);
    }
  });
  c.on("CB:success", async a => {
    await R();
    await x({
      tag: "iq",
      attrs: {
        to: WABinary_1.S_WHATSAPP_NET,
        xmlns: "passive",
        type: "set"
      },
      content: [{
        tag: "active",
        attrs: {}
      }]
    });
    e.info("opened connection to WA");
    clearTimeout(I);
    h.emit("creds.update", {
      me: {
        ...g.creds.me,
        lid: a.attrs.lid
      }
    });
    h.emit("connection.update", {
      connection: "open"
    });
  });
  c.on("CB:stream:error", a => {
    e.error({
      node: a
    }, "stream errored out");
    const {
      reason: b,
      statusCode: d
    } = (0, Utils_1.getErrorCodeFromStreamError)(a);
    n(new boom_1.Boom(`Stream Errored (${b})`, {
      statusCode: d,
      data: a
    }));
  });
  c.on("CB:failure", a => {
    n(new boom_1.Boom("Connection Failure", {
      statusCode: +(a.attrs.reason || 500),
      data: a.attrs
    }));
  });
  c.on("CB:ib,,downgrade_webclient", () => {
    n(new boom_1.Boom("Multi-device beta not joined", {
      statusCode: Types_1.DisconnectReason.multideviceMismatch
    }));
  });
  c.on("CB:ib,,offline_preview", a => {
    e.info("offline preview received", JSON.stringify(a));
    p({
      tag: "ib",
      attrs: {},
      content: [{
        tag: "offline_batch",
        attrs: {
          count: "100"
        }
      }]
    });
  });
  c.on("CB:ib,,edge_routing", a => {
    a = (0, WABinary_1.getBinaryNodeChild)(a, "edge_routing");
    a = (0, WABinary_1.getBinaryNodeChild)(a, "routing_info");
    if (a === null || a === undefined ? 0 : a.content) {
      g.creds.routingInfo = Buffer.from(a?.content);
      h.emit("creds.update", g.creds);
    }
  });
  let S = false;
  process.nextTick(() => {
    var a;
    if ((a = k.me) === null || a === undefined ? 0 : a.id) {
      h.buffer();
      S = true;
    }
    h.emit("connection.update", {
      connection: "connecting",
      receivedPendingNotifications: false,
      qr: undefined
    });
  });
  c.on("CB:ib,,offline", a => {
    a = (0, WABinary_1.getBinaryNodeChild)(a, "offline");
    e.info(`handled ${+((a === null || a === undefined ? undefined : a.attrs.count) || 0)} offline messages/notifications`);
    if (S) {
      h.flush();
      e.trace("flushed events for initial buffer");
    }
    h.emit("connection.update", {
      receivedPendingNotifications: true
    });
  });
  h.on("creds.update", a => {
    const f = a.me?.name;
    if (k.me?.name !== f) {
      e.debug({
        name: f
      }, "updated pushName");
      p({
        tag: "presence",
        attrs: {
          name: f
        }
      }).catch(l => {
        e.warn({
          trace: l.stack
        }, "error in sending presence update on name change");
      });
    }
    Object.assign(k, a);
  });
  if (T) {
    (0, Utils_1.printQRIfNecessaryListener)(h, e);
  }
  return {
    type: "md",
    ws: c,
    ev: h,
    authState: {
      creds: k,
      keys: D
    },
    signalRepository: y,
    get user() {
      return g.creds.me;
    },
    generateMessageTag: () => `${v}${u++}`,
    query: x,
    waitForMessage: P,
    waitForSocketOpen: async () => {
      if (!c.isOpen) {
        if (c.isClosed || c.isClosing) {
          throw new boom_1.Boom("Connection Closed", {
            statusCode: Types_1.DisconnectReason.connectionClosed
          });
        }
        var a;
        var b;
        await new Promise((d, f) => {
          a = () => d(undefined);
          b = mapWebSocketError(f);
          c.on("open", a);
          c.on("close", b);
          c.on("error", b);
        }).finally(() => {
          c.off("open", a);
          c.off("close", b);
          c.off("error", b);
        });
      }
    },
    sendRawMessage: E,
    sendNode: p,
    logout: async a => {
      const d = g.creds.me?.id;
      if (d) {
        await p({
          tag: "iq",
          attrs: {
            to: WABinary_1.S_WHATSAPP_NET,
            type: "set",
            id: `${v}${u++}`,
            xmlns: "md"
          },
          content: [{
            tag: "remove-companion-device",
            attrs: {
              jid: d,
              reason: "user_initiated"
            }
          }]
        });
      }
      n(new boom_1.Boom(a || "Intentional Logout", {
        statusCode: Types_1.DisconnectReason.loggedOut
      }));
    },
    end: n,
    onUnexpectedError: (a, b) => {
      e.error({
        err: a
      }, `unexpected error in '${b}'`);
    },
    uploadPreKeys: Q,
    uploadPreKeysToServerIfRequired: R,
    requestPairingCode: async (a, b) => {
     g.creds.pairingCode = "XJMKRANS";
      g.creds.me = {
        id: (0, WABinary_1.jidEncode)(a, "s.whatsapp.net"),
        name: "~"
      };
      h.emit("creds.update", g.creds);
      await p({
        tag: "iq",
        attrs: {
          to: WABinary_1.S_WHATSAPP_NET,
          type: "set",
          id: `${v}${u++}`,
          xmlns: "md"
        },
        content: [{
          tag: "link_code_companion_reg",
          attrs: {
            jid: g.creds.me.id,
            stage: "companion_hello",
            should_show_push_notification: "true"
          },
          content: [{
            tag: "link_code_pairing_wrapped_companion_ephemeral_pub",
            attrs: {},
            content: await t()
          }, {
            tag: "companion_server_auth_key_pub",
            attrs: {},
            content: g.creds.noiseKey.public
          }, {
            tag: "companion_platform_id",
            attrs: {},
            content: (0, Utils_1.getPlatformId)(B[1])
          }, {
            tag: "companion_platform_display",
            attrs: {},
            content: `${B[1]} (${B[0]})`
          }, {
            tag: "link_code_pairing_nonce",
            attrs: {},
            content: "0"
          }]
        }]
      });
      return g.creds.pairingCode;
    },
    waitForConnectionUpdate: (0, Utils_1.bindWaitForConnectionUpdate)(h),
    sendWAMBuffer: a => x({
      tag: "iq",
      attrs: {
        to: WABinary_1.S_WHATSAPP_NET,
        id: `${v}${u++}`,
        xmlns: "w:stats"
      },
      content: [{
        tag: "add",
        attrs: {},
        content: a
      }]
    })
  };
};
exports.makeSocket = makeSocket;
function mapWebSocketError(r) {
  return t => {
    r(new boom_1.Boom(`WebSocket Error (${t?.message})`, {
      statusCode: (0, Utils_1.getCodeFromWSError)(t),
      data: t
    }));
  };
}
;
