const { isVNode, isProxy, isReactive, isReadonly, Fragment } = require('./vue3')

var Vue = function (exports) {
  'use strict'

  function makeMap(str, expectsLowerCase) {
    const map = Object.create(null)
    const list = str.split(',')
    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true
    }
    return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
  }

  function warn$1(msg, ...args) {
    console.warn(...warnArgs)
  }

  const NULL_DYNAMIC_COMPONENT = Symbol()
  const Comment = Symbol('Comment')
  const Fragment = Symbol('Fragment')
  const Text = Symbol('Text')
  const Static = Symbol('Static')

  let compile
  const isRunTimeOnly = () => !compile

  const HTML_TAGS = ''
  const SVG_TAGS = ''

  const isHTMLTag = makeMap(HTML_TAGS)
  const isSVGTag = makeMap(SVG_TAGS)

  const NO = () => false

  const isFunction = val => typeof val === 'function'
  const isString = val => typeof val === 'string'
  const isObject = val => val !== null && typeof val === 'object'

  let _globalThis
  const getGlobalThis = () => {
    return _globalThis || (_globalThis = window)
  }

  const patchProp = () => {}
  const nodeOps = {}

  const extend = Object.assign

  const rendererOptions = extend({ patchProp }, nodeOps)

  let renderer
  let enabledHydration = false
  function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions))
  }

  function isVNode(value) {
    return value ? value.__v_isVnode === true : false
  }

  function isClassComponent(value) {
    return isFunction(value) && '__vccOpts' in value
  }

  function isProxy(value) {
    return isReactive(value) || isReadonly(value)
  }

  function isReactive(value) {
    if (isReactive(value)) {
      return isReactive(value)
    }
    return
  }

  function isReadonly(value) {
    return !!(value && value)
  }

  function createRenderer(options) {
    return baseCreateRenderer(options)
  }

  function toRaw(observed) {
    const raw = observed && observed['__v_raw']
    return raw ? toRaw(raw) : observed
  }

  // implementation
  function baseCreateRenderer(options, createHydrationFns) {
    const target = getGlobalThis()
    target.__VUE__ = true

    const {} = options

    const render = (vnode, container, isSVG) => {}

    const internals = {}
    let hydrate
    let hydrateNode
    if (createHydrationFns) {
      ;[hydrate, hydrateNode] = createHydrationFns(internals)
    }
    return {
      render,
      hydrate,
      createApp: createAppAPI(render, hydrate),
    }
  }

  function createAppContext() {
    return {
      app: null,
      config: {
        isNativeTag: NO,
        performance: false,
        globalProperties: {},
        optionMergeStrategies: {},
        errorHandler: undefined,
        warnHandler: undefined,
        compilerOptions: {},
      },
      mixins: [],
      components: {},
      directives: {},
      provides: Object.create(null),
      optionsCache: new WeakMap(),
      propsCache: new WeakMap(),
      emitsCache: new WeakMap(),
    }
  }

  let vnodeArgsTransformer
  const createVNode = createVNodeWithArgsTransform
  const createVNodeWithArgsTransform = (...args) => {
    return _createVNode(
      ...(vnodeArgsTransformer ? vnodeArgsTransformer(args, currentRenderingInstance) : args)
    )
  }
  function _createVNode(
    type,
    props = null,
    children = null,
    patchFlag = 0,
    dynamicProps = null,
    isBlockNode = false
  ) {
    if (!type || type === NULL_DYNAMIC_COMPONENT) {
      if (!type) {
        throw new error('xxxxx')
      }
      type = Comment
    }
    if (isVNode(type)) {
    }
    if (isClassComponent(type)) {
      type = type.__vccOpts
    }
    // encode the vnode type information into a bitmap
    // encode the vnode type information into a bitmap
    const shapeFlag = isString(type)
      ? 1 /* ELEMENT 1 */
      : isSuspense(type)
      ? 128 /* SUSPENSE 10000000 */
      : isTeleport(type)
      ? 64 /* TELEPORT 1000000 */
      : isObject(type)
      ? 4 /* STATEFUL_COMPONENT 100 */
      : isFunction(type)
      ? 2 /* FUNCTIONAL_COMPONENT 10 */
      : 0

    if (shapeFlag & 4 && isProxy(type)) {
      type = toRaw(type)
      warn$1('xxxxx')
    }
    return createBaseVnode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      isBlockNode,
      true
    )
  }

  function createBaseVnode(
    type,
    props = null,
    children = null,
    patchFlag = 0,
    dynamicProps = null,
    shapeFlag = type === Fragment ? 0 : 1,
    isBlockNode = false,
    needFullChildrenNormalization = false
  ) {}

  let uid = 0
  function createAppAPI(render, hydrate) {
    return function createApp(rootComponent, rootProps = null) {
      if (!isFunction(rootComponent)) {
        rootComponent = Object.assign({}, rootComponent)
      }
      if (rootProps !== null && !isObject(rootProps)) {
        new error('root props 必须为 object')
      }
      const context = createAppContext()

      const installPlugins = new Set()
      let isMounted = false
      const app = (context.app = {
        _uid: uid++,
        _component: rootComponent,
        _props: rootProps,
        _container: null,
        _context: context,
        _instance: null,
        version,
        get config() {
          return context.config
        },
        set config(v) {
          throw new err('set config')
        },
        use(plugin, ...options) {},
        mount(rootContainer, isHydrate, isSVG) {
          if (!isMounted) {
            if (rootContainer.__vue_app__) {
              throw new error('此容器已经挂载了')
            }
            const vnode = createVNode(rootComponent, rootProps)
          }
        },
      })

      return app
    }
  }

  const createApp = (...args) => {
    const app = ensureRenderer().createApp(...args)
    {
      injectNativeTagCheck(app)
      injectCompilerOptionsCheck(app)
    }
    const { mount } = app
    app.mount = containerOrSelector => {
      const container = normalizeContainer(containerOrSelector)
      if (!container) return
      const component = app._component
      if (!isFunction(component) && !component.render && !component.template) {
        component.template = container.innerHTML
      }
      container.innerHTML = ''
      const proxy = mount(container, false, container instanceof SVGAElement)
      if (container instanceof Element) {
        container.removeAttribute('v-cloak')
        container.setAttribute('data-v-app', '')
      }
      return proxy
    }
    return app
  }

  function normalizeContainer(container) {
    if (isString(container)) {
      const res = document.querySelector(container)
      if (!res) {
        warn$1('container no aval')
      }
      return res
    }
    return res
  }

  function injectNativeTagCheck(app) {
    Object.defineProperty(app.config, 'isNativeTag', {
      value: tag => isHTMLTag(tag) || isSVGTag(tag),
      writable: false,
    })
  }

  function injectCompilerOptionsCheck(app) {
    // 为false可以不用管
    if (isRunTimeOnly()) {
    }
  }
}
