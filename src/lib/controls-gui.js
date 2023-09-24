(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.wrapGUI = factory());
}(this, function () { 'use strict';

    var n,
        l,
        u,
        t,
        i,
        o,
        r,
        f,
        e,
        c = {},
        s = [],
        a = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,
        h = Array.isArray;function v(n, l) {
      for (var u in l) {
        n[u] = l[u];
      }return n;
    }function p(n) {
      var l = n.parentNode;l && l.removeChild(n);
    }function y(l, u, t) {
      var i,
          o,
          r,
          f = {};for (r in u) {
        "key" == r ? i = u[r] : "ref" == r ? o = u[r] : f[r] = u[r];
      }if (arguments.length > 2 && (f.children = arguments.length > 3 ? n.call(arguments, 2) : t), "function" == typeof l && null != l.defaultProps) for (r in l.defaultProps) {
        void 0 === f[r] && (f[r] = l.defaultProps[r]);
      }return d(l, f, i, o, null);
    }function d(n, t, i, o, r) {
      var f = { type: n, props: t, key: i, ref: o, __k: null, __: null, __b: 0, __e: null, __d: void 0, __c: null, __h: null, constructor: void 0, __v: null == r ? ++u : r };return null == r && null != l.vnode && l.vnode(f), f;
    }function _() {
      return { current: null };
    }function k(n) {
      return n.children;
    }function b(n, l) {
      this.props = n, this.context = l;
    }function g(n, l) {
      if (null == l) return n.__ ? g(n.__, n.__.__k.indexOf(n) + 1) : null;for (var u; l < n.__k.length; l++) {
        if (null != (u = n.__k[l]) && null != u.__e) return u.__e;
      }return "function" == typeof n.type ? g(n) : null;
    }function m(n) {
      var l, u;if (null != (n = n.__) && null != n.__c) {
        for (n.__e = n.__c.base = null, l = 0; l < n.__k.length; l++) {
          if (null != (u = n.__k[l]) && null != u.__e) {
            n.__e = n.__c.base = u.__e;break;
          }
        }return m(n);
      }
    }function w(n) {
      (!n.__d && (n.__d = !0) && i.push(n) && !x.__r++ || o !== l.debounceRendering) && ((o = l.debounceRendering) || r)(x);
    }function x() {
      var n, l, u, t, o, r, e, c, s;for (i.sort(f); n = i.shift();) {
        n.__d && (l = i.length, t = void 0, o = void 0, r = void 0, c = (e = (u = n).__v).__e, (s = u.__P) && (t = [], o = [], (r = v({}, e)).__v = e.__v + 1, L(s, e, r, u.__n, void 0 !== s.ownerSVGElement, null != e.__h ? [c] : null, t, null == c ? g(e) : c, e.__h, o), M(t, e, o), e.__e != c && m(e)), i.length > l && i.sort(f));
      }x.__r = 0;
    }function P(n, l, u, t, i, o, r, f, e, a, v) {
      var p,
          y,
          _,
          b,
          m,
          w,
          x,
          P,
          C,
          H = 0,
          I = t && t.__k || s,
          T = I.length,
          j = T,
          z = l.length;for (u.__k = [], p = 0; p < z; p++) {
        null != (b = u.__k[p] = null == (b = l[p]) || "boolean" == typeof b || "function" == typeof b ? null : "string" == typeof b || "number" == typeof b || "bigint" == typeof b ? d(null, b, null, null, b) : h(b) ? d(k, { children: b }, null, null, null) : b.__b > 0 ? d(b.type, b.props, b.key, b.ref ? b.ref : null, b.__v) : b) ? (b.__ = u, b.__b = u.__b + 1, -1 === (P = A(b, I, x = p + H, j)) ? _ = c : (_ = I[P] || c, I[P] = void 0, j--), L(n, b, _, i, o, r, f, e, a, v), m = b.__e, (y = b.ref) && _.ref != y && (_.ref && O(_.ref, null, b), v.push(y, b.__c || m, b)), null != m && (null == w && (w = m), (C = _ === c || null === _.__v) ? -1 == P && H-- : P !== x && (P === x + 1 ? H++ : P > x ? j > z - x ? H += P - x : H-- : H = P < x && P == x - 1 ? P - x : 0), x = p + H, "function" != typeof b.type || P === x && _.__k !== b.__k ? "function" == typeof b.type || P === x && !C ? void 0 !== b.__d ? (e = b.__d, b.__d = void 0) : e = m.nextSibling : e = S(n, m, e) : e = $(b, e, n), "function" == typeof u.type && (u.__d = e))) : (_ = I[p]) && null == _.key && _.__e && (_.__e == e && (e = g(_)), q(_, _, !1), I[p] = null);
      }for (u.__e = w, p = T; p--;) {
        null != I[p] && ("function" == typeof u.type && null != I[p].__e && I[p].__e == u.__d && (u.__d = I[p].__e.nextSibling), q(I[p], I[p]));
      }
    }function $(n, l, u) {
      for (var t, i = n.__k, o = 0; i && o < i.length; o++) {
        (t = i[o]) && (t.__ = n, l = "function" == typeof t.type ? $(t, l, u) : S(u, t.__e, l));
      }return l;
    }function C(n, l) {
      return l = l || [], null == n || "boolean" == typeof n || (h(n) ? n.some(function (n) {
        C(n, l);
      }) : l.push(n)), l;
    }function S(n, l, u) {
      return null == u || u.parentNode !== n ? n.insertBefore(l, null) : l == u && null != l.parentNode || n.insertBefore(l, u), l.nextSibling;
    }function A(n, l, u, t) {
      var i = n.key,
          o = n.type,
          r = u - 1,
          f = u + 1,
          e = l[u];if (null === e || e && i == e.key && o === e.type) return u;if (t > (null != e ? 1 : 0)) for (; r >= 0 || f < l.length;) {
        if (r >= 0) {
          if ((e = l[r]) && i == e.key && o === e.type) return r;r--;
        }if (f < l.length) {
          if ((e = l[f]) && i == e.key && o === e.type) return f;f++;
        }
      }return -1;
    }function H(n, l, u, t, i) {
      var o;for (o in u) {
        "children" === o || "key" === o || o in l || T(n, o, null, u[o], t);
      }for (o in l) {
        i && "function" != typeof l[o] || "children" === o || "key" === o || "value" === o || "checked" === o || u[o] === l[o] || T(n, o, l[o], u[o], t);
      }
    }function I(n, l, u) {
      "-" === l[0] ? n.setProperty(l, null == u ? "" : u) : n[l] = null == u ? "" : "number" != typeof u || a.test(l) ? u : u + "px";
    }function T(n, l, u, t, i) {
      var o;n: if ("style" === l) {
        if ("string" == typeof u) n.style.cssText = u;else {
          if ("string" == typeof t && (n.style.cssText = t = ""), t) for (l in t) {
            u && l in u || I(n.style, l, "");
          }if (u) for (l in u) {
            t && u[l] === t[l] || I(n.style, l, u[l]);
          }
        }
      } else if ("o" === l[0] && "n" === l[1]) o = l !== (l = l.replace(/(PointerCapture)$|Capture$/, "$1")), l = l.toLowerCase() in n ? l.toLowerCase().slice(2) : l.slice(2), n.l || (n.l = {}), n.l[l + o] = u, u ? t || n.addEventListener(l, o ? z : j, o) : n.removeEventListener(l, o ? z : j, o);else if ("dangerouslySetInnerHTML" !== l) {
        if (i) l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");else if ("width" !== l && "height" !== l && "href" !== l && "list" !== l && "form" !== l && "tabIndex" !== l && "download" !== l && "rowSpan" !== l && "colSpan" !== l && l in n) try {
          n[l] = null == u ? "" : u;break n;
        } catch (n) {}"function" == typeof u || (null == u || !1 === u && "-" !== l[4] ? n.removeAttribute(l) : n.setAttribute(l, u));
      }
    }function j(n) {
      return this.l[n.type + !1](l.event ? l.event(n) : n);
    }function z(n) {
      return this.l[n.type + !0](l.event ? l.event(n) : n);
    }function L(n, u, t, i, o, r, f, e, c, s) {
      var a,
          p,
          y,
          d,
          _,
          g,
          m,
          w,
          x,
          $,
          C,
          S,
          A,
          H,
          I,
          T = u.type;if (void 0 !== u.constructor) return null;null != t.__h && (c = t.__h, e = u.__e = t.__e, u.__h = null, r = [e]), (a = l.__b) && a(u);n: if ("function" == typeof T) try {
        if (w = u.props, x = (a = T.contextType) && i[a.__c], $ = a ? x ? x.props.value : a.__ : i, t.__c ? m = (p = u.__c = t.__c).__ = p.__E : ("prototype" in T && T.prototype.render ? u.__c = p = new T(w, $) : (u.__c = p = new b(w, $), p.constructor = T, p.render = B), x && x.sub(p), p.props = w, p.state || (p.state = {}), p.context = $, p.__n = i, y = p.__d = !0, p.__h = [], p._sb = []), null == p.__s && (p.__s = p.state), null != T.getDerivedStateFromProps && (p.__s == p.state && (p.__s = v({}, p.__s)), v(p.__s, T.getDerivedStateFromProps(w, p.__s))), d = p.props, _ = p.state, p.__v = u, y) null == T.getDerivedStateFromProps && null != p.componentWillMount && p.componentWillMount(), null != p.componentDidMount && p.__h.push(p.componentDidMount);else {
          if (null == T.getDerivedStateFromProps && w !== d && null != p.componentWillReceiveProps && p.componentWillReceiveProps(w, $), !p.__e && (null != p.shouldComponentUpdate && !1 === p.shouldComponentUpdate(w, p.__s, $) || u.__v === t.__v)) {
            for (u.__v !== t.__v && (p.props = w, p.state = p.__s, p.__d = !1), u.__e = t.__e, u.__k = t.__k, u.__k.forEach(function (n) {
              n && (n.__ = u);
            }), C = 0; C < p._sb.length; C++) {
              p.__h.push(p._sb[C]);
            }p._sb = [], p.__h.length && f.push(p);break n;
          }null != p.componentWillUpdate && p.componentWillUpdate(w, p.__s, $), null != p.componentDidUpdate && p.__h.push(function () {
            p.componentDidUpdate(d, _, g);
          });
        }if (p.context = $, p.props = w, p.__P = n, p.__e = !1, S = l.__r, A = 0, "prototype" in T && T.prototype.render) {
          for (p.state = p.__s, p.__d = !1, S && S(u), a = p.render(p.props, p.state, p.context), H = 0; H < p._sb.length; H++) {
            p.__h.push(p._sb[H]);
          }p._sb = [];
        } else do {
          p.__d = !1, S && S(u), a = p.render(p.props, p.state, p.context), p.state = p.__s;
        } while (p.__d && ++A < 25);p.state = p.__s, null != p.getChildContext && (i = v(v({}, i), p.getChildContext())), y || null == p.getSnapshotBeforeUpdate || (g = p.getSnapshotBeforeUpdate(d, _)), P(n, h(I = null != a && a.type === k && null == a.key ? a.props.children : a) ? I : [I], u, t, i, o, r, f, e, c, s), p.base = u.__e, u.__h = null, p.__h.length && f.push(p), m && (p.__E = p.__ = null);
      } catch (n) {
        u.__v = null, (c || null != r) && (u.__e = e, u.__h = !!c, r[r.indexOf(e)] = null), l.__e(n, u, t);
      } else null == r && u.__v === t.__v ? (u.__k = t.__k, u.__e = t.__e) : u.__e = N(t.__e, u, t, i, o, r, f, c, s);(a = l.diffed) && a(u);
    }function M(n, u, t) {
      for (var i = 0; i < t.length; i++) {
        O(t[i], t[++i], t[++i]);
      }l.__c && l.__c(u, n), n.some(function (u) {
        try {
          n = u.__h, u.__h = [], n.some(function (n) {
            n.call(u);
          });
        } catch (n) {
          l.__e(n, u.__v);
        }
      });
    }function N(l, u, t, i, o, r, f, e, s) {
      var a,
          v,
          y,
          d = t.props,
          _ = u.props,
          k = u.type,
          b = 0;if ("svg" === k && (o = !0), null != r) for (; b < r.length; b++) {
        if ((a = r[b]) && "setAttribute" in a == !!k && (k ? a.localName === k : 3 === a.nodeType)) {
          l = a, r[b] = null;break;
        }
      }if (null == l) {
        if (null === k) return document.createTextNode(_);l = o ? document.createElementNS("http://www.w3.org/2000/svg", k) : document.createElement(k, _.is && _), r = null, e = !1;
      }if (null === k) d === _ || e && l.data === _ || (l.data = _);else {
        if (r = r && n.call(l.childNodes), v = (d = t.props || c).dangerouslySetInnerHTML, y = _.dangerouslySetInnerHTML, !e) {
          if (null != r) for (d = {}, b = 0; b < l.attributes.length; b++) {
            d[l.attributes[b].name] = l.attributes[b].value;
          }(y || v) && (y && (v && y.__html == v.__html || y.__html === l.innerHTML) || (l.innerHTML = y && y.__html || ""));
        }if (H(l, _, d, o, e), y) u.__k = [];else if (P(l, h(b = u.props.children) ? b : [b], u, t, i, o && "foreignObject" !== k, r, f, r ? r[0] : t.__k && g(t, 0), e, s), null != r) for (b = r.length; b--;) {
          null != r[b] && p(r[b]);
        }e || ("value" in _ && void 0 !== (b = _.value) && (b !== l.value || "progress" === k && !b || "option" === k && b !== d.value) && T(l, "value", b, d.value, !1), "checked" in _ && void 0 !== (b = _.checked) && b !== l.checked && T(l, "checked", b, d.checked, !1));
      }return l;
    }function O(n, u, t) {
      try {
        "function" == typeof n ? n(u) : n.current = u;
      } catch (n) {
        l.__e(n, t);
      }
    }function q(n, u, t) {
      var i, o;if (l.unmount && l.unmount(n), (i = n.ref) && (i.current && i.current !== n.__e || O(i, null, u)), null != (i = n.__c)) {
        if (i.componentWillUnmount) try {
          i.componentWillUnmount();
        } catch (n) {
          l.__e(n, u);
        }i.base = i.__P = null, n.__c = void 0;
      }if (i = n.__k) for (o = 0; o < i.length; o++) {
        i[o] && q(i[o], u, t || "function" != typeof n.type);
      }t || null == n.__e || p(n.__e), n.__ = n.__e = n.__d = void 0;
    }function B(n, l, u) {
      return this.constructor(n, u);
    }function D(u, t, i) {
      var o, r, f, e;l.__ && l.__(u, t), r = (o = "function" == typeof i) ? null : i && i.__k || t.__k, f = [], e = [], L(t, u = (!o && i || t).__k = y(k, null, [u]), r || c, c, void 0 !== t.ownerSVGElement, !o && i ? [i] : r ? null : t.firstChild ? n.call(t.childNodes) : null, f, !o && i ? i : r ? r.__e : t.firstChild, o, e), M(f, u, e);
    }function E(n, l) {
      D(n, l, E);
    }function F(l, u, t) {
      var i,
          o,
          r,
          f,
          e = v({}, l.props);for (r in l.type && l.type.defaultProps && (f = l.type.defaultProps), u) {
        "key" == r ? i = u[r] : "ref" == r ? o = u[r] : e[r] = void 0 === u[r] && void 0 !== f ? f[r] : u[r];
      }return arguments.length > 2 && (e.children = arguments.length > 3 ? n.call(arguments, 2) : t), d(l.type, e, i || l.key, o || l.ref, null);
    }function G(n, l) {
      var u = { __c: l = "__cC" + e++, __: n, Consumer: function (n, l) {
          return n.children(l);
        }, Provider: function (n) {
          var u, t;return this.getChildContext || (u = [], (t = {})[l] = this, this.getChildContext = function () {
            return t;
          }, this.shouldComponentUpdate = function (n) {
            this.props.value !== n.value && u.some(function (n) {
              n.__e = !0, w(n);
            });
          }, this.sub = function (n) {
            u.push(n);var l = n.componentWillUnmount;n.componentWillUnmount = function () {
              u.splice(u.indexOf(n), 1), l && l.call(n);
            };
          }), n.children;
        } };return u.Provider.__ = u.Consumer.contextType = u;
    }n = s.slice, l = { __e: function (n, l, u, t) {
        for (var i, o, r; l = l.__;) {
          if ((i = l.__c) && !i.__) try {
            if ((o = i.constructor) && null != o.getDerivedStateFromError && (i.setState(o.getDerivedStateFromError(n)), r = i.__d), null != i.componentDidCatch && (i.componentDidCatch(n, t || {}), r = i.__d), r) return i.__E = i;
          } catch (l) {
            n = l;
          }
        }throw n;
      } }, u = 0, t = function (n) {
      return null != n && void 0 === n.constructor;
    }, b.prototype.setState = function (n, l) {
      var u;u = null != this.__s && this.__s !== this.state ? this.__s : this.__s = v({}, this.state), "function" == typeof n && (n = n(v({}, u), this.props)), n && v(u, n), null != n && this.__v && (l && this._sb.push(l), w(this));
    }, b.prototype.forceUpdate = function (n) {
      this.__v && (this.__e = !0, n && this.__h.push(n), w(this));
    }, b.prototype.render = k, i = [], r = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, f = function (n, l) {
      return n.__v.__b - l.__v.__b;
    }, x.__r = 0, e = 0;

    var preact_module = /*#__PURE__*/Object.freeze({
        Component: b,
        Fragment: k,
        cloneElement: F,
        createContext: G,
        createElement: y,
        createRef: _,
        h: y,
        hydrate: E,
        get isValidElement () { return t; },
        get options () { return l; },
        render: D,
        toChildArray: C
    });

    var containers = []; // will store container HTMLElement references
    var styleElements = []; // will store {prepend: HTMLElement, append: HTMLElement}

    var usage = 'insert-css: You need to provide a CSS string. Usage: insertCss(cssString[, options]).';

    function insertCss(css, options) {
        options = options || {};

        if (css === undefined) {
            throw new Error(usage);
        }

        var position = options.prepend === true ? 'prepend' : 'append';
        var container = options.container !== undefined ? options.container : document.querySelector('head');
        var containerId = containers.indexOf(container);

        // first time we see this container, create the necessary entries
        if (containerId === -1) {
            containerId = containers.push(container) - 1;
            styleElements[containerId] = {};
        }

        // try to get the correponding container + position styleElement, create it otherwise
        var styleElement;

        if (styleElements[containerId] !== undefined && styleElements[containerId][position] !== undefined) {
            styleElement = styleElements[containerId][position];
        } else {
            styleElement = styleElements[containerId][position] = createStyleElement();

            if (position === 'prepend') {
                container.insertBefore(styleElement, container.childNodes[0]);
            } else {
                container.appendChild(styleElement);
            }
        }

        // strip potential UTF-8 BOM if css was read from a file
        if (css.charCodeAt(0) === 0xFEFF) {
            css = css.substr(1, css.length);
        }

        // actually add the stylesheet
        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText += css;
        } else {
            styleElement.textContent += css;
        }

        return styleElement;
    }
    function createStyleElement() {
        var styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        return styleElement;
    }

    var insertCss_1 = insertCss;
    var insertCss_2 = insertCss;
    insertCss_1.insertCss = insertCss_2;

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var clone_1 = createCommonjsModule(function (module) {
      var clone = function () {

        /**
         * Clones (copies) an Object using deep copying.
         *
         * This function supports circular references by default, but if you are certain
         * there are no circular references in your object, you can save some CPU time
         * by calling clone(obj, false).
         *
         * Caution: if `circular` is false and `parent` contains circular references,
         * your program may enter an infinite loop and crash.
         *
         * @param `parent` - the object to be cloned
         * @param `circular` - set to true if the object to be cloned may contain
         *    circular references. (optional - true by default)
         * @param `depth` - set to a number if the object is only to be cloned to
         *    a particular depth. (optional - defaults to Infinity)
         * @param `prototype` - sets the prototype to be used when cloning an object.
         *    (optional - defaults to parent prototype).
        */

        function clone(parent, circular, depth, prototype) {
          var filter;
          if (typeof circular === 'object') {
            depth = circular.depth;
            prototype = circular.prototype;
            filter = circular.filter;
            circular = circular.circular;
          }
          // maintain two arrays for circular references, where corresponding parents
          // and children have the same index
          var allParents = [];
          var allChildren = [];

          var useBuffer = typeof Buffer != 'undefined';

          if (typeof circular == 'undefined') circular = true;

          if (typeof depth == 'undefined') depth = Infinity;

          // recurse this function so we don't reset allParents and allChildren
          function _clone(parent, depth) {
            // cloning null always returns null
            if (parent === null) return null;

            if (depth == 0) return parent;

            var child;
            var proto;
            if (typeof parent != 'object') {
              return parent;
            }

            if (clone.__isArray(parent)) {
              child = [];
            } else if (clone.__isRegExp(parent)) {
              child = new RegExp(parent.source, __getRegExpFlags(parent));
              if (parent.lastIndex) child.lastIndex = parent.lastIndex;
            } else if (clone.__isDate(parent)) {
              child = new Date(parent.getTime());
            } else if (useBuffer && Buffer.isBuffer(parent)) {
              if (Buffer.allocUnsafe) {
                // Node.js >= 4.5.0
                child = Buffer.allocUnsafe(parent.length);
              } else {
                // Older Node.js versions
                child = new Buffer(parent.length);
              }
              parent.copy(child);
              return child;
            } else {
              if (typeof prototype == 'undefined') {
                proto = Object.getPrototypeOf(parent);
                child = Object.create(proto);
              } else {
                child = Object.create(prototype);
                proto = prototype;
              }
            }

            if (circular) {
              var index = allParents.indexOf(parent);

              if (index != -1) {
                return allChildren[index];
              }
              allParents.push(parent);
              allChildren.push(child);
            }

            for (var i in parent) {
              var attrs;
              if (proto) {
                attrs = Object.getOwnPropertyDescriptor(proto, i);
              }

              if (attrs && attrs.set == null) {
                continue;
              }
              child[i] = _clone(parent[i], depth - 1);
            }

            return child;
          }

          return _clone(parent, depth);
        }

        /**
         * Simple flat clone using prototype, accepts only objects, usefull for property
         * override on FLAT configuration object (no nested props).
         *
         * USE WITH CAUTION! This may not behave as you wish if you do not know how this
         * works.
         */
        clone.clonePrototype = function clonePrototype(parent) {
          if (parent === null) return null;

          var c = function () {};
          c.prototype = parent;
          return new c();
        };

        // private utility functions

        function __objToStr(o) {
          return Object.prototype.toString.call(o);
        }    clone.__objToStr = __objToStr;

        function __isDate(o) {
          return typeof o === 'object' && __objToStr(o) === '[object Date]';
        }    clone.__isDate = __isDate;

        function __isArray(o) {
          return typeof o === 'object' && __objToStr(o) === '[object Array]';
        }    clone.__isArray = __isArray;

        function __isRegExp(o) {
          return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
        }    clone.__isRegExp = __isRegExp;

        function __getRegExpFlags(re) {
          var flags = '';
          if (re.global) flags += 'g';
          if (re.ignoreCase) flags += 'i';
          if (re.multiline) flags += 'm';
          return flags;
        }    clone.__getRegExpFlags = __getRegExpFlags;

        return clone;
      }();

      if (module.exports) {
        module.exports = clone;
      }
    });

    var defaults = function (options, defaults) {
      options = options || {};

      Object.keys(defaults).forEach(function (key) {
        if (typeof options[key] === 'undefined') {
          options[key] = clone_1(defaults[key]);
        }
      });

      return options;
    };

    // From preact-classless-component: https://github.com/laurencedorman/preact-classless-component#readme
    //
    // The MIT License (MIT)
    // 
    // Copyright (c) 2016 Laurence Dorman
    // 
    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:
    // 
    // The above copyright notice and this permission notice shall be included in all
    // copies or substantial portions of the Software.
    // 
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    // SOFTWARE.


    var preactClasslessComponent = function (obj) {
      function preactComponent() {
        preact_module.Component.apply(this, arguments);

        for (var i in obj) {
          if (i !== 'render' && typeof obj[i] === 'function') {
            this[i] = obj[i].bind(this);
          }
        }

        if (obj.init) {
          obj.init.call(this);
        }
      }

      preactComponent.prototype = Object.assign(Object.create(preact_module.Component.prototype), obj);

      preactComponent.prototype.constructor = preactComponent;

      return preactComponent;
    };

    var toPx = function toPx(number) {
      number = '' + number;
      return (/^[0-9\.\s]*$/.test(number) ? number + 'px' : number
      );
    };

    var _default = {
      fontFamily: "'Helvetica', sans-serif",
      fontSize: 13,
      sliderHeight: 22,
      controlBgColor: '#444',
      fieldBgColor: '#333',
      fieldHoverColor: '#383838',
      fieldActiveColor: '#383838',
      fieldBorderColor: '#232323',
      fieldHeight: 30,
      sectionHeadingBgColor: '#222',
      sectionHeadingHoverColor: '#444',
      sectionHeadingColor: '#e8e8e8',
      sectionHeadingBorderColor: '#222',
      controlBorderColor: '#666',
      sliderThumbColor: '#888',
      fontColor: '#e8e8e8',
      sectionHeadingHeight: 24,
      minLabelWidth: 110,
      minControlWidth: 130,
      visibilityFontColor: 'rgba(0, 0, 0, 0.3)',
      focusBorderColor: '#888',
      controlBorderRadius: 2
    };

    var computeStyles = function (className, theme, components) {
      var theme = Object.assign({}, defaults(theme || {}, _default));

      theme.fontSize = toPx(theme.fontSize);
      theme.sliderHeight = toPx(theme.sliderHeight);
      theme.fieldHeight = toPx(theme.fieldHeight);
      theme.sectionHeadingHeight = toPx(theme.sectionHeadingHeight);
      theme.minLabelWidth = toPx(theme.minLabelWidth);
      theme.minControlWidth = toPx(theme.minControlWidth);
      theme.controlBorderRadius = toPx(theme.controlBorderRadius);
      theme.focusBorder = '\n    outline: none;\n    border-color: ' + theme.focusBorderColor + ';\n    box-shadow: 0 0 3px ' + theme.focusBorderColor + ';\n  ';

      return '\n    .' + className + ' {\n      color: ' + theme.fontColor + ';\n      ' + (theme.fontSize ? 'font-size: ' + theme.fontSize : '') + ';\n      ' + (theme.fontFamily ? 'font-family: ' + theme.fontFamily : '') + ';\n      max-width: 100%;\n    }\n\n    .' + className + '__field {\n      position: relative;\n      background-color: ' + theme.fieldBgColor + ';\n      border-right: 1px solid ' + theme.fieldBorderColor + ';\n    }\n\n    .' + className + '__label {\n      display: block;\n      height: ' + theme.fieldHeight + ';\n      line-height: ' + theme.fieldHeight + ';\n      display: flex;\n      flex-direction: row;\n      background-color: ' + theme.fieldBgColor + ';\n    }\n\n    .' + className + '__field:hover {\n      background-color: ' + theme.fieldHoverColor + ';\n    }\n\n    .' + className + '__container {\n      display: flex;\n      flex-direction: row;\n      align-content: stretch;\n      justify-content: stretch;\n    \n      height: ' + theme.fieldHeight + ';\n      flex: 1;\n      position: relative;\n      align-items: center;\n      position: relative;\n\n      min-width: ' + theme.minControlWidth + ';\n      width: ' + theme.fieldHeight + ';\n      padding-right: 8px;\n      text-indent: 8px;\n    }\n\n    .' + className + '__labelText {\n      user-select: none;\n      -moz-user-select: -moz-none;\n      text-indent: 8px;\n      margin-right: 4px;\n      display: inline-block;\n      min-width: ' + theme.minLabelWidth + ';\n      line-height: ' + theme.fieldHeight + ';\n    }\n\n    .' + className + '__field::before {\n      content: \'\';\n      width: 3px;\n      display: inline-block;\n      vertical-align: middle;\n      position: absolute;\n      top: 0;\n      left: 0;\n      bottom: 0;\n    }\n\n    .' + className + '__field--text::before { background-color: #49f; }\n    .' + className + '__field--color::before { background-color: #94f; }\n    .' + className + '__field--checkbox::before { background-color: #f49; }\n    .' + className + '__field--slider::before { background-color: #f84; }\n    .' + className + '__field--select::before { background-color: #8f4; }\n    .' + className + '__field--button > button::before { background-color: #8ff; }\n\n    ' + Object.keys(components).map(function (name) {
        var css = components[name].css;
        if (!css) return '';
        return css(className, theme);
      }).join('\n') + '\n  ';
    };

    var factory = function GuiFactory() {
      var components = {};

      GUI.registerComponent = function (component) {
        components[component.name] = component;
        return GUI;
      };

      GUI.registerComponents = function (components) {
        for (var i = 0; i < components.length; i++) {
          GUI.registerComponent(components[i]);
        }
        return GUI;
      };

      function getComponent(name) {
        var component = components[name];
        if (!component) throw new Error('Unrecognized component, "' + name + '"');
        return component;
      }

      function GUI(state, opts) {
        opts = defaults(opts || {}, {
          containerCSS: "position:fixed;top:0;right:8px",
          style: true,
          className: 'controlPanel-' + Math.random().toString(36).substring(2, 15),
          expanded: true
        });

        opts.root = opts.root || document.body;

        var className = opts.className;

        state.$field.$config.expanded = opts.expanded;

        var ControlComponent = preactClasslessComponent({
          render: function () {
            return preact_module.h(getComponent(this.props.field.type).component, {
              ControlComponent: ControlComponent,
              className: className,
              field: this.props.field,
              state: state,
              h: preact_module.h
            });
          }
        });

        var App = preactClasslessComponent({
          state: { dummy: 0 },
          componentDidMount: function () {
            var _this = this;

            this.props.state.$field.onChanges(function (updates) {
              _this.setState({ dummy: _this.state.dummy + 1 });
            });
          },
          getRef: function (c) {
            var eventList = ['mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'wheel'];
            for (var i = 0; i < eventList.length; i++) {
              c.addEventListener(eventList[i], function (e) {
                e.stopPropagation();
              });
            }

            if (opts.containerCSS) {
              c.style.cssText = opts.containerCSS;
            }
          },
          render: function () {
            return preact_module.h('div', {
              className: '' + className,
              ref: this.getRef
            }, preact_module.h(ControlComponent, { field: this.props.state.$field }));
          }
        });

        if (opts.style) {
          insertCss_1(computeStyles(className, opts.theme, components));
        }

        preact_module.render(preact_module.h(App, {
          state: state
        }), opts.root);

        return state;
      }

      return GUI;
    };

    var h$1 = preact_module.h;

    var select = {
      name: 'select',
      component: preactClasslessComponent({
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$1('div', {
            className: className + '__field ' + className + '__field--select'
          }, h$1('label', {
            className: className + '__label',
            htmlFor: className + '-' + field.path
          }, h$1('span', {
            className: className + '__labelText'
          }, config.label || field.name), ' ', h$1('span', { className: className + '__container' }, h$1('select', {
            name: field.path,
            id: className + '-' + field.path,
            onChange: function (event) {
              return _this.props.field.value = event.target.value;
            }
          }, field.options.map(function (option) {
            return h$1('option', {
              value: option,
              selected: option === field.value
            }, option);
          })))));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__field--select select {\n        font-family: inherit;\n        font-size: inherit;\n        height: ' + theme.sliderHeight + ';\n        width: 100%;\n        color: inherit;\n        -webkit-appearance: none;\n        -moz-appearance: none;\n        appearance: none;\n        background-color: ' + theme.controlBgColor + ';\n        border: 1px solid ' + theme.controlBorderColor + ';\n        outline: none;\n        margin: 0;\n        padding: 0 5px;\n        border-radius: ' + theme.controlBorderRadius + ';\n        background-image: linear-gradient(' + theme.controlBorderColor + ', ' + theme.controlBorderColor + '),\n          linear-gradient(-130deg, transparent 50%, ' + theme.controlBgColor + ' 52%),\n          linear-gradient(-230deg, transparent 50%, ' + theme.controlBgColor + ' 52%),\n          linear-gradient(' + theme.fontColor + ' 42%, ' + theme.controlBgColor + ' 42%);\n        background-repeat: no-repeat, no-repeat, no-repeat, no-repeat;\n        background-size: 1px 100%, 20px 16px, 20px 16px, 20px 60%;\n        background-position: right 20px center, right bottom, right bottom, right bottom;\n      }\n\n      .' + className + '__field--select select:focus {\n        ' + theme.focusBorder + '\n      }\n    ';
      }
    };

    var getElementHeight = function getElementHeight(el) {
      var elStyle = window.getComputedStyle(el);
      var elDisplay = elStyle.display;
      var elPosition = elStyle.position;
      var elVisibility = elStyle.visibility;
      var elMaxHeight = elStyle.maxHeight;
      var elMaxHeightNumber = elMaxHeight.replace('px', '').replace('%', '');
      var computedHeight = 0;

      if (elDisplay !== 'none' && elMaxHeightNumber !== '0') {
        return el.offsetHeight;
      }

      el.style.maxHeight = '';
      el.style.position = 'absolute';
      el.style.visibility = 'hidden';
      el.style.display = 'block';

      computedHeight = el.offsetHeight;

      el.style.maxHeight = elMaxHeight;
      el.style.display = elDisplay;
      el.style.position = elPosition;
      el.style.visibility = elVisibility;

      return computedHeight;
    };

    var toggleSlide = function toggleSlide(el, callback) {
      if (!el) return;
      var elMaxHeightNumber = el.style.maxHeight.replace('px', '').replace('%', '');

      if (elMaxHeightNumber === '0') {
        var maxComputedHeight = getElementHeight(el) + 'px';

        el.style.transition = 'max-height 0.1s ease-in-out';
        el.style.overflowY = 'hidden';
        el.style.maxHeight = '0';
        el.style.display = 'block';

        var restore = function () {
          el.style.transition = 'none';
          el.style.overflowY = 'visible';
          el.style.maxHeight = '';
          el.removeEventListener('transitionend', restore);
          callback && callback();
        };

        el.addEventListener('transitionend', restore);

        setTimeout(function () {
          el.style.maxHeight = maxComputedHeight;
        }, 20);
      } else {
        var maxComputedHeight = getElementHeight(el) + 'px';

        el.style.transition = 'max-height 0.1s ease-in-out';
        el.style.overflowY = 'hidden';
        el.style.maxHeight = maxComputedHeight;
        el.style.display = 'block';

        var restore = function () {
          el.style.transition = 'none';
          el.removeEventListener('transitionend', restore);
          callback && callback();
        };
        el.addEventListener('transitionend', restore);

        setTimeout(function () {
          el.style.maxHeight = '0';
        }, 20);
      }
    };

    var h$2 = preact_module.h;

    var section = {
      name: 'section',
      component: preactClasslessComponent({
        init: function () {
          var expanded = this.props.field.$config.expanded;
          expanded = expanded === undefined ? true : !!expanded;
          this.state = {
            expanded: expanded
          };
        },
        toggleCollapsed: function (event) {
          event.stopPropagation();

          toggleSlide(this.contentsEl);

          this.setState({ expanded: !this.state.expanded });
        },
        getRef: function (ref) {
          this.contentsEl = ref;
          if (this.state.expanded === false) {
            toggleSlide(this.contentsEl);
          }
        },
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var title = config.label || field.name;
          var className = this.props.className;
          if (!field.parentField && title === '') title = 'Controls';
          return h$2('fieldset', {
            className: className + '__section ' + (this.state.expanded ? className + '__section--expanded' : '')
          }, h$2('legend', {
            className: className + '__sectionHeading'
          }, h$2('button', { onClick: this.toggleCollapsed }, title)), h$2('div', {
            ref: this.getRef,
            className: className + '__sectionFields'
          }, Object.keys(field.value.$displayFields).map(function (key) {
            return h$2(_this.props.ControlComponent, {
              field: field.value.$path[key].$field
            });
          })));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__section {\n        margin: 0;\n        margin-top: -1px;\n        padding: 0;\n        border: none;\n      }\n\n      .' + className + '__sectionHeading {\n        border: 1px solid ' + theme.sectionHeadingBorderColor + ';\n        position: relative;\n        z-index: 1;\n        box-sizing: border-box;\n      }\n\n      .' + className + '__sectionFields {\n        margin-left: 4px;\n        box-sizing: border-box;\n      }\n\n      .' + className + '__sectionFields .' + className + '__field {\n        border-bottom: 1px solid ' + theme.fieldBorderColor + ';\n        box-sizing: border-box;\n      }\n\n      .' + className + '__sectionFields .' + className + '__sectionFields {\n        border-right: none;\n        margin-right: 0;\n      }\n\n      .' + className + ' > .' + className + '__section:first-child > .' + className + '__sectionHeading:first-child {\n        border-right: 1px solid ' + theme.sectionHeadingBorderColor + ';\n      }\n\n      .' + className + '__sectionHeading {\n        padding: 0;\n        font-family: inherit;\n        user-select: none;\n        -moz-user-select: -moz-none;\n        text-indent: 5px;\n        cursor: pointer;\n        width: 100%;\n\n        color: ' + theme.sectionHeadingColor + ';\n        background-color: ' + theme.sectionHeadingBgColor + ';\n        height: ' + theme.sectionHeadingHeight + ';\n        line-height: ' + theme.sectionHeadingHeight + ';\n      }\n\n      .' + className + '__sectionHeading button:focus {\n        background-color: ' + theme.sectionHeadingHoverColor + ';\n      }\n\n      .' + className + '__sectionHeading > button {\n        height: 100%;\n        vertical-align: middle;\n        font-size: 1.0em;\n        cursor: pointer;\n        text-align: left;\n        outline: none;\n        color: inherit;\n        font-size: inherit;\n        font-family: inherit;\n        background: transparent;\n        border: none;\n        border-radius: 0;\n        display: block;\n        width: 100%;\n      }\n\n      .' + className + '__sectionHeading:hover {\n        background-color: ' + theme.sectionHeadingHoverColor + ';\n      }\n\n      .' + className + '__sectionHeading > button::before {\n        transform: translate(0, -1px) rotate(90deg);\n      }\n\n      .' + className + '__sectionHeading > button::before {\n        content: \'\u25B2\';\n        display: inline-block;\n        transform-origin: 50% 50%;\n        margin-right: 0.5em;\n        font-size: 0.5em;\n        vertical-align: middle;\n      }\n\n      .' + className + '__section--expanded > .' + className + '__sectionHeading > button::before {\n        transform: none;\n        content: \'\u25BC\';\n      }\n    ';
      }
    };

    var h$3 = preact_module.h;

    var slider = {
      name: 'slider',
      component: preactClasslessComponent({
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$3('div', {
            className: className + '__field ' + className + '__field--slider'
          }, h$3('label', {
            className: className + '__label',
            htmlFor: className + '-' + field.path
          }, h$3('span', {
            className: className + '__labelText'
          }, config.label || field.name), ' ', h$3('span', { className: className + '__container' }, h$3('input', {
            id: className + '-' + field.path,
            name: field.path,
            type: 'range',
            min: this.props.field.inverseMapping(field.min),
            max: this.props.field.inverseMapping(field.max),
            step: (this.props.field.inverseMapping(this.props.field.max) - this.props.field.inverseMapping(this.props.field.min)) / this.props.field.steps,
            value: this.props.field.inverseMapping(field.value),
            onInput: function (event) {
              return _this.props.field.value = parseFloat(_this.props.field.mapping(event.target.value));
            }
          }), h$3('span', { className: className + '__sliderValue' }, field.value.toFixed(4).replace(/\.?0*$/, '')))));
        }
      }),
      css: function sliderCSS(className, theme) {
        return '\n      .' + className + '__field--slider input[type=range] {\n        width: 100%;\n        height: ' + theme.sliderHeight + ';\n        -webkit-appearance: none;\n        vertical-align: middle;\n        border-radius: ' + theme.controlBorderRadius + ';\n        margin: 0;\n        cursor: resize-ew;\n        border: 1px solid ' + theme.controlBorderColor + ';\n      }\n\n      .' + className + '__field--slider input[type=range]:focus {\n        ' + theme.focusBorder + '\n      }\n\n      .' + className + '__field--slider input[type=range]::-webkit-slider-thumb {\n        height: ' + theme.sliderHeight + ';\n        width: ' + theme.sliderHeight + ';\n        background: ' + theme.sliderThumbColor + ';\n        border-radius: 0;\n        cursor: ew-resize;\n        -webkit-appearance: none;\n      }\n\n      .' + className + '__field--slider input[type=range]::-moz-range-thumb {\n        height: ' + theme.sliderHeight + ';\n        width: ' + theme.sliderHeight + ';\n        border-radius: 0;\n        background: ' + theme.sliderThumbColor + ';\n        cursor: ew-resize;\n      }\n\n      .' + className + '__field--slider input[type=range]::-ms-thumb {\n        height: ' + theme.sliderHeight + ';\n        width: ' + theme.sliderHeight + ';\n        border-radius: 0;\n        background: ' + theme.sliderThumbColor + ';\n        cursor: ew-resize;\n      }\n\n      .' + className + '__field--slider input[type=range]::-webkit-slider-runnable-track {\n        height: ' + theme.sliderHeight + ';\n        cursor: ew-resize;\n        background: ' + theme.controlBgColor + ';\n      }\n\n      .' + className + '__field--slider input[type=range]::-moz-range-track {\n        height: ' + theme.sliderHeight + ';\n        cursor: ew-resize;\n        background: ' + theme.controlBgColor + ';\n      }\n\n      .' + className + '__field--slider input[type=range]::-ms-track {\n        height: ' + theme.sliderHeight + ';\n        cursor: ew-resize;\n        background: transparent;\n        border-color: transparent;\n        color: transparent;\n      }\n\n      .' + className + '__field--slider input[type=range]::-ms-fill-lower {\n        background: ' + theme.controlBgColor + ';\n      }\n\n      .' + className + '__field--slider input[type=range]::-ms-fill-upper {\n        background: ' + theme.controlBgColor + ';\n      }\n\n      .' + className + '__field--slider input[type=range]:focus::-ms-fill-lower {\n        background: ' + theme.controlBgColor + ';\n        ' + theme.focusBorder + '\n      }\n\n      .' + className + '__field--slider input[type=range]:focus::-ms-fill-upper {\n        background: ' + theme.controlBgColor + ';\n        ' + theme.focusBorder + '\n      }\n\n      .' + className + '__sliderValue {\n        position: absolute;\n        pointer-events: none;\n        top: 0;\n        z-index: 11;\n        line-height: ' + theme.fieldHeight + ';\n        height: ' + theme.fieldHeight + ';\n        display: inline-block;\n        right: 15px;\n        text-shadow:  1px  0   ' + theme.visibilityFontColor + ',\n                      0    1px ' + theme.visibilityFontColor + ',\n                     -1px  0   ' + theme.visibilityFontColor + ',\n                      0   -1px ' + theme.visibilityFontColor + ',\n                      1px  1px ' + theme.visibilityFontColor + ',\n                      1px -1px ' + theme.visibilityFontColor + ',\n                     -1px  1px ' + theme.visibilityFontColor + ',\n                     -1px -1px ' + theme.visibilityFontColor + ';\n      }\n    ';
      }
    };

    var h$4 = preact_module.h;

    var checkbox = {
      name: 'checkbox',
      component: preactClasslessComponent({
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$4('div', {
            className: className + '__field ' + className + '__field--checkbox'
          }, h$4('label', {
            className: className + '__label',
            htmlFor: className + '-' + field.path
          }, h$4('span', {
            className: className + '__labelText'
          }, config.label || field.name), ' ', h$4('span', { className: className + '__container' }, h$4('input', {
            id: className + '-' + field.path,
            name: field.path,
            type: 'checkbox',
            checked: field.value,
            onInput: function (event) {
              return _this.props.field.value = event.target.checked;
            }
          }))));
        }
      }),
      css: function checkboxCSS(className, theme) {
        return '\n      .' + className + '__field--checkbox input[type=checkbox] {\n        height: 20px;\n        width: 20px;\n        margin-bottom: 0.2em;\n      }\n\n      .' + className + '__field--checkbox input[type=checkbox]:focus {\n        ' + theme.focusBorder + '\n      }\n    ';
      }
    };

    var h$5 = preact_module.h;

    var textinput = {
      name: 'textinput',
      component: preactClasslessComponent({
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$5('div', {
            className: className + '__field ' + className + '__field--text'
          }, h$5('label', {
            className: className + '__label',
            htmlFor: className + '-' + field.path
          }, h$5('span', {
            className: className + '__labelText'
          }, config.label || field.name), ' ', h$5('span', { className: className + '__container' }, h$5('input', {
            id: className + '-' + field.path,
            name: field.path,
            type: 'text',
            value: field.value,
            onInput: function (event) {
              return _this.props.field.value = event.target.value;
            }
          }))));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__field--text input[type=text] {\n        font-size: inherit;\n        font-family: inherit;\n        width: 100%;\n        margin: 0;\n        padding: 0 5px;\n        border: none;\n        height: ' + theme.sliderHeight + ';\n        border-radius: ' + theme.controlBorderRadius + ';\n        background-color: ' + theme.controlBgColor + ';\n        border: 1px solid ' + theme.controlBorderColor + ';\n        color: inherit;\n      }\n\n      .' + className + '__field--text input[type=text]:focus {\n        ' + theme.focusBorder + '\n      }\n    ';
      }
    };

    var h$6 = preact_module.h;

    var button = {
      name: 'button',
      component: preactClasslessComponent({
        render: function () {
          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$6('div', {
            className: className + '__field ' + className + '__field--button'
          }, h$6('button', {
            onClick: field.value
          }, config.label || field.name));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__field--button button {\n        height: ' + theme.fieldHeight + ';\n        font-size: inherit;\n        font-family: inherit;\n        outline: none;\n        cursor: pointer;\n        text-align: center;\n        display: block;\n        background: transparent;\n        color: inherit;\n        font-size: 1.0em;\n        width: 100%;\n        border: none;\n        border-radius: 0;\n      }\n\n      .' + className + '__field--button > button:hover {\n        background-color: ' + theme.fieldHoverColor + ';\n      }\n\n      .' + className + '__field--button > button:active {\n        background-color: ' + theme.fieldActiveColor + ';\n      }\n\n      .' + className + '__field--button > button:focus {\n        ' + theme.focusBorder + '\n      }\n\n      .' + className + '__field--button > button::before {\n        content: \'\';\n        width: 3px;\n        display: inline-block;\n        vertical-align: middle;\n        position: absolute;\n        top: 0;\n        left: 0;\n        bottom: 0;\n      }\n    ';
      }
    };

    var h$7 = preact_module.h;

    var color = {
      name: 'color',
      component: preactClasslessComponent({
        render: function () {
          var _this = this;

          var field = this.props.field;
          var config = field.$config;
          var className = this.props.className;
          return h$7('div', {
            className: className + '__field ' + className + '__field--color'
          }, h$7('label', {
            className: className + '__label',
            htmlFor: className + '-' + field.path
          }, h$7('span', {
            className: className + '__labelText'
          }, config.label || field.name), ' ', h$7('span', { className: className + '__container' }, h$7('input', {
            id: className + '-' + field.path,
            name: field.path,
            type: 'color',
            value: field.value,
            onInput: function (event) {
              _this.props.field.value = event.target.value;
            }
          }))));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__field--color input[type=color] {\n        margin: 0;\n        border: 1px solid #aaa;\n        width: 50px;\n        height: ' + theme.sliderHeight + ';\n        border-radius: ' + theme.controlBorderRadius + ';\n        padding: 0;\n      }\n\n      .' + className + '__field--color input[type=color]::-webkit-color-swatch-wrapper {\n        padding: 0px;\n        background-color: #888;\n      }\n\n      .' + className + '__field--color input[type=color]:focus {\n        ' + theme.focusBorder + '\n      }\n    ';
      }
    };

    var h$8 = preact_module.h;

    var raw = {
      name: 'raw',
      component: preactClasslessComponent({
        getRef: function (el) {
          this.el = el;
        },

        getContent: function (props) {
          this.content = props.field.value;
          if (typeof this.content === 'function') {
            this.content = this.content(h$8, {
              field: props.field,
              state: props.state
            });
          }
          return this.content;
        },

        render: function () {
          var className = this.props.className;
          return h$8('div', {
            className: className + '__field--raw ' + className + '__field'
          }, h$8('div', {
            ref: this.getRef,
            className: className + '__rawContent'
          }, this.getContent(this.props)));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__field--raw {\n        height: auto;\n        padding: 0 7px 0 10px;\n        overflow: hidden;\n      }\n\n      .' + className + '__rawContent {\n        max-width: 100%;\n        margin: 0;\n        padding: 0;\n      }\n\n      .' + className + '__rawContent a {\n        color: inherit;\n      }\n\n      .' + className + '__rawContent::before {\n        background-color: #aaa;\n      }\n\n      .' + className + '__rawContent::before {\n        content: \'\';\n        width: 3px;\n        display: inline-block;\n        vertical-align: middle;\n        position: absolute;\n        top: 0;\n        left: 0;\n        bottom: 0;\n      }\n\n      .' + className + '__rawContent > p:first-child {\n        margin-top: 5px;\n      }\n\n      .' + className + '__rawContent > p:last-child{\n        margin-bottom: 5px;\n      }\n\n      .' + className + '__rawContent p {\n        line-height: 1.8;\n      }\n\n      .' + className + '__rawContent pre {\n        line-height: 1.3;\n        font-size: 0.8em;\n        margin: 0;\n      }\n    ';
      }
    };

    var h$9 = preact_module.h;

    var tabs = {
      name: 'tabs',
      component: preactClasslessComponent({
        init: function () {
          this.state = {
            selectedTab: Object.keys(this.props.field.value.$displayFields)[0]
          };
        },
        getRef: function (ref) {
          this.contentsEl = ref;
        },
        selectTab: function (event, tab) {
          event.preventDefault();
          this.setState({ selectedTab: tab });
        },
        render: function () {
          var _this = this;

          var field = this.props.field;
          var className = this.props.className;
          var fields = field.value.$displayFields;
          var selectedField = fields[this.state.selectedTab || Object.keys(fields)[0]];

          return h$9('div', {
            key: field.name,
            className: className + '__tabs'
          }, h$9('ul', { className: className + '__tabList' }, Object.entries(field.value.$displayFields).filter(function (field) {
            return field[1].type === 'section';
          }).map(function (field) {
            var key = field[0];
            var section = field[1];
            var label = section.$config.label || key;
            return h$9('li', { className: className + '__tabItem ' + (key === _this.state.selectedTab ? className + '__tabItem--active' : '') }, h$9('a', { href: '#' + section.path, onClick: function (event) {
                return _this.selectTab(event, key);
              }, key: key }, label));
          })), h$9('div', {
            ref: this.getRef,
            id: selectedField.path,
            key: selectedField.path,
            className: className + '__tabPanel'
          }, Object.keys(selectedField.value.$displayFields).map(function (key) {
            return h$9(_this.props.ControlComponent, {
              key: key,
              field: selectedField.value.$path[key].$field
            });
          })));
        }
      }),
      css: function (className, theme) {
        return '\n      .' + className + '__tabsHeader {\n        margin: 0;\n        margin-top: -1px;\n        padding: 0;\n        border: none;\n      }\n      .' + className + '__tabList {\n        background-color: #222;\n        border-bottom: 6px solid #555;\n        display: flex;\n        flex-wrap: wrap;\n        flex-direction: row;\n        margin: 0;\n        padding: 0;\n        padding-top: 6px;\n        align-items: flex-end;\n      }\n      .' + className + '__tabItem {\n        -moz-user-select: none;\n        -webkit-user-select: none;\n        user-select: none;\n        list-style-type: none;\n        border-top-left-radius: 2px;\n        border-top-right-radius: 2px;\n        margin-left: 6px;\n        display: inline-block;\n        background-color: #333;\n        color: #ccc;\n        padding: 5px 7px;\n        padding-bottom: 3px;\n        margin-top: 5px;\n      }\n      .' + className + '__tabItem > a {\n        color: inherit;\n        text-decoration: none;\n      }\n      .' + className + '__tabItem:hover {\n        background-color: #444;\n      }\n      .' + className + '__tabItem--active {\n        background-color: #555;\n        color: #fff;\n        padding-bottom: 5px;\n        margin-top: 3px;\n      }\n    ';
      }
    };

    var gui = factory();

    gui.registerComponents([select, section, slider, checkbox, textinput, button, color, raw, tabs]);

    var controlsGui = gui;

    return controlsGui;

}));
